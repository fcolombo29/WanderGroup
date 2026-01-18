
import React, { useState, useEffect } from 'react';
import { db } from '../services/database';
import { Trip, User, Expense } from '../types';
import { Users, Receipt, Map as MapIcon, Calendar, ArrowUpRight, ArrowDownLeft, Wallet, UserPlus, Link, Copy, Check, Edit3, X } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { ViewType } from '../App';

interface TripDashboardProps {
  tripId: string;
  onNavigate: (view: ViewType) => void;
}

const TripDashboard: React.FC<TripDashboardProps> = ({ tripId, onNavigate }) => {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [copied, setCopied] = useState(false);
  const [editingMember, setEditingMember] = useState<User | null>(null);

  useEffect(() => {
    setTrip(db.getTripById(tripId) || null);
    setMembers(db.getTripMembers(tripId));
    setExpenses(db.getExpenses(tripId));
  }, [tripId]);

  if (!trip) return <div className="p-8 text-center text-slate-500">Cargando viaje...</div>;

  const user = db.getCurrentUser();
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  
  // Balance calculation
  let userPaid = 0;
  let userOwes = 0;
  expenses.forEach(exp => {
    if (exp.payer_id === user?.id) userPaid += exp.amount;
    if (exp.participants.includes(user?.id || '')) {
      userOwes += exp.amount / exp.participants.length;
    }
  });

  const netBalance = userPaid - userOwes;

  // Group by category for chart
  const categories = expenses.reduce((acc: any, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});

  const chartData = Object.entries(categories).map(([name, value]) => ({ name, value }));
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    const newM = db.addTripMember(tripId, newMemberName);
    setMembers([...members, newM]);
    setNewMemberName('');
  };

  const handleUpdateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMember && editingMember.name.trim()) {
      db.updateTripMember(editingMember.id, { name: editingMember.name });
      setMembers(members.map(m => m.id === editingMember.id ? editingMember : m));
      setEditingMember(null);
    }
  };

  const copyInviteLink = () => {
    const mockLink = `https://wandergroup.app/invite/${trip.id}`;
    navigator.clipboard.writeText(mockLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 space-y-6">
      {/* Welcome & Stats */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl p-6 text-white shadow-2xl shadow-indigo-200">
        <h2 className="text-indigo-100 text-[10px] font-bold uppercase tracking-[0.2em]">Balance del Grupo</h2>
        <div className="flex items-end justify-between mt-1">
          <span className="text-4xl font-black tracking-tight">${totalSpent.toLocaleString()}</span>
          <div className="bg-white/10 px-3 py-1.5 rounded-full text-[10px] font-black uppercase border border-white/20">Total Acumulado</div>
        </div>
        
        <div className="mt-8 grid grid-cols-2 gap-4">
          <div className={`bg-white/10 backdrop-blur-md rounded-2xl p-4 border ${netBalance >= 0 ? 'border-emerald-500/30' : 'border-white/10'}`}>
            <div className="flex items-center gap-2 mb-1.5">
              <div className={`p-1 rounded-lg ${netBalance >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/20 text-white'}`}>
                <ArrowUpRight size={14} />
              </div>
              <span className="text-[10px] font-bold text-indigo-100 uppercase tracking-wider">{netBalance >= 0 ? 'Te deben' : 'Saldo'}</span>
            </div>
            <span className={`text-xl font-black ${netBalance >= 0 ? 'text-emerald-300' : 'text-white'}`}>
              ${Math.abs(netBalance).toLocaleString()}
            </span>
          </div>
          <div className={`bg-white/10 backdrop-blur-md rounded-2xl p-4 border ${netBalance < 0 ? 'border-rose-500/30' : 'border-white/10'}`}>
            <div className="flex items-center gap-2 mb-1.5">
              <div className={`p-1 rounded-lg ${netBalance < 0 ? 'bg-rose-500/20 text-rose-300' : 'bg-white/20 text-white'}`}>
                <ArrowDownLeft size={14} />
              </div>
              <span className="text-[10px] font-bold text-indigo-100 uppercase tracking-wider">{netBalance < 0 ? 'Debes' : 'Tu Gasto'}</span>
            </div>
            <span className={`text-xl font-black ${netBalance < 0 ? 'text-rose-300' : 'text-white'}`}>
              ${(netBalance < 0 ? Math.abs(netBalance) : userOwes).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-3 px-1">
        {[
          { icon: <Receipt size={22} />, label: 'Gastos', color: 'bg-emerald-50 text-emerald-600', view: 'expenses' as ViewType },
          { icon: <MapIcon size={22} />, label: 'Mapa', color: 'bg-blue-50 text-blue-600', view: 'maps' as ViewType },
          { icon: <Calendar size={22} />, label: 'Plan', color: 'bg-amber-50 text-amber-600', view: 'activities' as ViewType },
          { icon: <Users size={22} />, label: 'Documentos', color: 'bg-purple-50 text-purple-600', view: 'documents' as ViewType },
        ].map((action, i) => (
          <button 
            key={i} 
            onClick={() => onNavigate(action.view)}
            className="flex flex-col items-center gap-2 active:scale-90 transition-transform"
          >
            <div className={`w-14 h-14 rounded-2xl ${action.color} flex items-center justify-center shadow-sm`}>
              {action.icon}
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Expense Summary Chart */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
        <h3 className="font-black text-slate-800 text-sm mb-4 flex items-center gap-2 uppercase tracking-wide">
          <Wallet size={16} className="text-indigo-500" />
          Gastos por Categoría
        </h3>
        {chartData.length > 0 ? (
          <>
            <div className="h-48 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                <span className="text-xs text-slate-400 font-bold uppercase">Categorías</span>
                <span className="text-lg font-black text-slate-800">{chartData.length}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              {chartData.map((entry, index) => (
                <div key={index} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100/50">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase leading-none">{entry.name}</span>
                    <span className="text-xs font-black text-slate-700">${entry.value.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="h-32 flex items-center justify-center text-slate-300 text-xs font-bold italic text-center">
            Sin gastos registrados todavía.<br/>¡Empieza a repartir!
          </div>
        )}
      </div>

      {/* Members Section */}
      <div className="pb-4">
        <h3 className="font-black text-slate-800 text-sm mb-4 flex items-center gap-2 uppercase tracking-wide">
          Compañeros de Viaje
        </h3>
        <div className="flex flex-wrap gap-4">
          {members.map(member => (
            <div key={member.id} className="flex flex-col items-center gap-1.5 group">
              <div 
                onClick={() => member.id !== user?.id && setEditingMember(member)}
                className="h-14 w-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 border-2 border-white shadow-sm flex items-center justify-center font-black text-slate-500 text-lg relative cursor-pointer active:scale-90 transition-transform"
              >
                {member.name.charAt(0)}
                {member.id === user?.id && <div className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 border-2 border-white rounded-full"></div>}
                <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/10 rounded-2xl transition-colors"></div>
              </div>
              <span className="text-[10px] font-bold text-slate-500 truncate w-14 text-center">{member.name.split(' ')[0]}</span>
            </div>
          ))}
          <button 
            onClick={() => setShowAddMember(true)}
            className="flex flex-col items-center gap-1.5 active:scale-95 transition-all"
          >
            <div className="h-14 w-14 rounded-2xl bg-white border-2 border-dashed border-indigo-200 flex items-center justify-center text-indigo-400 shadow-sm">
              <UserPlus size={24} />
            </div>
            <span className="text-[10px] font-bold text-indigo-400 uppercase">Invitar</span>
          </button>
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full rounded-[40px] p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-slate-800">Invitar Amigos</h3>
              <button onClick={() => setShowAddMember(false)} className="p-2 bg-slate-50 rounded-full text-slate-400">
                <Check size={20} />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
                <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3 block">Compartir Enlace</label>
                <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-indigo-100">
                  <Link size={16} className="text-indigo-400" />
                  <span className="flex-1 text-xs text-slate-500 font-bold truncate">wandergroup.app/invite/{trip.id}</span>
                  <button 
                    onClick={copyInviteLink}
                    className={`p-2 rounded-xl transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'}`}
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
                {copied && <p className="text-[9px] font-bold text-emerald-600 mt-2 uppercase text-center animate-bounce">¡Copiado al portapapeles!</p>}
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-white text-slate-300 font-bold uppercase tracking-widest">o añadir manualmente</span>
                </div>
              </div>

              <form onSubmit={handleAddMember} className="space-y-4">
                <input 
                  value={newMemberName}
                  onChange={e => setNewMemberName(e.target.value)}
                  placeholder="Nombre del amigo"
                  className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                  autoFocus
                />
                <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-indigo-100 uppercase text-xs tracking-widest flex items-center justify-center gap-2">
                  <UserPlus size={16} />
                  Añadir al Grupo
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {editingMember && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full rounded-[40px] p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-slate-800">Editar Amigo</h3>
              <button onClick={() => setEditingMember(null)} className="p-2 bg-slate-50 rounded-full text-slate-400">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdateMember} className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Nombre</label>
                <input 
                  value={editingMember.name}
                  onChange={e => setEditingMember({...editingMember, name: e.target.value})}
                  className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                  autoFocus
                />
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest">
                Guardar Cambios
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripDashboard;
