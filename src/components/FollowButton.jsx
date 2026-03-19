import React, { useState, useEffect, memo } from 'react';
import { supabase } from '../services/supabase';
import { useSelector } from 'react-redux';
import { UserPlus, UserCheck, Loader2 } from 'lucide-react';

const FollowButton = memo(({ targetUserId }) => {
  const { user: currentUser } = useSelector(state => state.auth);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (currentUser && targetUserId && currentUser.id !== targetUserId) {
      checkFollowStatus();
    } else {
      setLoading(false);
    }
  }, [currentUser, targetUserId]);

  const checkFollowStatus = async () => {
    const { data } = await supabase
      .from('follows')
      .select('id')
      .match({ follower_id: currentUser.id, following_id: targetUserId })
      .maybeSingle(); // maybeSingle because it might be null when not following
    
    setIsFollowing(!!data);
    setLoading(false);
  };

  const toggleFollow = async (e) => {
    e.stopPropagation();
    if (!currentUser || actionLoading) return;
    setActionLoading(true);

    if (isFollowing) {
      await supabase.from('follows')
        .delete()
        .match({ follower_id: currentUser.id, following_id: targetUserId });
      setIsFollowing(false);
    } else {
      await supabase.from('follows')
        .insert([{ follower_id: currentUser.id, following_id: targetUserId }]);
      setIsFollowing(true);
      
      // Notify the target user
      await supabase.from('notifications').insert([{
        user_id: targetUserId,
        actor_id: currentUser.id,
        type: 'follow',
        reference_id: null
      }]);
    }
    setActionLoading(false);
  };

  if (!currentUser || currentUser.id === targetUserId) return null;

  if (loading) return <div className="h-8 w-24 bg-secondary/50 rounded-full animate-pulse"></div>;

  return (
    <button
      onClick={toggleFollow}
      disabled={actionLoading}
      className={`group px-4 py-1.5 rounded-full font-semibold text-sm transition-all flex items-center justify-center min-w-[100px]
        ${isFollowing 
          ? 'bg-secondary border border-border text-foreground hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30' 
          : 'bg-primary text-white hover:bg-blue-600'
        }
      `}
    >
      {actionLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isFollowing ? (
        <>
          <span className="flex items-center gap-1 group-hover:hidden"><UserCheck className="h-4 w-4" /> Following</span>
          <span className="hidden group-hover:block">Unfollow</span>
        </>
      ) : (
        <span className="flex items-center gap-1"><UserPlus className="h-4 w-4" /> Follow</span>
      )}
    </button>
  );
});

FollowButton.displayName = 'FollowButton';

export default FollowButton;
