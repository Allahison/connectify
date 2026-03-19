import React, { useEffect, useState } from 'react';
import { Heart, MessageCircle, UserPlus, Bell, FileText, Loader2, Trash2, CheckCircle2, X } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useSelector, useDispatch } from 'react-redux';
import { clearUnread } from '../redux/notificationSlice';
import { toast } from 'react-hot-toast';

const ICONS = {
  like: { icon: Heart, color: 'text-pink-500', bg: 'bg-pink-500/10' },
  comment: { icon: MessageCircle, color: 'text-primary', bg: 'bg-primary/10' },
  follow: { icon: UserPlus, color: 'text-green-500', bg: 'bg-green-500/10' },
  system: { icon: Bell, color: 'text-accent', bg: 'bg-accent/10' },
  post: { icon: FileText, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  message: { icon: MessageCircle, color: 'text-blue-500', bg: 'bg-blue-500/10' },
};

const TEXTS = {
  like: 'liked your post',
  comment: 'replied to you',
  follow: 'started following you',
  system: 'New system alert',
  post: 'published a new post',
  message: 'sent you a message',
};

export default function Notifications() {
  const { user } = useSelector(state => state.auth);
  const dispatch = useDispatch();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      dispatch(clearUnread());
      fetchNotifications();
      const subscription = supabase
        .channel('page-notifications')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => {
           fetchNotifications(); // Refresh on new notification
           dispatch(clearUnread());
        })
        .subscribe();
      return () => { supabase.removeChannel(subscription); };
    }
  }, [user, dispatch]);

  const fetchNotifications = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*, actor:actor_id(id, name, avatar_url)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (data) setNotifications(data);
    
    // Mark as read immediately on viewing
    if (data && data.some(n => !n.is_read)) {
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id);
    }
    setLoading(false);
  };

  const handleClearAll = async () => {
    if (!user) return;
    const previous = [...notifications];
    setNotifications([]);
    
    // Add .select() to verify DB actually deleted rows
    const { data, error } = await supabase.from('notifications').delete().eq('user_id', user.id).select();
    if (error || !data || data.length === 0) {
       setNotifications(previous);
       toast.error('Database locked: enable DELETE policies in Supabase');
       console.error(error);
    } else {
       toast.success('All notifications cleared');
       dispatch(clearUnread());
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!user) return;
    
    const previous = [...notifications];
    setNotifications(prev => prev.filter(n => n.id !== id));
    
    // Add .select() to verify DB actually deleted row
    const { data, error } = await supabase.from('notifications').delete().eq('id', id).select();
    if (error || !data || data.length === 0) {
       setNotifications(previous);
       toast.error('Database locked: enable DELETE policies in Supabase');
    }
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id);
    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      dispatch(clearUnread());
      toast.success('All marked as read');
    } else {
      toast.error('Failed to update status');
    }
  };

  const getRelativeTime = (isoDate) => {
    const diff = new Date() - new Date(isoDate);
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.round(diff/60000) + 'm';
    if (diff < 86400000) return Math.round(diff/3600000) + 'h';
    return Math.round(diff/86400000) + 'd';
  };

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <div className="sticky top-0 bg-background/80 backdrop-blur-md z-10 border-b border-border p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><Bell className="w-5 h-5 text-primary"/> Notifications</h1>
        {notifications.length > 0 && (
          <div className="flex gap-2">
            <button onClick={handleMarkAllRead} className="p-2 text-muted hover:text-green-500 hover:bg-green-500/10 rounded-full transition-colors" title="Mark all as read">
              <CheckCircle2 className="w-5 h-5" />
            </button>
            <button onClick={handleClearAll} className="p-2 text-muted hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors" title="Clear all notifications">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      <div>
        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : notifications.length > 0 ? (
          notifications.map(n => {
            const IconConfig = ICONS[n.type] || ICONS.system;
            const actorName = n.actor?.name || 'Someone';
            return (
              <div key={n.id} className={`group relative p-4 border-b border-border hover:bg-secondary/10 transition-colors flex gap-4 cursor-pointer ${!n.is_read ? 'bg-secondary/5' : ''}`}>
                <div className={`p-3 rounded-full h-fit flex-shrink-0 ${IconConfig.bg}`}>
                  <IconConfig.icon className={`h-6 w-6 ${IconConfig.color}`} />
                </div>
                <div className="flex-1 pr-8">
                  <div className="w-8 h-8 rounded-full bg-secondary mb-2 flex items-center justify-center font-bold text-muted text-xs overflow-hidden">
                    {n.actor?.avatar_url ? <img src={n.actor.avatar_url} className="w-full h-full object-cover" /> : actorName.charAt(0)}
                  </div>
                  <p className="text-foreground text-lg mb-1">
                    <span className="font-bold mr-1">{actorName}</span> 
                    {TEXTS[n.type] || 'interacted with you'}
                  </p>
                  <p className="text-muted text-sm">{getRelativeTime(n.created_at)}</p>
                </div>
                
                {/* Delete button (shows on hover) */}
                <button 
                  onClick={(e) => handleDelete(e, n.id)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-muted hover:text-red-500 hover:bg-red-500/10 rounded-full opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                  title="Remove notification"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center text-muted">You have no notifications yet.</div>
        )}
      </div>
    </div>
  );
}
