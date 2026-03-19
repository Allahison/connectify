import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { X, Loader2 } from 'lucide-react';
import { useSelector } from 'react-redux';
import FollowButton from './FollowButton';

export default function FollowListModal({ userId, type, onClose }) {
  const { user: currentUser } = useSelector(state => state.auth);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, [userId, type]);

  const fetchUsers = async () => {
    setLoading(true);
    if (type === 'followers') {
      const { data } = await supabase
        .from('follows')
        .select('*, follower:follower_id(id, name, avatar_url, bio)')
        .eq('following_id', userId);
      if (data) setUsers(data.map(d => d.follower).filter(Boolean));
    } else {
      const { data } = await supabase
        .from('follows')
        .select('*, following:following_id(id, name, avatar_url, bio)')
        .eq('follower_id', userId);
      if (data) setUsers(data.map(d => d.following).filter(Boolean));
    }
    setLoading(false);
  };

  // Replaced inline handleFollow with standard FollowButton

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-background w-full max-w-md rounded-2xl shadow-2xl border border-border p-6 relative flex flex-col max-h-[80vh]">
        <button onClick={onClose} className="absolute right-4 top-4 text-muted hover:text-foreground">
          <X className="h-6 w-6" />
        </button>
        <h2 className="text-2xl font-bold mb-6 text-foreground capitalize">{type}</h2>
        
        <div className="flex-1 overflow-y-auto pr-2">
          {loading ? (
             <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : users.length > 0 ? (
             users.map(u => (
               <div key={u.id} className="flex items-center justify-between py-3 border-b border-border/50">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                     {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover"/> : <span className="font-bold text-muted">{u.name?.charAt(0)?.toUpperCase() || '?'}</span>}
                   </div>
                   <div>
                     <h3 className="font-bold text-foreground text-sm">{u.name}</h3>
                   </div>
                 </div>
                 {currentUser?.id !== u.id && (
                   <FollowButton targetUserId={u.id} />
                 )}
               </div>
             ))
          ) : (
             <div className="text-center text-muted py-8">
               No {type} found.
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
