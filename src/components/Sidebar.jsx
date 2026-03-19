import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Home, Compass, Bell, MessageCircle, User, LogOut, Hexagon } from 'lucide-react';
import { supabase } from '../services/supabase';
import ThemeSwitcher from './ThemeSwitcher';

const navItems = [
  { name: 'Home', path: '/feed', icon: Home },
  { name: 'Explore', path: '/explore', icon: Compass },
  { name: 'Notifications', path: '/notifications', icon: Bell },
  { name: 'Messages', path: '/messages', icon: MessageCircle },
  { name: 'Profile', path: '/profile', icon: User },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const { unreadCount } = useSelector(state => state.notifications);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 border-r border-border bg-background glass-effect p-4 flex flex-col hidden md:flex z-50">
      <div className="flex items-center gap-2 px-2 py-4 mb-8">
        <Hexagon className="h-8 w-8 text-primary fill-primary/20" />
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
          Connectify
        </h1>
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            onClick={(e) => {
              if (window.location.pathname === item.path) {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className={({ isActive }) =>
              `flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
                isActive
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-foreground hover:bg-secondary/50 hover:text-primary'
              }`
            }
          >
            <div className="relative">
              <item.icon className="h-5 w-5" />
              {item.name === 'Notifications' && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
            </div>
            <span className="text-lg">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto space-y-4">
        <ThemeSwitcher />
        <button
          onClick={handleLogout}
          className="flex items-center gap-4 px-4 py-3 w-full text-left text-muted hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
        >
          <LogOut className="h-5 w-5" />
          <span className="text-lg font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}
