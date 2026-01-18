
import React, { useState, useEffect } from 'react';
import { db } from '../services/database';
import { Expense, User, Payment } from '../types';
import { Plus, Tag, Calendar, User as UserIcon, MoreVertical, CreditCard, X, Trash2, Edit2, Check } from 'lucide-react';

interface ExpensesViewProps {
  tripId: string;
}

const ExpensesView: React.FC<ExpensesViewProps> = ({ tripId }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showSettlement, setShowSettlement] = useState(false);
  const [settlementResult, setSettlementResult] = useState<{from: string, to: string, amount: number}[]>([]);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const [newExpense, setNewExpense] = useState({
    amount: '',
    description: '',
    category: 'Comida',
    payer_id: '',
    participants: [] as string[]
  });

  useEffect(() => {
    refreshData();
    const tripMembers = db.getTripMembers(tripId);
    setMembers(tripMembers);
    const user = db.getCurrentUser();
    if (user) {
      setNewExpense(prev => ({ ...prev, payer_id: user.id, participants: tripMembers.map(m => m.id) }));
    }
  }, [tripId]);

  const refreshData = () => {
    setExpenses(db.getExpenses(tripId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.amount || !newExpense.description) return;

    const data = {
      trip_id: tripId,
      amount: parseFloat(newExpense.amount),
      description: newExpense.description,
      category: newExpense.category,
      payer_id: newExpense.payer_id,
      date: new Date().toISOString().split('T')[0],
      participants: newExpense.participants
    };

    if (editingId) {
      db.updateExpense(editingId, data);
    } else {
      db.addExpense(data);
    }

    refreshData();
    closeModal();
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingId(null);
    setNewExpense({
      amount: '',
      description: '',
      category: 'Comida',
      payer_id: db.getCurrentUser()?.id || '',
      participants: members.map(m => m.id)
    });
  };

  const openEdit = (exp: Expense) => {
    setEditingId(exp.id);
    setNewExpense({
      amount: exp.amount.toString(),
      description: exp.description,
      category: exp.category,
      payer_id: exp.payer_id,
      participants: exp.participants
    });
    setShowAddModal(true);
    setMenuOpenId(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Eliminar este gasto?')) {
      db.deleteExpense(id);
      refreshData();
      setMenuOpenId(null);
    }
  };

  const calculateSettlement = () => {
    // 1. Calculate how much each person paid and how much they owe
    const balances: Record<string, number> = {};
    members.forEach(m => balances[m.id] = 0);

    expenses.forEach(exp => {
      // Payer gets positive balance (credited)
      balances[exp.payer_id] += exp.amount;
      // Each participant owes their share (debited)
      const share = exp.amount / exp.participants.length;
      exp.participants.forEach(pid => {
        balances[pid] -= share;
      });
    });

    // 2. Separate creditors and debtors
    let debtors = Object.entries(balances)
      .filter(([_, bal]) => bal < -0.01)
      .map(([id, bal]) => ({ id, balance: -bal }))
      .sort((a, b) => b.balance - a.balance);

    let creditors = Object.entries(balances)
      .filter(([_, bal]) => bal > 0.01)
      .map(([id, bal]) => ({ id, balance: bal }))
      .sort((a, b) => b.balance - a.balance);

    // 3. Match them up
    const transactions: {from: string, to: string, amount: number}[] = [];
    let dIdx = 0, cIdx = 0;

    while(dIdx < debtors.length && cIdx < creditors.length) {
      const debtor = debtors[dIdx];
      const creditor = creditors[cIdx];
      const amount = Math.min(debtor.balance, creditor.balance);

      transactions.push({ from: debtor.id, to: creditor.id, amount });
      
      debtor.balance -= amount;
      creditor.balance -= amount;

      if(debtor.balance < 0.01) dIdx++;
      if(creditor.balance < 0.01) cIdx++;
    }

    setSettlementResult(transactions);
    setShowSettlement(true);
  };

  const getUserName = (id: string) => members.find(m => m.id === id)?.name || 'Desconocido';

  return (
    <div className="p-4 relative min-h-full pb-32">
      <div className="flex justify-between items-center mb-8 pt-2">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Gastos del Grupo</h2>
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-1">Viaje Compartido</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-emerald-600 text-white w-12 h-12 rounded-2xl shadow-xl shadow-emerald-100 flex items-center justify-center active:scale-90 transition-transform"
        >
          <Plus size={28} />
        </button>
      </div>

      <div className="space-y-4">
        {expenses.length === 0 ? (
          <div className="text-center py-20">
             <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-200 mb-4">
                <CreditCard size={40} />
             </div>
             <p className="text-slate-400 font-bold text-sm">No hay gastos todavía</p>
          </div>
        ) : (
          expenses.map(exp => (
            <div key={exp.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative group animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex justify-between items-start">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                    <Tag size={24} />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 leading-tight">{exp.description}</h4>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                      <span className="flex items-center gap-1 text-emerald-600"><UserIcon size={10}/> {getUserName(exp.payer_id)}</span>
                      <span>•</span>
                      <span>{exp.category}</span>
                      <span>•</span>
                      <span>{exp.date}</span>
                    </div>
                    <div className="mt-3 flex -space-x-2">
                      {exp.participants.map(pid => (
                        <div key={pid} className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white text-[8px] flex items-center justify-center font-black text-slate-500 shadow-sm" title={getUserName(pid)}>
                          {getUserName(pid).charAt(0)}
                        </div>
                      ))}
                      <div className="w-6 h-6 rounded-full bg-emerald-50 border-2 border-white text-[8px] flex items-center justify-center font-black text-emerald-600 shadow-sm">
                        +{exp.participants.length}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end">
                  <div className="font-black text-slate-800 text-xl tracking-tight">${exp.amount.toLocaleString('es-AR')}</div>
                  <button 
                    onClick={() => setMenuOpenId(menuOpenId === exp.id ? null : exp.id)}
                    className="p-2 text-slate-300 hover:text-slate-600 transition-colors mt-1"
                  >
                    <MoreVertical size={20}/>
                  </button>
                  {menuOpenId === exp.id && (
                    <div className="absolute top-12 right-4 bg-white shadow-2xl rounded-2xl border border-slate-100 py-2 z-20 w-32 animate-in fade-in slide-in-from-top-1">
                      <button onClick={() => openEdit(exp)} className="w-full px-4 py-2 text-left text-xs font-bold flex items-center gap-2 text-slate-600 hover:bg-slate-50">
                        <Edit2 size={14}/> Editar
                      </button>
                      <button onClick={() => handleDelete(exp.id)} className="w-full px-4 py-2 text-left text-xs font-bold flex items-center gap-2 text-rose-500 hover:bg-rose-50">
                        <Trash2 size={14}/> Eliminar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Settlement Section */}
      <div className="mt-10 bg-gradient-to-br from-emerald-600 to-emerald-800 p-6 rounded-[32px] text-white shadow-2xl shadow-emerald-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
        <h3 className="font-black text-white text-base mb-2 flex items-center gap-2 uppercase tracking-widest">
          <CreditCard size={18}/> Liquidación Provisional
        </h3>
        <p className="text-[10px] text-emerald-100 mb-6 font-bold leading-relaxed opacity-80 uppercase tracking-tighter">
          Calculamos quién debe pagar a quién para minimizar transferencias bancarias.
        </p>
        <button 
          onClick={calculateSettlement}
          className="w-full bg-white text-emerald-700 py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
        >
          Ver Cuentas del Grupo
        </button>
      </div>

      {/* Settlement Modal */}
      {showSettlement && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-end justify-center">
          <div className="bg-white w-full max-w-md rounded-t-[40px] p-8 pb-12 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Saldar Cuentas</h3>
              <button onClick={() => setShowSettlement(false)} className="p-2 bg-slate-100 rounded-full text-slate-400">
                <X size={20} />
              </button>
            </div>
            
            {settlementResult.length === 0 ? (
              <p className="text-center py-10 font-bold text-slate-400">Todo el grupo está al día. ¡Sin deudas!</p>
            ) : (
              <div className="space-y-4">
                {settlementResult.map((res, i) => (
                  <div key={i} className="flex items-center justify-between bg-emerald-50/50 p-4 rounded-3xl border border-emerald-100/50">
                    <div className="flex items-center gap-3">
                       <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-400 uppercase">Debedor</span>
                          <span className="text-sm font-black text-slate-800">{getUserName(res.from)}</span>
                       </div>
                       <div className="px-2 text-emerald-400">➔</div>
                       <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-400 uppercase">Recibe</span>
                          <span className="text-sm font-black text-slate-800">{getUserName(res.to)}</span>
                       </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-emerald-600 block leading-none mb-1">PAGA</span>
                      <span className="text-lg font-black text-slate-800 tracking-tight">${res.amount.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <button 
              onClick={() => setShowSettlement(false)}
              className="w-full bg-slate-800 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest mt-8"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[120] flex items-end justify-center p-0">
          <div className="bg-white w-full max-w-md rounded-t-[40px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">{editingId ? 'Editar Gasto' : 'Nuevo Gasto'}</h3>
              <button onClick={closeModal} className="p-2 bg-slate-50 rounded-full text-slate-400">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveExpense} className="space-y-6">
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Monto Total</label>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-black text-slate-300">$</span>
                  <input 
                    type="number" 
                    value={newExpense.amount}
                    onChange={e => setNewExpense({...newExpense, amount: e.target.value})}
                    className="w-full text-4xl font-black text-slate-800 bg-transparent outline-none py-1 placeholder:text-slate-200"
                    placeholder="0"
                    autoFocus
                  />
                </div>
              </div>
              
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">¿Qué se pagó?</label>
                <input 
                  type="text" 
                  value={newExpense.description}
                  onChange={e => setNewExpense({...newExpense, description: e.target.value})}
                  className="w-full py-4 px-6 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  placeholder="Ej: Gasolina, Supermercado, Museo..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Categoría</label>
                  <select 
                    value={newExpense.category}
                    onChange={e => setNewExpense({...newExpense, category: e.target.value})}
                    className="w-full py-4 px-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm outline-none"
                  >
                    <option>Comida</option>
                    <option>Transporte</option>
                    <option>Ocio</option>
                    <option>Alojamiento</option>
                    <option>Otro</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Pagador</label>
                  <select 
                    value={newExpense.payer_id}
                    onChange={e => setNewExpense({...newExpense, payer_id: e.target.value})}
                    className="w-full py-4 px-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm outline-none"
                  >
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">¿Quiénes participaron?</label>
                <div className="flex flex-wrap gap-2">
                  {members.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        const next = newExpense.participants.includes(m.id)
                          ? newExpense.participants.filter(id => id !== m.id)
                          : [...newExpense.participants, m.id];
                        setNewExpense({...newExpense, participants: next});
                      }}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border ${newExpense.participants.includes(m.id) ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>

              <button className="w-full bg-emerald-600 text-white py-5 rounded-3xl font-black shadow-2xl shadow-emerald-100 uppercase text-xs tracking-[0.2em] active:scale-95 transition-all mt-4">
                {editingId ? 'Guardar Cambios' : 'Registrar Gasto'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpensesView;
