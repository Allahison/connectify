import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setTheme } from '../redux/themeSlice';
import { Palette } from 'lucide-react';

const themes = [
  { id: 'light', name: 'Light', color: '#ffffff' },
  { id: 'dark', name: 'Dark', color: '#0f172a' },
  { id: 'neon', name: 'Neon', color: '#09090b' },
  { id: 'ocean', name: 'Ocean', color: '#082f49' },
  { id: 'sunset', name: 'Sunset', color: '#451a03' },
];

export default function ThemeSwitcher() {
  const dispatch = useDispatch();
  const currentTheme = useSelector((state) => state.theme.theme);

  return (
    <div className="flex items-center gap-2 p-2 rounded-xl bg-secondary/50 border border-border">
      <Palette className="h-5 w-5 text-muted ml-2" />
      <div className="flex gap-2 p-1">
        {themes.map((t) => (
          <button
            key={t.id}
            onClick={() => dispatch(setTheme(t.id))}
            className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
              currentTheme === t.id ? 'border-primary ring-2 ring-primary/30' : 'border-transparent'
            }`}
            style={{ backgroundColor: t.color }}
            title={`Switch to ${t.name} theme`}
            aria-label={`Switch to ${t.name} theme`}
          />
        ))}
      </div>
    </div>
  );
}
