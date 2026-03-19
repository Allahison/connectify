import React, { useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Image, Video, Smile, Loader2, Send, X } from 'lucide-react';
import { supabase } from '../services/supabase';
import EmojiPicker from 'emoji-picker-react';

export default function CreatePost({ onPostCreated }) {
  const { user } = useSelector((state) => state.auth);
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const fileInputRef = useRef(null);

  const onEmojiClick = (emojiObject) => {
    setContent(prev => prev + emojiObject.emoji);
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setMediaFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && !mediaFile) return;
    
    setLoading(true);
    let media_url = null;

    if (mediaFile) {
      const fileExt = mediaFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('post_media')
        .upload(fileName, mediaFile);
        
      if (!uploadError) {
        const { data } = supabase.storage.from('post_media').getPublicUrl(fileName);
        media_url = data.publicUrl;
      }
    }

    const { data: insertedPost, error } = await supabase.from('posts').insert([
      { user_id: user.id, content, media_url }
    ]).select(`*, users ( id, name, avatar_url )`);

    if (!error && insertedPost) {
      // Notify followers
      const { data: followers } = await supabase.from('follows').select('follower_id').eq('following_id', user.id);
      if (followers && followers.length > 0) {
        const notifications = followers.map(f => ({
          user_id: f.follower_id,
          actor_id: user.id,
          type: 'post',
          reference_id: insertedPost[0].id
        }));
        await supabase.from('notifications').insert(notifications);
      }

      setContent('');
      setMediaFile(null);
      if (onPostCreated) {
        const newPost = { ...insertedPost[0], likes: [], comments: [] };
        onPostCreated(newPost);
      }
    }
    setLoading(false);
  };

  return (
    <div className="bg-background border-b border-border p-4">
      <div className="flex gap-4">
        <div className="w-12 h-12 rounded-full bg-secondary/80 flex-shrink-0 overflow-hidden flex items-center justify-center">
          {user?.user_metadata?.avatar_url ? (
            <img src={user.user_metadata.avatar_url} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="font-bold text-muted">{user?.user_metadata?.name?.charAt(0)?.toUpperCase()}</span>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's happening?"
            className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-xl text-foreground resize-none placeholder-muted mt-2"
            rows="3"
          />
          
          {mediaFile && (
            <div className="relative inline-block mt-3 border border-border rounded-xl p-2 bg-secondary/20">
              <span className="text-sm font-medium pr-8 truncate max-w-xs block">{mediaFile.name}</span>
              <button 
                type="button" 
                onClick={() => setMediaFile(null)} 
                className="absolute right-2 top-2 text-muted hover:text-red-500 bg-background/80 rounded-full"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          
          <div className="flex justify-between items-center border-t border-border mt-4 pt-3 relative">
            <div className="flex gap-2 text-primary relative">
              <input type="file" ref={fileInputRef} hidden onChange={handleFileSelect} accept="image/*,video/*" />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-primary/10 rounded-full transition-colors">
                <Image className="h-5 w-5" />
              </button>
              
              <div className="relative">
                <button type="button" onClick={() => setShowEmoji(!showEmoji)} className={`p-2 rounded-full transition-colors ${showEmoji ? 'bg-primary/20' : 'hover:bg-primary/10'}`}>
                  <Smile className="h-5 w-5" />
                </button>
                {showEmoji && (
                  <div className="absolute top-10 left-0 z-50 shadow-2xl">
                    <EmojiPicker onEmojiClick={onEmojiClick} theme="auto" />
                  </div>
                )}
              </div>
            </div>
            
            <button
              type="submit"
              disabled={(!content.trim() && !mediaFile) || loading}
              className="bg-primary hover:bg-blue-600 text-white font-bold py-1.5 px-6 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Post <Send className="h-4 w-4" /></>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
