import React, { useState, useEffect, useRef } from 'react';
import { Send, Search, Info, Loader2, Check, CheckCheck, Mic, Square, Smile } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useSelector } from 'react-redux';
import EmojiPicker from 'emoji-picker-react';

export default function Messages() {
  const { user } = useSelector((state) => state.auth);
  const [activeChat, setActiveChat] = useState(null);
  const [msg, setMsg] = useState("");
  const [chats, setChats] = useState([]); 
  const [messages, setMessages] = useState([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  
  // Voice & Emoji State
  const [isRecording, setIsRecording] = useState(false);
  const [isUploadingVoice, setIsUploadingVoice] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (user) {
      fetchChats();
      const sub = supabase.channel('messages_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, payload => {
         const newMsg = payload.new;
         
         if (payload.eventType === 'INSERT') fetchChats(true);

         if (activeChat && (newMsg.sender_id === activeChat.id || newMsg.receiver_id === activeChat.id)) {
           if (payload.eventType === 'INSERT') {
             if (newMsg.sender_id !== user.id) {
               setMessages(prev => {
                  if (prev.find(m => m.id === newMsg.id)) return prev;
                  return [...prev, newMsg];
               });
               setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
               
               if (newMsg.receiver_id === user.id) {
                 supabase.from('messages').update({ seen: true }).eq('id', newMsg.id).then();
               }
             }
           } else if (payload.eventType === 'UPDATE') {
             // Handle 'seen' status dynamically
             setMessages(prev => prev.map(m => m.id === newMsg.id ? newMsg : m));
           }
         }
      }).subscribe();
      
      const presenceChannel = supabase.channel('online_users', {
        config: { presence: { key: user.id } },
      });

      presenceChannel.on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const onlineIds = new Set(Object.keys(state));
        setOnlineUsers(onlineIds);
      }).subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ online_at: new Date().toISOString() });
        }
      });

      return () => {
         supabase.removeChannel(sub);
         supabase.removeChannel(presenceChannel);
      }
    }
  }, [user, activeChat]);

  const fetchChats = async (silent = false) => {
     if (!silent) setLoadingChats(true);
     const { data: iFollow } = await supabase.from('follows').select('following:following_id(id, name, avatar_url)').eq('follower_id', user.id);
     const { data: followMe } = await supabase.from('follows').select('follower:follower_id(id, name, avatar_url)').eq('following_id', user.id);
     
     const connectionsMap = new Map();
     if (iFollow) iFollow.forEach(f => { if (f.following) connectionsMap.set(f.following.id, f.following); });
     if (followMe) followMe.forEach(f => { if (f.follower) connectionsMap.set(f.follower.id, f.follower); });
     
     const { data: recentMsgs } = await supabase.from('messages')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    const chatsArray = Array.from(connectionsMap.values()).map(chatUser => {
       const chatMsgs = recentMsgs?.filter(m => (m.sender_id === chatUser.id || m.receiver_id === chatUser.id)) || [];
       const latestMsg = chatMsgs[0];
       const unreadCount = chatMsgs.filter(m => m.receiver_id === user.id && !m.seen).length;
       
       let preview = latestMsg ? latestMsg.content : null;
       if (preview?.startsWith('[AUDIO]')) preview = "🎙️ Voice Message";
       if (preview?.startsWith('[STICKER]')) preview = "🖼️ Sticker";
       
       return {
         ...chatUser,
         latestMessage: preview,
         latestMessageTime: latestMsg ? latestMsg.created_at : null,
         unreadCount,
         isLastMessageMine: latestMsg ? latestMsg.sender_id === user.id : false,
         isLastMessageSeen: latestMsg ? latestMsg.seen : false
       };
    });

    chatsArray.sort((a, b) => {
       if (!a.latestMessageTime) return 1;
       if (!b.latestMessageTime) return -1;
       return new Date(b.latestMessageTime) - new Date(a.latestMessageTime);
    });

     setChats(chatsArray);
     if (!silent) setLoadingChats(false);
  };

  const fetchMessages = async (otherUserId) => {
     setMsgLoading(true);
     const { data } = await supabase.from('messages')
       .select('*')
       .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
       .order('created_at', { ascending: true });
       
     if (data) setMessages(data);
     setMsgLoading(false);
     setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleSelectChat = async (chatUser) => {
     setActiveChat(chatUser);
     fetchMessages(chatUser.id);
     
     setChats(prev => prev.map(c => c.id === chatUser.id ? { ...c, unreadCount: 0 } : c));
     
     await supabase.from('messages')
       .update({ seen: true })
       .eq('sender_id', chatUser.id)
       .eq('receiver_id', user.id)
       .eq('seen', false);
  };

  const sendPayload = async (contentString) => {
     if (!contentString) return;
     
     const optId = `opt-${Date.now()}`;
     const optMsg = { id: optId, sender_id: user.id, receiver_id: activeChat.id, content: contentString, seen: false, created_at: new Date().toISOString() };
     setMessages(prev => [...prev, optMsg]);
     setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

     const { data } = await supabase.from('messages').insert([{
       sender_id: user.id, receiver_id: activeChat.id, content: contentString
     }]).select();

     if (data && data.length > 0) {
        setMessages(prev => prev.map(m => m.id === optId ? data[0] : m));
        
        // Push notification sync for global toast/badges
        await supabase.from('notifications').insert([{
           user_id: activeChat.id,
           actor_id: user.id,
           type: 'message',
           reference_id: data[0].id
        }]);
     }
  };

  const handleSend = () => {
     if (!msg.trim()) return;
     sendPayload(msg.trim());
     setMsg('');
  };
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = e => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = async () => {
        setIsUploadingVoice(true);
        const audioBlob = new Blob(audioChunks.current);
        if (audioBlob.size < 500) {
           // Skip if recorded audio is extremely short or empty (e.g. accidental click)
           setIsUploadingVoice(false);
           return;
        }
        
        const fileExt = audioBlob.type.includes('mp4') ? 'mp4' : 'webm';
        const fileName = `voice-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        // Use post_media bucket as it has public INSERT setup already
        const { error } = await supabase.storage.from('post_media').upload(fileName, audioBlob);
        if (!error) {
           const { data: { publicUrl } } = supabase.storage.from('post_media').getPublicUrl(fileName);
           sendPayload(`[AUDIO]${publicUrl}`);
        } else {
           alert("Voice message failed to send.");
        }
        
        stream.getTracks().forEach(track => track.stop());
        setIsUploadingVoice(false);
      };

      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied", err);
      alert("Microphone access is required to send voice messages.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const formatTime = (isoString) => {
     return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const formatDateDay = (isoString) => {
     const d = new Date(isoString);
     const today = new Date();
     const yesterday = new Date(today);
     yesterday.setDate(yesterday.getDate() - 1);
     
     if (d.toDateString() === today.toDateString()) return 'Today';
     if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
     return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
  };

  const renderBubbleContent = (content, isMe) => {
     if (content.startsWith("[AUDIO]")) {
        const url = content.replace("[AUDIO]", "");
        return (
          <div className={`p-2 rounded-2xl ${isMe ? 'bg-primary/20 bg-blue-500 text-white' : 'bg-secondary/40'} flex items-center gap-2 max-w-[280px]`}>
            <Mic className="h-5 w-5 opacity-70 flex-shrink-0" />
            <audio controls src={url} className="h-8 max-w-[200px]" />
          </div>
        );
     }
     if (content.startsWith("[STICKER]")) {
        const url = content.replace("[STICKER]", "");
        return <img src={url} className="w-32 h-32 object-contain bg-transparent max-w-[200px]" alt="sticker" />;
     }
     return (
       <div className={`p-3.5 text-[15px] leading-relaxed shadow-sm rounded-2xl ${isMe ? 'bg-primary text-white rounded-tr-sm' : 'bg-background border border-border text-foreground rounded-tl-sm'}`}>
         {content}
       </div>
     );
  };

  return (
    <div className="h-[calc(100vh-70px)] md:h-screen flex w-full text-foreground bg-background md:mx-0 overflow-hidden relative">
      <div className={`w-full md:w-[350px] border-r border-border flex flex-col h-full bg-background/95 ${activeChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-border sticky top-0 bg-background/90 backdrop-blur-xl z-10">
          <h1 className="text-2xl font-bold mb-4">Messages</h1>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Connections" 
              className="w-full pl-10 pr-4 py-2 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" 
            />
          </div>
        </div>
        
        <div className="overflow-y-auto flex-1 p-2">
          {loadingChats ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : chats.length > 0 ? (
            chats.filter(c => c.name?.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 ? (
              chats.filter(c => c.name?.toLowerCase().includes(searchQuery.toLowerCase())).map(chat => (
                <div key={chat.id} onClick={() => handleSelectChat(chat)} className={`p-3 mb-1 rounded-2xl cursor-pointer flex gap-3 items-center group transition-colors ${activeChat?.id === chat.id ? 'bg-secondary/60' : 'hover:bg-secondary/40'}`}>
                  <div className="w-14 h-14 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center font-bold text-muted overflow-hidden border border-border shadow-sm">
                    {chat.avatar_url ? <img src={chat.avatar_url} className="w-full h-full object-cover"/> : chat.name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className="font-bold truncate text-foreground text-sm">{chat.name}</h3>
                      {chat.latestMessageTime && (
                         <span className={`text-[11px] font-medium flex-shrink-0 ${chat.unreadCount > 0 ? 'text-primary font-bold' : 'text-muted'}`}>
                           {formatTime(chat.latestMessageTime)}
                         </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center pr-1">
                      <p className={`text-sm truncate mr-2 flex items-center ${chat.unreadCount > 0 ? 'text-foreground font-semibold' : 'text-muted'}`}>
                        {chat.isLastMessageMine && (
                           <span className="inline-block mr-1">
                             {chat.isLastMessageSeen ? <CheckCheck className="h-3 w-3 text-primary inline" /> : <Check className="h-3 w-3 inline" />}
                           </span>
                        )}
                        {chat.latestMessage || "Start a conversation"}
                      </p>
                      {chat.unreadCount > 0 && (
                         <div className="bg-primary text-white text-[10px] font-bold h-5 min-w-[20px] px-1.5 rounded-full flex items-center justify-center shadow-md">
                           {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                         </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
               <div className="text-center text-muted p-6 text-sm">No connections matching "{searchQuery}"</div>
            )
          ) : (
            <div className="text-center text-muted p-8 text-sm">
              <div className="bg-secondary w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4">
                 <Search className="h-6 w-6 text-muted" />
              </div>
              <p className="font-bold text-foreground mb-1">No messages yet</p>
            </div>
          )}
        </div>
      </div>

      <div className={`flex-1 flex flex-col h-full overflow-hidden bg-background relative ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
        {activeChat ? (
          <div className="flex flex-col h-full w-full">
            <div className="p-3 border-b border-border flex items-center justify-between sticky top-0 bg-background/90 backdrop-blur-xl z-20 shadow-sm">
              <div className="flex items-center gap-3">
                <button className="md:hidden text-primary p-2 hover:bg-secondary rounded-full flex items-center gap-1 text-sm font-bold" onClick={() => setActiveChat(null)}>
                  <Search className="h-4 w-4" /> <span>Back</span>
                </button>
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold text-muted overflow-hidden border border-border">
                  {activeChat.avatar_url ? <img src={activeChat.avatar_url} className="w-full h-full object-cover"/> : activeChat.name?.charAt(0)}
                </div>
                <div>
                  <h2 className="font-bold">{activeChat.name}</h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`w-2 h-2 rounded-full ${onlineUsers.has(activeChat.id) ? 'bg-green-500 animate-pulse' : 'bg-muted/50'}`}></span>
                    <p className={`text-[11px] font-medium leading-tight ${onlineUsers.has(activeChat.id) ? 'text-green-500' : 'text-muted'}`}>
                      {onlineUsers.has(activeChat.id) ? 'Active Now' : 'Offline'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 scroll-smooth bg-secondary/5 h-full relative" onClick={() => setShowEmojiPicker(false)}>
              {msgLoading ? (
                 <div className="flex justify-center flex-1 items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : messages.length === 0 ? (
                 <div className="text-center text-muted m-auto bg-background border border-border px-6 py-8 rounded-2xl shadow-sm max-w-sm">
                    <h3 className="font-bold text-lg mb-1">{activeChat.name}</h3>
                    <p className="text-sm">You are now connected. Say hello!</p>
                 </div>
              ) : (
                messages.map((m, index) => {
                  const isMe = m.sender_id === user.id;
                  const prevMsg = index > 0 ? messages[index - 1] : null;
                  const showDate = !prevMsg || formatDateDay(m.created_at) !== formatDateDay(prevMsg.created_at);
                  
                  return (
                    <React.Fragment key={m.id}>
                      {showDate && (
                         <div className="flex justify-center my-2">
                            <span className="bg-secondary/60 text-muted px-3 py-1 rounded-full text-[10px] font-medium tracking-wider uppercase backdrop-blur-sm">
                              {formatDateDay(m.created_at)}
                            </span>
                         </div>
                      )}
                      <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-full px-2`}>
                        {renderBubbleContent(m.content, isMe)}
                        <div className="flex items-center gap-1 mt-1 px-1">
                          <span className="text-[10px] text-muted font-medium">{formatTime(m.created_at || new Date().toISOString())}</span>
                          {isMe && <span className={m.seen ? 'text-primary' : 'text-muted'}>{m.seen ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />}</span>}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })
              )}
              <div ref={messagesEndRef} className="h-1 lg:h-4" />
            </div>

            <div className="p-3 border-t border-border bg-background w-full z-20 flex-shrink-0 relative">
              {showEmojiPicker && (
                 <div className="absolute bottom-[calc(100%+8px)] left-2 sm:left-4 md:left-6 z-50 shadow-2xl rounded-2xl">
                    <EmojiPicker onEmojiClick={(e) => setMsg(prev => prev + e.emoji)} theme="auto" />
                 </div>
              )}
              
              <div className="flex items-end gap-2 bg-secondary/30 px-2.5 py-2 rounded-[28px] border border-border focus-within:ring-2 ring-primary/50 transition-all">
                <button 
                  className={`h-11 w-11 text-muted hover:text-primary rounded-full hover:bg-secondary transition-all flex items-center justify-center flex-shrink-0 mb-0.5 ml-0.5 ${showEmojiPicker ? 'text-primary bg-secondary/50' : ''}`}
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                >
                  <Smile className="h-6 w-6" />
                </button>
                
                <textarea
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Type a message..."
                  className="flex-1 bg-transparent px-3 py-3 min-h-[50px] max-h-[150px] focus:outline-none text-foreground resize-none text-[15px] leading-relaxed"
                  rows="1"
                />
                
                {msg.trim() ? (
                  <button className="h-11 w-11 bg-primary text-white rounded-full hover:bg-blue-600 transition-all flex items-center justify-center flex-shrink-0 mb-0.5 mr-0.5" onClick={handleSend}>
                    <Send className="h-5 w-5 ml-0.5" />
                  </button>
                ) : (
                  <button 
                    onClick={toggleRecording}
                    className={`h-11 w-11 rounded-full transition-all flex items-center justify-center flex-shrink-0 mb-0.5 mr-0.5 ${isRecording ? 'bg-red-500 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)] scale-110' : 'bg-secondary text-primary hover:bg-primary/20'}`}
                  >
                    {isRecording ? <Square className="h-5 w-5 fill-current" /> : <Mic className="h-5 w-5" />}
                  </button>
                )}
              </div>
              <p className="text-[10px] text-muted text-center mt-2 hidden md:block">
                {isUploadingVoice ? <span className="text-primary font-bold animate-pulse">Uploading voice message...</span> : isRecording ? <span className="text-red-500 font-bold">Recording voice message... Click to send</span> : 'Press Enter to send text, Click Mic to record voice note'}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[50vh] bg-secondary/5">
            <div className="w-24 h-24 border-2 border-dashed border-border rounded-full flex items-center justify-center mb-6 bg-background">
               <Send className="h-10 w-10 text-muted" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Your Messages</h2>
            <p className="text-muted max-w-sm">Select a connection to start chatting, share voice notes, and stay connected.</p>
          </div>
        )}
      </div>
    </div>
  );
}
