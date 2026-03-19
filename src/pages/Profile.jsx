import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Calendar, Edit3, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabase';
import EditProfileModal from '../components/EditProfileModal';
import FollowListModal from '../components/FollowListModal';
import PostCard from '../components/PostCard';

export default function Profile() {
  const { user } = useSelector((state) => state.auth);
  const [isEditing, setIsEditing] = useState(false);
  const [stats, setStats] = useState({ followers: 0, following: 0 });
  const [posts, setPosts] = useState([]);
  const [repliedPosts, setRepliedPosts] = useState([]);
  const [likedPosts, setLikedPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('posts'); // 'posts' | 'replies' | 'likes'
  const [loading, setLoading] = useState(true);
  const [followModalType, setFollowModalType] = useState(null);

  useEffect(() => {
    if (user) {
      fetchProfileData();
    }
  }, [user]);

  const fetchProfileData = async () => {
    setLoading(true);
    // Fetch follows count
    const { count: followersCount } = await supabase
      .from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id);
    const { count: followingCount } = await supabase
      .from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id);
    setStats({ followers: followersCount || 0, following: followingCount || 0 });

    // Fetch user posts
    const { data: userPosts } = await supabase
      .from('posts')
      .select(`
        *,
        users:user_id ( id, name, avatar_url ),
        likes ( id, user_id ),
        comments ( id, content, created_at, user_id, users:user_id ( id, name, avatar_url ) )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (userPosts) setPosts(userPosts);

    // Fetch replies by user (using inner join on comments so only posts with this user's comment match)
    const { data: userReplies } = await supabase
      .from('posts')
      .select(`
        *,
        users:user_id ( id, name, avatar_url ),
        likes ( id, user_id ),
        comments!inner ( id, content, created_at, user_id, users:user_id ( id, name, avatar_url ) )
      `)
      .eq('comments.user_id', user.id)
      .order('created_at', { ascending: false });
      
    if (userReplies) {
       // Deduplicate posts in case user replied multiple times to the same post
       const uniqueReplies = Array.from(new Map(userReplies.map(p => [p.id, p])).values());
       setRepliedPosts(uniqueReplies);
    }

    // Fetch likes by user (using inner join on likes)
    const { data: userLikes } = await supabase
      .from('posts')
      .select(`
        *,
        users:user_id ( id, name, avatar_url ),
        likes!inner ( id, user_id ),
        comments ( id, content, created_at, user_id, users:user_id ( id, name, avatar_url ) )
      `)
      .eq('likes.user_id', user.id)
      .order('created_at', { ascending: false });
    if (userLikes) setLikedPosts(userLikes);

    setLoading(false);
  };

  const getActivePosts = () => {
    if (activeTab === 'replies') return repliedPosts;
    if (activeTab === 'likes') return likedPosts;
    return posts;
  };

  const activePosts = getActivePosts();

  if (!user) return null;

  return (
    <div className="min-h-screen text-foreground pb-16 md:pb-0">
      <div className="h-48 bg-gradient-to-r from-primary/30 to-accent/30 w-full relative"></div>
      
      <div className="px-4 py-3 relative">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative -mt-16 w-32 h-32 rounded-full border-4 border-background bg-secondary flex items-center justify-center overflow-hidden shrink-0">
             {user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-bold text-muted">{user?.user_metadata?.name?.charAt(0)?.toUpperCase()}</span>
              )}
          </div>
          
          <button 
            onClick={() => setIsEditing(true)}
            className="sm:mt-2 px-6 py-2 border-2 border-primary/50 text-foreground rounded-full hover:bg-primary/10 font-bold transition-all flex items-center gap-2 text-sm"
          >
            <Edit3 className="h-4 w-4" /> Edit Profile
          </button>
        </div>

        <div className="mt-4">
          <h1 className="text-2xl font-bold">{user?.user_metadata?.name || 'Anonymous User'}</h1>
          <p className="text-muted">@{user?.email?.split('@')[0]}</p>
        </div>

        <div className="mt-4 text-foreground/90 whitespace-pre-wrap">
          {user?.user_metadata?.bio || 'No bio yet. Add one to let people know about you!'}
        </div>

        <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted">
           <div className="flex items-center gap-1">
             <Calendar className="h-4 w-4" /> 
             Joined {new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
           </div>
        </div>

        <div className="flex gap-6 mt-4">
          <div className="flex gap-1 cursor-pointer hover:opacity-80" onClick={() => setFollowModalType('following')}>
            <span className="font-bold text-foreground">{stats.following}</span> 
            <span className="text-muted hover:underline">Following</span>
          </div>
          <div className="flex gap-1 cursor-pointer hover:opacity-80" onClick={() => setFollowModalType('followers')}>
            <span className="font-bold text-foreground">{stats.followers}</span> 
            <span className="text-muted hover:underline">Followers</span>
          </div>
        </div>

        <div className="flex border-b border-border mt-6">
          <button 
            onClick={() => setActiveTab('posts')}
            className={`flex-1 py-3 font-bold transition-colors ${activeTab === 'posts' ? 'text-primary border-b-2 border-primary' : 'text-muted hover:bg-secondary/20'}`}
          >
            Posts
          </button>
          <button 
            onClick={() => setActiveTab('replies')}
            className={`flex-1 py-3 font-bold transition-colors ${activeTab === 'replies' ? 'text-primary border-b-2 border-primary' : 'text-muted hover:bg-secondary/20'}`}
          >
            Replies
          </button>
          <button 
            onClick={() => setActiveTab('likes')}
            className={`flex-1 py-3 font-bold transition-colors ${activeTab === 'likes' ? 'text-primary border-b-2 border-primary' : 'text-muted hover:bg-secondary/20'}`}
          >
            Likes
          </button>
        </div>

        <div className="mt-2">
          {loading ? (
             <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : activePosts.length > 0 ? (
             activePosts.map(post => (
                <PostCard 
                   key={post.id} 
                   post={post} 
                   onDelete={(id) => {
                     setPosts(posts.filter(p => p.id !== id));
                     setRepliedPosts(repliedPosts.filter(p => p.id !== id));
                     setLikedPosts(likedPosts.filter(p => p.id !== id));
                   }} 
                />
             ))
          ) : (
             <div className="py-8 text-center text-muted">
               <p className="text-lg font-medium">No posts here</p>
               <p className="text-sm">When there's activity for this tab, it will show up here.</p>
             </div>
          )}
        </div>
      </div>

      {isEditing && (
        <EditProfileModal user={user} onClose={() => setIsEditing(false)} onUpdate={fetchProfileData} />
      )}

      {followModalType && (
        <FollowListModal 
          type={followModalType} 
          userId={user.id} 
          onClose={() => setFollowModalType(null)} 
        />
      )}
    </div>
  );
}
