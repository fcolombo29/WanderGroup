
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { db } from '../services/database';
import { Trip } from '../types';
import { Sparkles, Send, Bot, Loader2, Plus, User as UserIcon } from 'lucide-react';

interface AIViewProps {
  tripId: string;
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

const AIView: React.FC<AIViewProps> = ({ tripId }) => {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTrip(db.getTripById(tripId) || null);
    setMessages([{ 
      role: 'model', 
      text: `¡Hola! Soy WanderBot. Estoy listo para ayudarte con tu viaje a ${db.getTripById(tripId)?.destination}. ¿Qué quieres saber?` 
    }]);
  }, [tripId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          { role: 'user', parts: [{ text: `Actúa como un experto asesor de viajes. El usuario está planeando un viaje llamado "${trip?.name}" a "${trip?.destination}" del ${trip?.start_date} al ${trip?.end_date}. Responde a su pregunta: ${userMsg}` }] }
        ],
        config: {
          systemInstruction: "Eres WanderBot, un asistente de viajes experto, amigable y servicial. Ayuda al usuario con itinerarios, consejos de presupuesto, cultura local y logística de viaje.",
        }
      });
      
      const modelText = response.text || "Lo siento, no pude procesar eso. ¿Puedes intentar de nuevo?";
      setMessages(prev => [...prev, { role: 'model', text: modelText }]);
    } catch (error) {
      console.error("Gemini AI Error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "Hubo un error al conectar con mi cerebro de IA. Verifica tu conexión e inténtalo de nuevo." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-140px)]">
      <div className="p-4 flex items-center gap-3 border-b bg-white/50 backdrop-blur-md">
        <div className="w-10 h-10 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-violet-200">
          <Bot size={24} />
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight leading-none">WanderBot Chat</h2>
          <p className="text-[9px] font-black text-violet-600 uppercase tracking-widest mt-1">IA de Viaje Activa</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-3xl text-sm font-medium leading-relaxed shadow-sm ${
              msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-none' 
                : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-100 p-4 rounded-3xl rounded-tl-none shadow-sm flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-violet-600" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">WanderBot está pensando...</span>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <div className="p-4 bg-white border-t">
        <form onSubmit={sendMessage} className="relative">
          <input 
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Escribe tu pregunta..."
            className="w-full py-4 pl-6 pr-14 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:ring-2 focus:ring-violet-500 font-bold transition-all"
          />
          <button 
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-violet-600 text-white rounded-full flex items-center justify-center shadow-lg disabled:opacity-50 disabled:scale-90 transition-all active:scale-95"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AIView;
