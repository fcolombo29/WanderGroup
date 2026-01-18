
import React, { useState, useEffect } from 'react';
import { db } from '../services/database';
import { Trip, TripStatus } from '../types';
import { Calendar, MapPin, ChevronRight, PlusCircle, X, Map, Edit2, Image as ImageIcon } from 'lucide-react';

interface HomeProps {
  onSelectTrip: (id: string) => void;
}

const HomeView: React.FC<HomeProps> = ({ onSelectTrip }) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    destination: '',
    start_date: '',
    end_date: '',
    image_url: ''
  });

  // Calculate current date in YYYY-MM-DD format for min attribute
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    setTrips(db.getTrips());
  }, []);

  const openCreate = () => {
    setEditingTripId(null);
    setFormData({ name: '', destination: '', start_date: '', end_date: '', image_url: '' });
    setShowCreate(true);
  };

  const openEdit = (e: React.MouseEvent, trip: Trip) => {
    e.stopPropagation();
    setEditingTripId(trip.id);
    setFormData({
      name: trip.name,
      destination: trip.destination,
      start_date: trip.start_date,
      end_date: trip.end_date,
      image_url: trip.image_url || ''
    });
    setShowCreate(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.destination) return;
    
    if (editingTripId) {
      db.updateTrip(editingTripId, formData);
    } else {
      const created = db.createTrip(formData);
      onSelectTrip(created.id);
    }
    
    setTrips(db.getTrips());
    setShowCreate(false);
  };

  const activeTrips = trips.filter(t => t.status === TripStatus.ACTIVE);
  const archivedTrips = trips.filter(t => t.status !== TripStatus.ACTIVE);

  return (
    <div className="p-4 space-y-6">
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Tus Viajes Activos</h2>
          <button 
            onClick={openCreate}
            className="text-indigo-600 text-xs font-black uppercase tracking-widest flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 active:scale-95 transition-all"
          >
            <PlusCircle size={14} />
            Crear Nuevo
          </button>
        </div>
        
        {activeTrips.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-100 rounded-[32px] p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
               <Map size={32} />
            </div>
            <p className="text-slate-400 text-sm font-bold">¿No hay planes a la vista?</p>
            <button 
              onClick={openCreate}
              className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100"
            >
              Empieza una aventura
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {activeTrips.map(trip => (
              <div 
                key={trip.id}
                onClick={() => onSelectTrip(trip.id)}
                className="bg-white rounded-[28px] overflow-hidden shadow-sm border border-slate-100 active:scale-[0.98] transition-all cursor-pointer group relative"
              >
                <button 
                  onClick={(e) => openEdit(e, trip)}
                  className="absolute top-4 right-4 z-10 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-colors"
                >
                  <Edit2 size={16} />
                </button>
                <div className="h-44 w-full relative">
                  <img src={trip.image_url} alt={trip.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent flex flex-col justify-end p-6">
                    <h3 className="text-white font-black text-2xl tracking-tight leading-none mb-2">{trip.name}</h3>
                    <div className="flex items-center text-indigo-200 text-[10px] font-black uppercase tracking-widest gap-4 mt-1">
                      <div className="flex items-center gap-1.5">
                        <MapPin size={12} className="text-white" />
                        <span>{trip.destination}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-white" />
                        <span>{new Date(trip.start_date).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {archivedTrips.length > 0 && (
        <section>
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Historial de Viajes</h2>
          <div className="space-y-3">
            {archivedTrips.map(trip => (
              <div 
                key={trip.id}
                onClick={() => onSelectTrip(trip.id)}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 active:bg-white transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl overflow-hidden grayscale">
                    <img src={trip.image_url} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-700 text-sm leading-tight">{trip.name}</h4>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-tighter mt-0.5">{trip.destination} • {new Date(trip.start_date).getFullYear()}</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-300" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Create/Edit Trip Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end justify-center p-0">
          <div className="bg-white w-full max-w-md rounded-t-[40px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">{editingTripId ? 'Editar Viaje' : 'Nuevo Viaje'}</h3>
              <button onClick={() => setShowCreate(false)} className="p-2 bg-slate-50 rounded-full text-slate-400">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6 pb-8">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Nombre del Viaje</label>
                <input 
                  placeholder="Ej: Verano en Italia 🇮🇹" 
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Destino</label>
                <input 
                  placeholder="Ej: Roma, Toscana, Costa Amalfitana" 
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  value={formData.destination}
                  onChange={e => setFormData({...formData, destination: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Fecha Inicio</label>
                  <input 
                    type="date" 
                    min={today}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm outline-none" 
                    value={formData.start_date} 
                    onChange={e => setFormData({...formData, start_date: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Fecha Fin</label>
                  <input 
                    type="date" 
                    min={formData.start_date || today}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm outline-none" 
                    value={formData.end_date} 
                    onChange={e => setFormData({...formData, end_date: e.target.value})} 
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">URL de Foto de Portada</label>
                <div className="relative">
                  <input 
                    placeholder="URL de imagen (Unsplash, etc.)" 
                    className="w-full p-4 pl-12 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                    value={formData.image_url}
                    onChange={e => setFormData({...formData, image_url: e.target.value})}
                  />
                  <ImageIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <button className="w-full bg-indigo-600 text-white py-5 rounded-3xl font-black shadow-2xl shadow-indigo-100 uppercase text-xs tracking-[0.2em] active:scale-95 transition-all mt-4">
                {editingTripId ? 'Guardar Cambios' : 'Crear Aventura'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeView;
