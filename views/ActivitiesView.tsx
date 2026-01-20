
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/database';
import { Activity, ActivityStatus, User, JournalEntry, Trip } from '../types';
import { GoogleGenAI } from "@google/genai";
import { Plus, CheckCircle, Circle, Clock, X, Users, MapPin, Edit3, BookOpen, Calendar as CalendarIcon, Mic, MicOff, Sparkles, Loader2, Save, ChevronRight, PenLine, History } from 'lucide-react';

interface ActivitiesViewProps {
  tripId: string;
}

const ActivitiesView: React.FC<ActivitiesViewProps> = ({ tripId }) => {
  const [activeTab, setActiveTab] = useState<'itinerary' | 'journal'>('itinerary');
  const [trip, setTrip] = useState<Trip | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  
  // Itinerary states
  const [showItineraryModal, setShowItineraryModal] = useState(false);
  const [editingAct, setEditingAct] = useState<Activity | null>(null);
  const [newAct, setNewAct] = useState({ 
    title: '', date: '', time: '', description: '', participants: [] as string[] 
  });

  // Journal states
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [showJournalEditor, setShowJournalEditor] = useState(false);
  const [editingEntryDate, setEditingEntryDate] = useState('');
  const [journalContent, setJournalContent] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const currentTrip = db.getTripById(tripId);
    if (currentTrip) {
      setTrip(currentTrip);
      setEditingEntryDate(new Date().toISOString().split('T')[0]);
    }
    refreshData();
    setMembers(db.getTripMembers(tripId));

    // Configuración mejorada de Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'es-ES';

      recognitionRef.current.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            setJournalContent(prev => prev + (prev ? ' ' : '') + event.results[i][0].transcript);
          } else {
            currentTranscript += event.results[i][0].transcript;
          }
        }
        setTranscript(currentTranscript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        setTranscript('');
      };
    }
  }, [tripId]);

  const refreshData = () => {
    setActivities(db.getActivities(tripId).sort((a, b) => {
      const dateA = new Date(a.date + ' ' + (a.time || '00:00')).getTime();
      const dateB = new Date(b.date + ' ' + (b.time || '00:00')).getTime();
      return dateA - dateB;
    }));
    setJournalEntries(db.getJournalEntries(tripId));
  };

  const openJournalEditor = (date: string) => {
    const entry = journalEntries.find(e => e.date === date && e.user_id === db.getCurrentUser()?.id);
    setEditingEntryDate(date);
    setJournalContent(entry?.content || '');
    setIsShared(entry?.is_shared || false);
    setShowJournalEditor(true);
  };

  const handleJournalSave = () => {
    const user = db.getCurrentUser();
    if (!user) return;
    db.saveJournalEntry({
      trip_id: tripId,
      user_id: user.id,
      date: editingEntryDate,
      content: journalContent,
      is_shared: isShared
    });
    refreshData();
    setShowJournalEditor(false);
  };

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert("El dictado por voz no es compatible con este navegador.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const refineWithAi = async () => {
    if (!journalContent.trim()) return;
    setIsAiProcessing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Eres un escritor de viajes. Transforma las siguientes notas crudas de un diario de viaje en un relato emocionante, fluido y bien estructurado en primera persona, manteniendo todos los detalles importantes. Si hay errores gramaticales o de puntuación debido a dictado por voz, corrígelos. Notas: "${journalContent}"`
      });
      if (response.text) {
        setJournalContent(response.text.trim());
      }
    } catch (error) {
      console.error("Gemini Error:", error);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const toggleStatus = (id: string) => {
    const act = activities.find(a => a.id === id);
    if (!act) return;
    const newStatus = act.status === ActivityStatus.DONE ? ActivityStatus.PENDING : ActivityStatus.DONE;
    db.updateActivity(id, { status: newStatus });
    refreshData();
  };

  const handleItinerarySubmit = (e: React.FormEvent) => {
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
    setShowItineraryModal(false);
  };

  const itineraryGrouped = activities.reduce((acc: any, act) => {
    if (!acc[act.date]) acc[act.date] = [];
    acc[act.date].push(act);
    return acc;
  }, {});

  const getUserName = (id: string) => members.find(m => m.id === id)?.name || '...';

  // Generar lista de días del viaje para el diario
  const getTripDays = () => {
    if (!trip) return [];
    const start = new Date(trip.start_date);
    const end = new Date(trip.end_date);
    const days = [];
    let current = new Date(start);
    while (current <= end) {
      days.push(new Date(current).toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return days;
  };

  return (
    <div className="p-4 pb-24 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6 pt-2">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Plan de Viaje</h2>
          <div className="flex items-center gap-4 mt-2">
            <button 
              onClick={() => setActiveTab('itinerary')}
              className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${activeTab === 'itinerary' ? 'bg-amber-100 text-amber-700' : 'text-slate-400'}`}
            >
              <CalendarIcon size={12} /> Itinerario
            </button>
            <button 
              onClick={() => setActiveTab('journal')}
              className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${activeTab === 'journal' ? 'bg-amber-100 text-amber-700' : 'text-slate-400'}`}
            >
              <BookOpen size={12} /> Diario
            </button>
          </div>
        </div>
        {activeTab === 'itinerary' && (
          <button onClick={() => { setEditingAct(null); setShowItineraryModal(true); }} className="bg-amber-500 text-white w-12 h-12 rounded-2xl shadow-xl shadow-amber-100 flex items-center justify-center active:scale-90 transition-transform">
            <Plus size={28} />
          </button>
        )}
      </div>

      <div className="flex-1">
        {activeTab === 'itinerary' ? (
          <div className="space-y-10">
            {Object.keys(itineraryGrouped).length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-200 mb-4">
                  <MapPin size={40} />
                </div>
                <p className="text-slate-400 font-bold text-sm">Organiza tu aventura aquí</p>
              </div>
            ) : (
              Object.entries(itineraryGrouped).map(([date, items]: [string, any]) => (
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
                            <button onClick={() => {
                              setEditingAct(act);
                              setNewAct({ title: act.title, date: act.date, time: act.time || '', description: act.description || '', participants: act.participants || [] });
                              setShowItineraryModal(true);
                            }} className="text-slate-300 ml-2 hover:text-amber-500 transition-colors">
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
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="animate-in fade-in duration-500 space-y-8">
            {/* Lista de entradas de diario por día */}
            <div className="space-y-6">
              {getTripDays().map((dayDate, index) => {
                const entry = journalEntries.find(e => e.date === dayDate && e.user_id === db.getCurrentUser()?.id);
                return (
                  <div key={dayDate} className="relative">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white font-black text-[10px]">
                        {index + 1}
                      </div>
                      <h3 className="text-[10px] font-black text-amber-600 uppercase tracking-widest">
                        {new Date(dayDate).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
                      </h3>
                    </div>
                    
                    <button 
                      onClick={() => openJournalEditor(dayDate)}
                      className="w-full text-left bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:border-amber-200 transition-all group"
                    >
                      {entry ? (
                        <div className="space-y-3">
                          <p className="text-sm text-slate-600 leading-relaxed line-clamp-3 font-medium">
                            {entry.content}
                          </p>
                          <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                            <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-1">
                              <History size={10}/> Última edición: {new Date(entry.created_at).toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'})}
                            </span>
                            <div className="flex items-center gap-2">
                              {entry.is_shared && <div className="text-[8px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-black uppercase">Compartido</div>}
                              <PenLine size={14} className="text-slate-300 group-hover:text-amber-500 transition-colors" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between py-2">
                          <p className="text-xs text-slate-400 font-bold italic">Aún no has escrito tus vivencias de este día...</p>
                          <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-amber-50 group-hover:text-amber-500 transition-all">
                            <Plus size={18} />
                          </div>
                        </div>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Vivencias Compartidas Feed */}
            <div className="pt-6 border-t border-slate-100 space-y-4">
              <div className="flex items-center gap-2 px-2">
                <Users size={16} className="text-indigo-500" />
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Vivencias de tus Compañeros</h4>
              </div>
              
              {journalEntries.filter(e => e.is_shared && e.user_id !== db.getCurrentUser()?.id).length === 0 ? (
                <div className="bg-slate-50 rounded-3xl p-8 text-center">
                  <p className="text-[10px] font-bold text-slate-400 italic uppercase">Tus amigos aún no han compartido vivencias.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {journalEntries.filter(e => e.is_shared && e.user_id !== db.getCurrentUser()?.id).map(entry => (
                    <div key={entry.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-500 to-indigo-700 flex items-center justify-center text-xs font-black text-white shadow-lg shadow-indigo-100">
                            {getUserName(entry.user_id).charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-800 leading-none">{getUserName(entry.user_id)}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">{new Date(entry.date).toLocaleDateString('es-ES', {day: 'numeric', month: 'short'})}</p>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed font-medium italic">
                        "{entry.content}"
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Journal Editor Modal */}
      {showJournalEditor && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[150] flex items-end justify-center p-0">
          <div className="bg-white w-full max-w-md rounded-t-[40px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 h-[92vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Mi Diario</h3>
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mt-1">
                  {new Date(editingEntryDate).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
              <button onClick={() => { if(isListening) recognitionRef.current?.stop(); setShowJournalEditor(false); }} className="p-2 bg-slate-100 rounded-full text-slate-400 active:scale-90 transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 flex flex-col min-h-0 space-y-4">
              <div className="flex items-center justify-end gap-2">
                <button 
                  onClick={refineWithAi}
                  disabled={isAiProcessing || !journalContent.trim()}
                  className="px-4 py-2 rounded-xl bg-violet-100 text-violet-700 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50"
                >
                  {isAiProcessing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  Mejorar con IA
                </button>
                <button 
                  onClick={toggleMic}
                  className={`px-4 py-2 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all ${isListening ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-100 text-slate-600'}`}
                >
                  {isListening ? <MicOff size={14} /> : <Mic size={14} />}
                  {isListening ? 'Parar Dictado' : 'Dictar Voz'}
                </button>
              </div>

              <div className="flex-1 relative bg-amber-50/30 rounded-[32px] border border-amber-100/50 p-6 overflow-hidden flex flex-col">
                <textarea 
                  value={journalContent}
                  onChange={e => setJournalContent(e.target.value)}
                  placeholder="Escribe o dicta lo que viviste hoy..."
                  className="w-full flex-1 bg-transparent outline-none font-medium text-slate-700 leading-relaxed resize-none text-base"
                  style={{ backgroundImage: 'linear-gradient(transparent, transparent 29px, #fbbf2444 30px)', backgroundSize: '100% 30px', lineHeight: '30px' }}
                />
                
                {transcript && (
                  <div className="mt-4 p-3 bg-white/60 rounded-2xl border border-rose-200 animate-pulse">
                    <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                      <Mic size={10}/> Capturando voz:
                    </p>
                    <p className="text-xs text-slate-500 italic">"{transcript}..."</p>
                  </div>
                )}
              </div>

              <div className="pt-2 space-y-4">
                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                      <Users size={16}/>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-800 uppercase leading-none">Compartir con el grupo</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Los demás verán tu entrada</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsShared(!isShared)}
                    className={`w-12 h-6 rounded-full transition-all relative ${isShared ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isShared ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                <button 
                  onClick={handleJournalSave}
                  className="w-full bg-amber-500 text-white py-5 rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-amber-100 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Save size={18} /> Guardar Vivencia
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Itinerary Modal */}
      {showItineraryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-end justify-center p-0">
          <div className="bg-white w-full max-w-md rounded-t-[40px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">{editingAct ? 'Editar Actividad' : 'Planificar Actividad'}</h3>
              <button onClick={() => setShowItineraryModal(false)} className="p-2 bg-slate-50 rounded-full text-slate-400">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleItinerarySubmit} className="space-y-6 pb-8">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Título</label>
                <input value={newAct.title} onChange={e => setNewAct({...newAct, title: e.target.value})} placeholder="Ej: Tour por la Sagrada Familia" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-amber-500 font-bold" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Fecha</label>
                  <input type="date" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm" value={newAct.date} onChange={e => setNewAct({...newAct, date: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Hora</label>
                  <input type="time" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm" value={newAct.time} onChange={e => setNewAct({...newAct, time: e.target.value})} />
                </div>
              </div>
              <button className="w-full bg-amber-500 text-white py-5 rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-lg">Guardar Plan</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivitiesView;
