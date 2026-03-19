import React, { useState, useEffect } from 'react';
import { Search, Loader2, Users, Layout, Hash, TrendingUp } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import FollowButton from '../components/FollowButton';
import PostCard from '../components/PostCard';

const TABS = [
  { id: 'top', label: 'Top', icon: TrendingUp },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'posts', label: 'Posts', icon: Layout },
];

const TRENDING_TAGS = ['#ReactJS', '#WebDev', '#Connectify', '#TailwindCSS', '#Supabase', '#FramerMotion', '#Frontend', '#Developer'];

export default function Explore() {
  const { user: currentUser } = useSelector(state => state.auth);
  const location = useLocation();
  const navigate = useNavigate();
  
  const [query, setQuery] = useState(new URLSearchParams(location.search).get('q') || '');
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [activeTab, setActiveTab] = useState('top');
  
  const [userResults, setUserResults] = useState([]);
  const [postResults, setPostResults] = useState([]);
  const [trendingPosts, setTrendingPosts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Sync URL query to state
  useEffect(() => {
    const currentQ = new URLSearchParams(location.search).get('q');
    if (currentQ !== null && currentQ !== query) {
      setQuery(currentQ);
    }
  }, [location.search]);

  // Handle Debounce
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [query]);

  // Fetch logic based on debouncedQuery
  useEffect(() => {
    if (debouncedQuery.trim().length > 1) {
      searchAll();
    } else {
      setUserResults([]);
      setPostResults([]);
      fetchTrendingPosts();
    }
  }, [debouncedQuery]);

  const fetchTrendingPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('posts')
      .select(`*, users:user_id(id, name, avatar_url), likes(id, user_id), comments(id)`)
      .order('created_at', { ascending: false })
      .limit(5);
    if (!error && data) setTrendingPosts(data);
    setLoading(false);
  };

  const searchAll = async () => {
    setLoading(true);
    
    const [usersRes, postsRes] = await Promise.all([
      supabase.from('users').select('id, name, avatar_url, bio').ilike('name', `%${debouncedQuery}%`).range(0, 9),
      supabase.from('posts').select(`*, users:user_id(id, name, avatar_url), likes(id, user_id), comments(id)`).ilike('content', `%${debouncedQuery}%`).order('created_at', { ascending: false }).range(0, 19)
    ]);
    
    if (!usersRes.error) setUserResults(usersRes.data);
    if (!postsRes.error) setPostResults(postsRes.data);
    
    setLoading(false);
  };

  const handleTagClick = (tag) => {
    setQuery(tag);
    navigate(`/explore?q=${encodeURIComponent(tag)}`);
  };

  const hasSearch = debouncedQuery.trim().length > 1;

  // Render Skeletons
  const renderSkeletons = () => (
    <div className="p-4 space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="animate-pulse flex gap-4 p-4 border border-border rounded-xl">
          <div className="w-12 h-12 bg-secondary rounded-full shrink-0"></div>
          <div className="flex-1 space-y-3">
            <div className="h-4 bg-secondary rounded w-1/3"></div>
            <div className="h-3 bg-secondary rounded w-1/2"></div>
            <div className="h-20 bg-secondary rounded w-full mt-2"></div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen pb-20 md:pb-0 bg-background flex flex-col">
      <div className="sticky top-0 bg-background/80 backdrop-blur-xl z-20 border-b border-border shadow-sm">
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users, posts, or tags..."
              className="w-full pl-12 pr-4 py-3 bg-secondary/50 border border-transparent focus:border-primary/50 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all text-foreground text-base shadow-inner"
            />
            {query && (
               <button onClick={() => { setQuery(''); navigate('/explore'); }} className="absolute right-4 top-3.5 text-muted hover:text-foreground text-sm font-medium transition-colors">
                 Clear
               </button>
            )}
          </div>
        </div>

        {hasSearch && (
          <div className="flex px-2 border-t border-border/50">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 relative py-4 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${activeTab === tab.id ? 'text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/20'}`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      
      <div className="flex-1">
        {loading ? (
          renderSkeletons()
        ) : !hasSearch ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 max-w-2xl mx-auto">
            <div className="mb-10 mt-4">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-foreground">
                <Hash className="w-6 h-6 text-primary" /> Trending Now
              </h2>
              <div className="flex flex-wrap gap-2">
                {TRENDING_TAGS.map((tag, idx) => (
                   <motion.span 
                     initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }}
                     key={tag} 
                     onClick={() => handleTagClick(tag)}
                     className="px-4 py-2 rounded-full border border-border/50 bg-secondary/30 hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all cursor-pointer font-medium text-sm text-foreground shadow-sm"
                   >
                     {tag}
                   </motion.span>
                ))}
              </div>
            </div>

            {trendingPosts.length > 0 && (
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-foreground">
                  <TrendingUp className="w-6 h-6 text-primary" /> Popular Posts
                </h2>
                <div className="bg-background rounded-2xl border border-border overflow-hidden shadow-sm">
                  {trendingPosts.map(post => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-2xl mx-auto"
            >
              {/* Top Tab content */}
              {activeTab === 'top' && (
                <div className="p-4">
                  {userResults.length === 0 && postResults.length === 0 && (
                    <div className="text-center text-muted p-10 font-medium">No results found for "{debouncedQuery}"</div>
                  )}
                  {userResults.length > 0 && (
                    <div className="mb-8 bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                      <div className="px-4 py-3 bg-secondary/20 border-b border-border/50 font-bold text-foreground">People</div>
                      {userResults.slice(0, 3).map(u => (
                        <div key={u.id} className="flex items-center justify-between p-4 border-b border-border/50 hover:bg-secondary/10 transition-colors last:border-0">
                          <div className="flex items-center gap-3 min-w-0 pr-2 flex-1">
                            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                              {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover"/> : <span className="font-bold text-muted">{u.name?.charAt(0)}</span>}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-bold text-foreground truncate text-sm sm:text-base">{u.name}</h3>
                              <p className="text-xs text-muted truncate">{u.bio || 'No bio available'}</p>
                            </div>
                          </div>
                          {currentUser?.id !== u.id && <FollowButton targetUserId={u.id} />}
                        </div>
                      ))}
                      {userResults.length > 3 && (
                        <button onClick={() => setActiveTab('users')} className="w-full py-3 text-sm text-primary font-medium hover:bg-primary/5 transition-colors">Show all users</button>
                      )}
                    </div>
                  )}

                  {postResults.length > 0 && (
                    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                       <div className="px-4 py-3 bg-secondary/20 border-b border-border/50 font-bold text-foreground">Posts</div>
                       {postResults.map(p => <PostCard key={p.id} post={p} />)}
                    </div>
                  )}
                </div>
              )}

              {/* Users Tab content */}
              {activeTab === 'users' && (
                <div className="p-4">
                   {userResults.length === 0 ? (
                     <div className="text-center text-muted p-10 font-medium">No users found for "{debouncedQuery}"</div>
                   ) : (
                     <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                      {userResults.map(u => (
                        <div key={u.id} className="flex items-center justify-between p-4 border-b border-border/50 hover:bg-secondary/10 transition-colors last:border-0">
                          <div className="flex items-center gap-3 min-w-0 pr-2 flex-1">
                            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                              {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover"/> : <span className="font-bold text-muted">{u.name?.charAt(0)}</span>}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-bold text-foreground truncate text-sm sm:text-base">{u.name}</h3>
                              <p className="text-xs text-muted truncate">{u.bio || 'No bio available'}</p>
                            </div>
                          </div>
                          {currentUser?.id !== u.id && <FollowButton targetUserId={u.id} />}
                        </div>
                      ))}
                     </div>
                   )}
                </div>
              )}

              {/* Posts Tab content */}
              {activeTab === 'posts' && (
                <div className="p-4">
                  {postResults.length === 0 ? (
                     <div className="text-center text-muted p-10 font-medium">No posts found for "{debouncedQuery}"</div>
                   ) : (
                    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                      {postResults.map(p => <PostCard key={p.id} post={p} />)}
                    </div>
                   )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
