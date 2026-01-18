
import React, { useState, useEffect } from 'react';
import { MapPin, Download, Search, Navigation, Info, X, Map as MapIcon, Layers } from 'lucide-react';
import { db } from '../services/database';

interface MapsViewProps {
  tripId: string;
}

const MapsView: React.FC<MapsViewProps> = ({ tripId }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isOfflineReady, setIsOfflineReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [destination, setDestination] = useState('');

  useEffect(() => {
    const trip = db.getTripById(tripId);
    if (trip) setDestination(trip.destination);
  }, [tripId]);

  const simulateDownload = () => {
    setIsDownloading(true);
    setTimeout(() => {
      setIsDownloading(false);
      setIsOfflineReady(true);
    }, 3000);
  };

  // Google Maps Embed URL based on destination
  const mapUrl = `https://www.google.com/maps/embed/v1/place?key=${process.env.API_KEY}&q=${encodeURIComponent(destination || 'Barcelona')}`;

  return (
    <div className="flex flex-col h-full bg-slate-100 relative overflow-hidden">
      {/* Search Bar Overlay */}
      <div className="absolute top-4 left-4 right-4 z-20">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 px-4 py-3 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
          <Search size={18} className="text-slate-400" />
          <input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar lugares en el destino..." 
            className="flex-1 bg-transparent border-none outline-none text-sm py-1 font-bold" 
          />
          {searchQuery && <button onClick={() => setSearchQuery('')} className="text-slate-300"><X size={16}/></button>}
          <div className="w-px h-6 bg-slate-100"></div>
          <Navigation size={18} className="text-indigo-600" />
        </div>
      </div>

      {/* Actual Map Section */}
      <div className="flex-1 relative bg-slate-200">
        {/* We use an iframe for real Google Maps interaction */}
        <iframe
          title="Google Map"
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          src={`https://www.google.com/maps?q=${encodeURIComponent(searchQuery || destination)}&output=embed`}
        ></iframe>

        {/* Floating Controls */}
        <div className="absolute right-4 bottom-32 flex flex-col gap-3">
          <button className="w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center text-slate-600 active:scale-90 transition-transform">
            <Layers size={20} />
          </button>
          <button className="w-14 h-14 bg-indigo-600 text-white rounded-3xl shadow-2xl shadow-indigo-200 flex items-center justify-center active:scale-90 transition-transform">
            <Navigation size={24} />
          </button>
        </div>
      </div>

      {/* Bottom Sheet for Map Tools */}
      <div className="bg-white rounded-t-[40px] p-6 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] border-t border-slate-50 z-10">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">{destination}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mapa Interactivo</p>
          </div>
          {isOfflineReady ? (
            <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-2xl text-[10px] font-black flex items-center gap-2 border border-emerald-100">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              MAPA OFFLINE LISTO
            </div>
          ) : (
            <button 
              onClick={simulateDownload}
              disabled={isDownloading}
              className={`bg-indigo-50 text-indigo-600 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 ${isDownloading ? 'animate-pulse opacity-70' : ''}`}
            >
              {isDownloading ? 'Descargando...' : <><Download size={14} /> Guardar Offline</>}
            </button>
          )}
        </div>

        <div className="bg-slate-50 rounded-3xl p-5 flex gap-4 border border-slate-100">
          <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-sm">
            <Info size={20} />
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
            Descarga el área del viaje para navegar sin conexión. Los puntos marcados en tu itinerario se sincronizarán automáticamente.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MapsView;
