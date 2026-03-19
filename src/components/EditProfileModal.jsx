import React, { useState, useRef } from 'react';
import { supabase } from '../services/supabase';
import { X, Loader2, Camera } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { setUser } from '../redux/authSlice';

export default function EditProfileModal({ user, onClose, onUpdate }) {
  const [name, setName] = useState(user?.user_metadata?.name || '');
  const [bio, setBio] = useState(user?.user_metadata?.bio || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.user_metadata?.avatar_url || '');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const dispatch = useDispatch();

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    let avatar_url = user?.user_metadata?.avatar_url;

    if (avatarFile) {
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, avatarFile, { upsert: true });

      if (!uploadError) {
        const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
        avatar_url = data.publicUrl;
      }
    }

    // Update Supabase Auth metadata
    const { data: updatedUser, error } = await supabase.auth.updateUser({
      data: { name, bio, avatar_url }
    });

    // Also update the public.users database table manually because auth trigger is only on INSERT
    if (!error) {
       await supabase.from('users').update({ name, bio, avatar_url }).eq('id', user.id);
       
       if (updatedUser?.user) {
         dispatch(setUser({ user: updatedUser.user }));
       }
       onUpdate();
       onClose();
    } else {
       console.error("Error updating profile:", error);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-background w-full max-w-md rounded-2xl shadow-2xl border border-border p-6 relative">
        <button onClick={onClose} className="absolute right-4 top-4 text-muted hover:text-foreground">
          <X className="h-6 w-6" />
        </button>
        <h2 className="text-2xl font-bold mb-6 text-foreground">Edit Profile</h2>
        
        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex justify-center mb-6">
            <input 
              type="file" 
              ref={fileInputRef} 
              hidden 
              onChange={handleFileSelect} 
              accept="image/*" 
            />
            <div 
              className="relative group cursor-pointer" 
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-24 h-24 rounded-full bg-secondary/50 border-2 border-border overflow-hidden flex items-center justify-center">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-muted">{name?.charAt(0)?.toUpperCase()}</span>
                )}
              </div>
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 bg-secondary/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-4 py-2 bg-secondary/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground resize-none h-24"
              placeholder="Tell us about yourself..."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center mt-6"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
