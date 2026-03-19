import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Toaster, toast } from 'react-hot-toast';
import { supabase } from '../services/supabase';
import { setUnreadCount, incrementUnread } from '../redux/notificationSlice';
import Sidebar from './Sidebar';
import RightSidebar from './RightSidebar';
import BottomNav from './BottomNav';
import ScrollToTop from './ScrollToTop';

export default function Layout() {
  const { user } = useSelector(state => state.auth);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!user) return;

    // Fetch initial unread count
    const fetchUnread = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      
      if (count !== null) dispatch(setUnreadCount(count));
    };

    fetchUnread();

    // Global listener for new notifications
    const subscription = supabase
      .channel('global-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload) => {
         dispatch(incrementUnread());
         
         const type = payload.new?.type;
         let msg = 'You have a new notification!';
         if (type === 'message') msg = 'You received a new message!';
         if (type === 'like') msg = 'Someone liked your post!';
         if (type === 'comment') msg = 'Someone commented on your post!';
         if (type === 'follow') msg = 'You have a new follower!';
         if (type === 'post') msg = 'A user you follow published a new post!';

         toast(msg, {
           icon: '🔔',
           style: {
             borderRadius: '10px',
             background: 'var(--color-secondary)',
             color: 'var(--color-foreground)',
             border: '1px solid var(--color-border)'
           },
         });
      })
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, [user, dispatch]);

  return (
    <div className="min-h-screen bg-background text-foreground flex justify-center">
      <Toaster position="top-center" reverseOrder={false} />
      <Sidebar />
      <main className="w-full md:ml-64 lg:mr-80 max-w-2xl min-h-screen border-x border-border/50">
        <div className="pb-20 md:pb-0">
          <Outlet />
        </div>
      </main>
      <RightSidebar />
      <BottomNav />
      <ScrollToTop />
    </div>
  );
}
