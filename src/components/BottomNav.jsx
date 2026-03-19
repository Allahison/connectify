import React from 'react';
import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Home, Compass, Bell, MessageCircle, User } from 'lucide-react';

const navItems = [
  { name: 'Home', path: '/feed', icon: Home },
  { name: 'Explore', path: '/explore', icon: Compass },
  { name: 'Notifications', path: '/notifications', icon: Bell },
  { name: 'Messages', path: '/messages', icon: MessageCircle },
  { name: 'Profile', path: '/profile', icon: User },
];

export default function BottomNav() {
  const { unreadCount } = useSelector(state => state.notifications);

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-background glass-effect border-t border-border p-2 flex justify-around items-center md:hidden z-50">
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
            `p-3 rounded-xl transition-all ${
              isActive
                ? 'text-primary bg-primary/10'
                : 'text-muted hover:text-foreground'
            }`
          }
        >
          <div className="relative">
            <item.icon className="h-6 w-6" />
            {item.name === 'Notifications' && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            )}
          </div>
        </NavLink>
      ))}
    </nav>
  );
}
