
import React, { useState, useEffect } from 'react';
import { db } from '../services/database';
import { Activity, ActivityStatus, User } from '../types';
import { Plus, CheckCircle, Circle, Clock, MoreHorizontal, X, Users, MapPin, Edit3 } from 'lucide-react';

interface ActivitiesViewProps {
  tripId: string;
}

const ActivitiesView: React.FC<ActivitiesViewProps> = ({ tripId }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingAct, setEditingAct] = useState<Activity | null>(null);
  const [newAct, setNewAct] = useState({ 
    title: '', 
    date: '', 
    time: '', 
    description: '',
    participants: [] as string[] 
  });

  useEffect(() => {
    refreshData();
    setMembers(db.getTripMembers(tripId));
  }, [tripId]);

  const refreshData = () => {
    setActivities(db.getActivities(tripId).sort((a, b) => {
      const dateA = new Date(a.date + ' ' + (a.time || '00:00')).getTime();
      const dateB = new Date(b.date + ' ' + (b.time || '00:00')).getTime();
      return dateA - dateB;
    }));
  };

  const toggleStatus = (id: string) => {
    const act = activities.find(a => a.id === id);
    if (!act) return;
    const newStatus = act.status === ActivityStatus.DONE ? ActivityStatus.PENDING : ActivityStatus.DONE;
    db.updateActivity(id, { status: newStatus });
    refreshData();
  };

  const openCreate = () => {
    setEditingAct(null);
    setNewAct({ title: '', date: '', time: '', description: '', participants: [] });
    setShowModal(true);
  };

  const openEdit = (act: Activity) => {
    setEditingAct(act);
    setNewAct({
      title: act.title,
      date: act.date,
      time: act.time || '',
      description: act.description || '',
      participants: act.participants || []
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAct.title || !newAct.date) return;
    
    if (editingAct) {
      db.updateActivity(editingAct.id, newAct);
    } else {
      db.addActivity({
        trip_id: tripId,
        title: newAct.title,
        description: newAct.description,
        date: newAct.date,
        time: newAct.time,
        status: ActivityStatus.PENDING,
        participants: newAct.participants
      });
    }
    
    refreshData();
    setShowModal(false);
  };

  const grouped = activities.reduce((acc: any, act) => {
    if (!acc[act.date]) acc[act.date] = [];
    acc[act.date].push(act);
    return acc;
  }, {});

  const getUserName = (id: string) => members.find(m => m.id === id)?.name || '...';

  return (
    <div className="p-4 pb-24">
      <div className="flex justify-between items-center mb-8 pt-2">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Plan de Viaje</h2>
          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mt-1">Próximos Destinos</p>
        </div>
        <button onClick={openCreate} className="bg-amber-500 text-white w-12 h-12 rounded-2xl shadow-xl shadow-amber-100 flex items-center justify-center active:scale-90 transition-transform">
          <Plus size={28} />
        </button>
      </div>

      <div className="space-y-10">
        {Object.keys(grouped).length === 0 ? (
          <div className="text-center py-20">
             <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-200 mb-4">
                <MapPin size={40} />
             </div>
             <p className="text-slate-400 font-bold text-sm">Organiza tu aventura aquí</p>
          </div>
        ) : (
          Object.entries(grouped).map(([date, items]: [string, any]) => (
            <div key={date} className="relative">
              <div className="sticky top-0 bg-transparent z-10 py-1 mb-4">
                 <h3 className="text-[10px] font-black text-amber-600 uppercase tracking-[0.3em] flex items-center gap-3">
                  <span className="w-6 h-1.5 bg-amber-500 rounded-full"></span>
                  {new Date(date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
                </h3>
              </div>
              <div className="space-y-4 ml-2 pl-4 border-l-2 border-slate-100">
                {items.map((act: Activity) => (
                  <div key={act.id} className={`flex items-start gap-4 p-5 rounded-3xl border transition-all duration-500 ${act.status === ActivityStatus.DONE ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <button onClick={() => toggleStatus(act.id)} className="mt-1 shrink-0">
                      {act.status === ActivityStatus.DONE 
                        ? <CheckCircle size={22} className="text-emerald-500 fill-emerald-50" /> 
                        : <Circle size={22} className="text-slate-200" />
                      }
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h4 className={`font-black text-sm tracking-tight ${act.status === ActivityStatus.DONE ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                          {act.title}
                        </h4>
                        <button onClick={() => openEdit(act)} className="text-slate-300 ml-2 hover:text-amber-500 transition-colors">
                          <Edit3 size={18}/>
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-3 mt-2">
                        {act.time && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 uppercase tracking-tighter bg-amber-50 px-2 py-0.5 rounded-md">
                            <Clock size={10} />
                            <span>{act.time}</span>
                          </div>
                        )}
                        {act.participants && act.participants.length > 0 && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                            <Users size={10} />
                            <span>{act.participants.length} Participan</span>
                          </div>
                        )}
                      </div>

                      {act.participants && act.participants.length > 0 && (
                        <div className="mt-3 flex -space-x-1.5 overflow-hidden">
                          {act.participants.map(pid => (
                            <div key={pid} className="h-5 w-5 rounded-full border border-white bg-slate-100 text-[8px] flex items-center justify-center font-black text-slate-500 shadow-sm" title={getUserName(pid)}>
                              {getUserName(pid).charAt(0)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-end justify-center p-0">
          <div className="bg-white w-full max-w-md rounded-t-[40px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">{editingAct ? 'Editar Actividad' : 'Planificar Actividad'}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 bg-slate-50 rounded-full text-slate-400">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6 pb-8">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Título</label>
                <input 
                  placeholder="Ej: Tour por la Sagrada Familia" 
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                  value={newAct.title}
                  onChange={e => setNewAct({...newAct, title: e.target.value})}
                  autoFocus
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Fecha</label>
                  <input type="date" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm outline-none" value={newAct.date} onChange={e => setNewAct({...newAct, date: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Hora</label>
                  <input type="time" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm outline-none" value={newAct.time} onChange={e => setNewAct({...newAct, time: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">¿Quiénes se apuntan?</label>
                <div className="flex flex-wrap gap-2">
                  {members.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        const next = newAct.participants.includes(m.id)
                          ? newAct.participants.filter(id => id !== m.id)
                          : [...newAct.participants, m.id];
                        setNewAct({...newAct, participants: next});
                      }}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border ${newAct.participants.includes(m.id) ? 'bg-amber-500 border-amber-500 text-white' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>

              <button className="w-full bg-amber-500 text-white py-5 rounded-3xl font-black shadow-2xl shadow-amber-100 uppercase text-xs tracking-[0.2em] active:scale-95 transition-all mt-4">
                {editingAct ? 'Guardar Cambios' : 'Crear Actividad'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivitiesView;
