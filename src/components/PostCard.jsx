import React, { useState, memo } from 'react';
import { Heart, MessageCircle, Share, MoreHorizontal, Trash2, Edit2, Send } from 'lucide-react';
import { useSelector } from 'react-redux';
import { supabase } from '../services/supabase';
import FollowButton from './FollowButton';
import { toast } from 'react-hot-toast';

const PostCard = memo(({ post, onDelete }) => {
  const { user } = useSelector((state) => state.auth);
  
  const [likes, setLikes] = useState(post.likes || []);
  const [comments, setComments] = useState(post.comments || []);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  
  const userName = post.users?.name || 'Anonymous';
  const userAvatar = post.users?.avatar_url;
  const isOwner = user?.id === post.user_id;
  const isLiked = likes.some(like => like.user_id === user?.id);

  const getRelativeTime = (isoDate) => {
    if (!isoDate) return 'Just now';
    const diff = new Date() - new Date(isoDate);
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.round(diff/60000) + 'm';
    if (diff < 86400000) return Math.round(diff/3600000) + 'h';
    return Math.round(diff/86400000) + 'd';
  };

  const handleLike = async () => {
    if (!user) return;
    if (isLiked) {
      const like = likes.find(l => l.user_id === user.id);
      await supabase.from('likes').delete().eq('id', like.id);
      setLikes(likes.filter(l => l.id !== like.id));
    } else {
      const { data } = await supabase.from('likes').insert([{ user_id: user.id, post_id: post.id }]).select();
      if (data) setLikes([...likes, data[0]]);
      
      // Notify
      if (post.user_id !== user.id) {
         await supabase.from('notifications').insert([{
           user_id: post.user_id, actor_id: user.id, type: 'like', reference_id: post.id
         }]);
      }
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    const { data, error } = await supabase.from('comments').insert([
      { user_id: user.id, post_id: post.id, content: commentText }
    ]).select(`*, users:user_id(id, name, avatar_url)`);

    if (!error && data) {
      setComments([...comments, data[0]]);
      setCommentText('');
      
      if (post.user_id !== user.id) {
         await supabase.from('notifications').insert([{
           user_id: post.user_id, actor_id: user.id, type: 'comment', reference_id: post.id
         }]);
      }
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/post/${post.id}`;
    const shareData = {
      title: 'Connectify Post',
      text: post.content,
      url: shareUrl,
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Link copied to clipboard!', {
          icon: '🔗',
          style: {
            borderRadius: '10px',
            background: 'var(--secondary)',
            color: 'var(--foreground)',
            border: '1px solid var(--border)'
          },
        });
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        toast.error('Could not share the post.');
      }
    }
  };

  const formatContent = (text) => {
    if (!text) return null;
    return text.split(/(\s+)/).map((word, idx) => {
      if (word.startsWith('#')) return <span key={idx} className="text-primary hover:underline cursor-pointer">{word}</span>;
      if (word.startsWith('@')) return <span key={idx} className="text-accent hover:underline cursor-pointer">{word}</span>;
      return word;
    });
  };

  return (
    <article className="border-b border-border p-4 hover:bg-secondary/10 transition-colors">
      <div className="flex gap-4">
        <div className="w-12 h-12 rounded-full bg-secondary overflow-hidden flex-shrink-0 flex items-center justify-center cursor-pointer">
            {userAvatar ? (
              <img src={userAvatar} alt={`${userName} avatar`} className="w-full h-full object-cover" />
            ) : (
              <span className="font-bold text-muted">{userName.charAt(0).toUpperCase()}</span>
            )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="truncate cursor-pointer">
                <span className="font-bold text-foreground hover:underline mr-2 truncate">{userName}</span>
                <span className="text-muted text-sm truncate">@{userName.toLowerCase().replace(/\s/g, '')}</span>
                <span className="text-muted text-sm mx-1">·</span>
                <span className="text-muted text-sm hover:underline">{getRelativeTime(post.created_at)}</span>
              </div>
              {!isOwner && <FollowButton targetUserId={post.user_id} />}
            </div>
            
            <div className="relative">
              <button onClick={() => setShowDropdown(!showDropdown)} className="text-muted hover:text-primary p-1 rounded-full hover:bg-primary/10 transition-colors">
                <MoreHorizontal className="h-5 w-5" />
              </button>
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-background border border-border shadow-xl rounded-xl z-20 overflow-hidden">
                  {isOwner ? (
                    <button onClick={() => onDelete && onDelete(post.id)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-red-500/10 text-red-500 transition-colors">
                      <Trash2 className="h-4 w-4" /> Delete Post
                    </button>
                  ) : (
                    <button className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary transition-colors text-foreground">
                      Report Post
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <p className="text-foreground mt-1 whitespace-pre-wrap word-break">{formatContent(post.content)}</p>
          
          {post.media_url && (
            <div className="mt-3 rounded-2xl overflow-hidden border border-border bg-black/5">
              {post.media_url.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i) ? (
                <video src={post.media_url} controls className="w-full max-h-[500px] object-contain" />
              ) : (
                <img src={post.media_url} alt="Attachment" className="w-full object-cover max-h-96" />
              )}
            </div>
          )}
          
          <div className="flex justify-between w-full mt-4 text-muted pr-2 sm:pr-8">
            <button onClick={() => setShowComments(!showComments)} className={`flex items-center gap-2 group transition-colors ${showComments ? 'text-primary' : 'hover:text-primary'}`}>
              <div className={`p-2 rounded-full ${showComments ? 'bg-primary/10' : 'group-hover:bg-primary/10'}`}>
                <MessageCircle className="h-5 w-5" />
              </div>
              <span className="text-sm">{comments.length}</span>
            </button>
            <button onClick={handleLike} className={`flex items-center gap-2 group transition-colors ${isLiked ? 'text-pink-500' : 'hover:text-pink-500'}`}>
              <div className={`p-2 rounded-full ${isLiked ? 'bg-pink-500/10' : 'group-hover:bg-pink-500/10'}`}>
                <Heart className={`h-5 w-5 ${isLiked ? 'fill-pink-500' : ''}`} />
              </div>
              <span className="text-sm">{likes.length}</span>
            </button>
            <button onClick={handleShare} className="flex items-center gap-2 hover:text-green-500 group transition-colors">
              <div className="p-2 rounded-full group-hover:bg-green-500/10">
                <Share className="h-5 w-5" />
              </div>
            </button>
          </div>

          {showComments && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-secondary overflow-hidden flex-shrink-0">
                  {user?.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} alt="You" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-muted bg-secondary text-xs">
                      {user?.user_metadata?.name?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Post your reply..."
                    className="flex-1 bg-secondary/50 border border-border rounded-full px-4 py-1 focus:outline-none focus:ring-1 focus:ring-primary text-foreground text-sm"
                  />
                  <button onClick={handleAddComment} disabled={!commentText.trim()} className="p-1.5 bg-primary text-white rounded-full disabled:opacity-50 transition-opacity">
                    <Send className="h-4 w-4 ml-0.5" />
                  </button>
                </div>
              </div>

              {comments.map((c, i) => (
                <div key={c.id || i} className="flex gap-3 mb-4 text-sm">
                  <div className="w-8 h-8 rounded-full bg-secondary overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {c.users?.avatar_url ? (
                      <img src={c.users.avatar_url} alt="c" className="w-full h-full object-cover"/>
                    ) : (
                       <span className="font-bold text-xs">{c.users?.name?.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-bold text-foreground">{c.users?.name}</span>
                      <span className="text-xs text-muted">{getRelativeTime(c.created_at)}</span>
                    </div>
                    <p className="text-foreground whitespace-pre-wrap">{formatContent(c.content)}</p>
                  </div>
                </div>
              ))}
              {comments.length === 0 && <div className="text-sm text-center text-muted">No replies yet</div>}
            </div>
          )}
        </div>
      </div>
    </article>
  );
});

PostCard.displayName = 'PostCard';

export default PostCard;
