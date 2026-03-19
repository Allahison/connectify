import React, { useEffect, useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import FollowButton from './FollowButton';

const trendingTopics = [
  { tag: '#ReactJS', count: '120K' },
  { tag: '#TailwindV4', count: '85K' },
  { tag: '#Supabase', count: '64K' },
  { tag: '#WebDev', count: '45K' },
  { tag: '#ConnectifyLaunch', count: '12K' },
];

export default function RightSidebar() {
  const { user } = useSelector(state => state.auth);
  const [suggested, setSuggested] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchSuggestedUsers();
    }
  }, [user]);

  const fetchSuggestedUsers = async () => {
    setLoading(true);
    try {
      // Get all follows of current user
      const { data: myFollows } = await supabase.from('follows').select('following_id').eq('follower_id', user.id);
      const followingIds = new Set(myFollows?.map(f => f.following_id) || []);
      
      // Get latest 20 users, not current user
      const { data: popularUsers } = await supabase.from('users').select('*').neq('id', user.id).order('created_at', { ascending: false }).limit(20);
      
      // Filter out people I already follow, grab up to 3
      const suggestions = popularUsers?.filter(u => !followingIds.has(u.id)).slice(0, 3) || [];
      setSuggested(suggestions);
    } catch (error) {
       console.error(error);
    }
    setLoading(false);
  };

  const handleSearchKeyPress = (e) => {
     if (e.key === 'Enter' && search.trim()) {
       navigate(`/explore?q=${encodeURIComponent(search.trim())}`);
     }
  };

  return (
    <aside className="fixed right-0 top-0 h-screen w-80 border-l border-border bg-background glass-effect p-4 hidden lg:block overflow-y-auto z-50">
      <div className="relative mb-8 mt-2 cursor-text">
        <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleSearchKeyPress}
          placeholder="Search Connectify..."
          className="w-full pl-10 pr-4 py-2 bg-secondary/50 border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-foreground"
        />
      </div>

      <div className="bg-secondary/20 border border-border rounded-2xl p-4 mb-6">
        <h2 className="font-bold text-xl mb-4 text-foreground">Who to follow</h2>
        {loading ? (
             <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : suggested.length > 0 ? (
          <div className="space-y-4">
            {suggested.map(u => (
              <div key={u.id} className="flex flex-col gap-2 p-2 hover:bg-secondary/40 rounded-xl transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden flex-shrink-0 flex items-center justify-center font-bold text-muted">
                    {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover"/> : u.name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground text-sm truncate">{u.name}</h3>
                    <p className="text-muted text-xs truncate max-w-[120px]">@{u.email?.split('@')[0]}</p>
                  </div>
                </div>
                <div className="w-full">
                  <FollowButton targetUserId={u.id} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">You're following everyone we know!</p>
        )}
      </div>

      <div className="bg-secondary/20 border border-border rounded-2xl p-4">
        <h2 className="font-bold text-xl mb-4 text-foreground">Trending Now</h2>
        <div className="space-y-4">
          {trendingTopics.map((topic, index) => (
            <div key={index} className="group cursor-pointer">
              <p className="text-sm text-muted">Trending in Tech</p>
              <h3 className="font-bold tracking-wide group-hover:text-primary transition-colors">
                {topic.tag}
              </h3>
              <p className="text-xs text-muted mt-1">{topic.count} Posts</p>
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-6 text-xs text-muted flex flex-wrap gap-2 px-2">
        <span className="cursor-pointer hover:underline">Terms of Service</span>
        <span className="cursor-pointer hover:underline">Privacy Policy</span>
        <span className="cursor-pointer hover:underline">Cookie Policy</span>
        <span className="cursor-pointer hover:underline">Accessibility</span>
        <span>© 2026 Connectify, Inc.</span>
      </div>
    </aside>
  );
}
