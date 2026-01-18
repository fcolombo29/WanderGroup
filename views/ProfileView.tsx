
import React, { useState, useEffect } from 'react';
import { db } from '../services/database';
import { User, LogOut, Camera, Mail, User as UserIcon, Shield, Bell, ChevronRight, Save, Image as ImageIcon } from 'lucide-react';

interface ProfileViewProps {
  onUpdate: () => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ onUpdate }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    avatar_url: ''
  });

  useEffect(() => {
    const currentUser = db.getCurrentUser();
    setUser(currentUser);
    if (currentUser) {
      setFormData({
        name: currentUser.name,
        email: currentUser.email,
        avatar_url: currentUser.avatar_url || ''
      });
    }
  }, []);

  const handleSave = () => {
    db.updateCurrentUser(formData);
    setUser(db.getCurrentUser());
    setIsEditing(false);
    onUpdate();
  };

  if (!user) return <div className="p-8 text-center text-slate-400">Cargando perfil...</div>;

  return (
    <div className="p-4 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="pt-4 text-center space-y-4">
        <div className="relative inline-block group">
          <div className="w-28 h-28 rounded-[36px] bg-gradient-to-tr from-indigo-500 to-violet-500 border-4 border-white shadow-2xl shadow-indigo-100 flex items-center justify-center text-white text-4xl font-black overflow-hidden relative">
            {formData.avatar_url ? <img src={formData.avatar_url} className="w-full h-full object-cover" /> : user.name.charAt(0)}
            {isEditing && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                 <Camera size={24} className="text-white" />
              </div>
            )}
          </div>
          {!isEditing && (
            <button onClick={() => setIsEditing(true)} className="absolute -bottom-1 -right-1 bg-white p-2.5 rounded-2xl shadow-lg border border-slate-100 text-indigo-600 active:scale-90 transition-transform">
              <Camera size={20} />
            </button>
          )}
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none">{user.name}</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{user.email}</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm space-y-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Información Personal</h3>
            {!isEditing ? (
              <button onClick={() => setIsEditing(true)} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full uppercase tracking-tighter">Editar</button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setIsEditing(false)} className="text-xs font-bold text-slate-400 px-3 py-1.5 rounded-full uppercase tracking-tighter">Cancelar</button>
                <button onClick={handleSave} className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full flex items-center gap-1 uppercase tracking-tighter">
                  <Save size={12} /> Guardar
                </button>
              </div>
            )}
          </div>
          
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                <UserIcon size={20} />
              </div>
              <div className="flex-1">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Nombre Completo</p>
                {isEditing ? (
                  <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border-b-2 border-indigo-100 outline-none text-sm font-bold py-1 focus:border-indigo-600 transition-colors" />
                ) : (
                  <p className="text-sm font-black text-slate-700">{user.name}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                <Mail size={20} />
              </div>
              <div className="flex-1">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Correo Electrónico</p>
                {isEditing ? (
                  <input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border-b-2 border-indigo-100 outline-none text-sm font-bold py-1 focus:border-indigo-600 transition-colors" />
                ) : (
                  <p className="text-sm font-black text-slate-700">{user.email}</p>
                )}
              </div>
            </div>

            {isEditing && (
              <div className="flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
                <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                  <ImageIcon size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">URL de Foto de Perfil</p>
                  <input value={formData.avatar_url} onChange={e => setFormData({...formData, avatar_url: e.target.value})} className="w-full border-b-2 border-indigo-100 outline-none text-sm font-bold py-1 focus:border-indigo-600 transition-colors" placeholder="URL de la imagen" />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-[32px] p-2 border border-slate-100 shadow-sm overflow-hidden">
          {[
            { icon: <Shield size={18} />, label: 'Seguridad', color: 'text-blue-500' },
            { icon: <Bell size={18} />, label: 'Notificaciones', color: 'text-amber-500' },
          ].map((item, i) => (
            <button key={i} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center ${item.color}`}>
                  {item.icon}
                </div>
                <span className="text-sm font-black text-slate-700 uppercase tracking-tight">{item.label}</span>
              </div>
              <ChevronRight size={18} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
            </button>
          ))}
          
          <button className="w-full flex items-center justify-between p-4 hover:bg-rose-50 transition-colors group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500">
                <LogOut size={18} />
              </div>
              <span className="text-sm font-black text-rose-600 uppercase tracking-tight">Cerrar Sesión</span>
            </div>
          </button>
        </div>
      </div>
      
      <div className="text-center pb-8 opacity-40">
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">WanderGroup Premium v1.1.0</p>
      </div>
    </div>
  );
};

export default ProfileView;
