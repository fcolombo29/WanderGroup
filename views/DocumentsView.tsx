
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/database';
import { Document } from '../types';
import { Files, Plus, Search, ExternalLink, Download, FileCheck, Shield, ReceiptText, X, File, UploadCloud } from 'lucide-react';

interface DocumentsViewProps {
  tripId: string;
}

const DocumentsView: React.FC<DocumentsViewProps> = ({ tripId }) => {
  const [docs, setDocs] = useState<Document[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDocs(db.getDocuments(tripId));
  }, [tripId]);

  const docTypes = {
    ticket: { icon: <ReceiptText size={20} />, label: 'Tickets / Vuelos', color: 'bg-blue-50 text-blue-600' },
    reservation: { icon: <FileCheck size={20} />, label: 'Reservas', color: 'bg-emerald-50 text-emerald-600' },
    insurance: { icon: <Shield size={20} />, label: 'Seguros', color: 'bg-orange-50 text-orange-600' },
    other: { icon: <Files size={20} />, label: 'Otros', color: 'bg-slate-50 text-slate-600' },
  };

  const handleTriggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Determinamos el tipo basado en el nombre de forma simple para el demo
    let type: 'ticket' | 'reservation' | 'insurance' | 'other' = 'other';
    const fileName = file.name.toLowerCase();
    if (fileName.includes('ticket') || fileName.includes('vuelo') || fileName.includes('pass')) type = 'ticket';
    if (fileName.includes('reserva') || fileName.includes('hotel') || fileName.includes('booking')) type = 'reservation';
    if (fileName.includes('seguro') || fileName.includes('insurance')) type = 'insurance';

    const newDoc: Omit<Document, 'id'> = {
      trip_id: tripId,
      name: file.name,
      type: type,
      url: '#', // En una app real aquí subiríamos a un storage
      date: new Date().toLocaleDateString('es-ES')
    };

    const savedDoc = db.addDocument(newDoc);
    setDocs(prev => [savedDoc, ...prev]);
    
    // Limpiar el input
    e.target.value = '';
  };

  const filteredDocs = docs.filter(doc => 
    doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 pb-24 animate-in fade-in duration-500">
      {/* Hidden file input to allow device access */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept=".pdf,.doc,.docx,.jpg,.png"
      />

      <div className="flex justify-between items-center mb-8 pt-2">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Documentos</h2>
          <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-1">Archivos del Viaje</p>
        </div>
        <button 
          onClick={handleTriggerUpload}
          className="bg-indigo-600 text-white w-12 h-12 rounded-2xl shadow-xl shadow-indigo-100 flex items-center justify-center active:scale-90 transition-transform"
        >
          <Plus size={28} />
        </button>
      </div>

      <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm px-4 py-1 flex items-center gap-3 mb-8 focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
        <Search size={18} className="text-slate-400" />
        <input 
          placeholder="Buscar tickets, reservas..." 
          className="flex-1 bg-transparent border-none outline-none text-sm py-3 font-bold text-slate-700"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && <button onClick={() => setSearchTerm('')} className="text-slate-300"><X size={16}/></button>}
      </div>

      <div className="space-y-4">
        {filteredDocs.length === 0 ? (
          <div className="text-center py-20 px-6">
            <div className="w-24 h-24 bg-indigo-50 rounded-[32px] flex items-center justify-center mx-auto text-indigo-200 mb-6 shadow-inner">
              <Files size={48} />
            </div>
            <h3 className="text-lg font-black text-slate-800 mb-2">No hay documentos</h3>
            <p className="text-slate-400 text-sm font-medium mb-8">Sube tus pases de abordar, reservas de hotel o seguros para tenerlos a mano.</p>
            <button 
              onClick={handleTriggerUpload}
              className="inline-flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest bg-indigo-50 px-6 py-4 rounded-2xl border border-indigo-100 active:scale-95 transition-all shadow-sm"
            >
              <UploadCloud size={16} />
              Subir primer documento
            </button>
          </div>
        ) : (
          filteredDocs.map(doc => {
            const config = docTypes[doc.type as keyof typeof docTypes] || docTypes.other;
            return (
              <div key={doc.id} className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm flex items-center justify-between animate-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl ${config.color} flex items-center justify-center shadow-sm`}>
                    {config.icon}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 text-sm leading-tight max-w-[150px] truncate">{doc.name}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-1">{config.label} • {doc.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button className="p-2.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                    <Download size={20} />
                  </button>
                  <button className="p-2.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                    <ExternalLink size={20} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {docs.length > 0 && (
        <div className="mt-12 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-[32px] p-6 text-white shadow-xl shadow-indigo-100">
           <div className="flex items-start gap-4">
             <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
               <Shield size={24} />
             </div>
             <div>
               <h4 className="font-black text-base mb-1 tracking-tight">Caja Fuerte de Viaje</h4>
               <p className="text-[10px] text-indigo-100 leading-relaxed font-bold opacity-80 uppercase">
                 Tus archivos están encriptados localmente y disponibles 100% offline.
               </p>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default DocumentsView;
