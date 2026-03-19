import React, { useState, useEffect } from 'react';
import CreatePost from '../components/CreatePost';
import PostCard from '../components/PostCard';
import { supabase } from '../services/supabase';
import { Loader2, Users } from 'lucide-react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

export default function Feed() {
  const { user } = useSelector((state) => state.auth);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

  useEffect(() => {
    if (user) {
      setPage(0);
      fetchPosts(0, true);
    }
  }, [user]);

  const fetchPosts = async (pageNumber = 0, initial = false) => {
    if (initial) setLoading(true);
    else setLoadingMore(true);
    
    // First, get list of users I follow
    const { data: followsData } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);
      
    const followingIds = followsData ? followsData.map(f => f.following_id) : [];
    const allowedUserIds = [...followingIds, user.id];

    // Fetch actual posts with logic for pagination
    const from = pageNumber * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        users:user_id ( id, name, avatar_url ),
        likes ( id, user_id ),
        comments ( id, content, created_at, user_id, users:user_id ( id, name, avatar_url ) )
      `)
      .in('user_id', allowedUserIds)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (!error && data) {
      if (initial) {
        setPosts(data);
      } else {
        setPosts(prev => [...prev, ...data]);
      }
      setHasMore(data.length === PAGE_SIZE);
    }
    
    setLoading(false);
    setLoadingMore(false);
  };

  const loadMore = () => {
    if (!loading && !loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPosts(nextPage);
    }
  };

  // Infinite Scroll Trigger
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    const target = document.querySelector('#scroll-trigger');
    if (target) observer.observe(target);

    return () => { if (target) observer.unobserve(target); };
  }, [hasMore, loadingMore, page]);

  const handlePostCreated = (newPost) => {
    setPosts([newPost, ...posts]);
  };

  const handleDeletePost = async (id) => {
    await supabase.from('posts').delete().eq('id', id);
    setPosts(posts.filter(p => p.id !== id));
  };

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 bg-background/80 backdrop-blur-md z-10 border-b border-border p-4 flex items-center">
        <h1 className="text-xl font-bold text-foreground">Home Feed</h1>
      </div>
      
      <CreatePost onPostCreated={handlePostCreated} />
      
      {loading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="pb-16 md:pb-0">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onDelete={handleDeletePost} />
          ))}
          
          {/* Scroll Trigger */}
          <div id="scroll-trigger" className="h-10 flex justify-center items-center">
            {loadingMore && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
          </div>

          {posts.length === 0 && (
            <div className="p-12 flex flex-col items-center justify-center text-center border-b border-border">
              <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4 text-primary">
                <Users className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Welcome to Connectify!</h2>
              <p className="text-muted mb-6 max-w-sm">Your feed is currently empty. Follow other users to see their posts here!</p>
              <Link to="/explore" className="bg-primary text-white font-bold py-2 px-6 rounded-full hover:bg-blue-600 transition-colors">
                Find people to follow
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
