import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DollarSign, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Filter, Plus, X } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, orderBy, addDoc } from 'firebase/firestore';

interface Transaction {
  id: string;
  description: string;
  value: number;
  type: 'income' | 'expense';
  date: string;
  paymentMethod: string;
  status: 'paid' | 'pending';
}

export default function Finance() {
  const [finances, setFinances] = useState<Transaction[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTransaction, setNewTransaction] = useState<Partial<Transaction>>({
    type: 'income',
    status: 'paid',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'Pix'
  });

  useEffect(() => {
    const q = query(collection(db, 'finances'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setFinances(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaction[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'finances');
    });
    return () => unsubscribe();
  }, []);

  const totals = finances.reduce((acc, curr) => {
    const val = Number(curr.value) || 0;
    if (curr.type === 'income') acc.income += val;
    else acc.expense += val;
    return acc;
  }, { income: 0, expense: 0 });

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'finances'), {
        ...newTransaction,
        value: Number(newTransaction.value) * (newTransaction.type === 'expense' ? -1 : 1),
        createdAt: new Date().toISOString()
      });
      setIsModalOpen(false);
      setNewTransaction({ type: 'income', status: 'paid', date: new Date().toISOString().split('T')[0], paymentMethod: 'Pix' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'finances');
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Controle Financeiro</h1>
          <p className="text-white/50">Gestão de receitas, pagamentos e lucros.</p>
        </div>
        <div className="flex gap-4">
          <button className="px-6 py-3 rounded-xl bg-tech-gray border border-white/10 font-bold hover:bg-white/5 transition-colors">
            Exportar PDF
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-tech-green text-white px-6 py-3 rounded-xl font-bold hover:bg-tech-green/90 transition-all shadow-lg shadow-tech-green/20"
          >
            Nova Transação
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-tech-gray p-6 rounded-2xl border border-white/10 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-emerald-400/10 text-emerald-400">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <p className="text-white/50 text-sm font-medium">Receita Total</p>
          <h3 className="text-2xl font-bold mt-1 text-tech-green">R$ {totals.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
        </div>

        <div className="bg-tech-gray p-6 rounded-2xl border border-white/10 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-red-400/10 text-red-400">
              <TrendingDown className="w-6 h-6" />
            </div>
          </div>
          <p className="text-white/50 text-sm font-medium">Despesas Totais</p>
          <h3 className="text-2xl font-bold mt-1 text-red-400">R$ {Math.abs(totals.expense).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
        </div>

        <div className="bg-tech-gray p-6 rounded-2xl border border-white/10 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-tech-blue/10 text-tech-blue">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
          <p className="text-white/50 text-sm font-medium">Lucro Líquido</p>
          <h3 className="text-2xl font-bold mt-1">R$ {(totals.income + totals.expense).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
        </div>
      </div>

      <div className="bg-tech-gray rounded-2xl border border-white/10 overflow-hidden shadow-xl">
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
          <h3 className="font-bold">Transações Recentes</h3>
          <button className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors">
            <Filter className="w-4 h-4" />
            Filtrar
          </button>
        </div>
        <div className="divide-y divide-white/5">
          {finances.length === 0 ? (
            <div className="p-12 text-center text-white/20">
              Nenhuma transação registrada.
            </div>
          ) : (
            finances.map((item) => (
              <div key={item.id} className="p-6 flex items-center justify-between hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.value > 0 ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'}`}>
                    {item.value > 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="font-bold">{item.description || 'Transação'}</h4>
                    <p className="text-xs text-white/40">{new Date(item.date).toLocaleDateString()} • {item.paymentMethod}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${item.value > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {item.value > 0 ? '+' : ''} R$ {Math.abs(item.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${item.status === 'paid' ? 'bg-tech-green/10 text-tech-green' : 'bg-yellow-400/10 text-yellow-400'}`}>
                    {item.status === 'paid' ? 'Pago' : 'Pendente'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Nova Transação */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-tech-gray rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-xl font-bold">Nova Transação</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddTransaction} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/60">Tipo</label>
                    <select
                      value={newTransaction.type}
                      onChange={(e) => setNewTransaction({ ...newTransaction, type: e.target.value as any })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-tech-blue/50"
                    >
                      <option value="income">Receita (Entrada)</option>
                      <option value="expense">Despesa (Saída)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/60">Valor (R$)</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      value={newTransaction.value || ''}
                      onChange={(e) => setNewTransaction({ ...newTransaction, value: Number(e.target.value) })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-tech-blue/50"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-white/60">Descrição</label>
                    <input
                      required
                      type="text"
                      value={newTransaction.description || ''}
                      onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-tech-blue/50"
                      placeholder="Ex: Pagamento Serviço X ou Compra de Equipamento"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/60">Data</label>
                    <input
                      required
                      type="date"
                      value={newTransaction.date || ''}
                      onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-tech-blue/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/60">Método de Pagamento</label>
                    <select
                      value={newTransaction.paymentMethod}
                      onChange={(e) => setNewTransaction({ ...newTransaction, paymentMethod: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-tech-blue/50"
                    >
                      <option value="Pix">Pix</option>
                      <option value="Cartão de Crédito">Cartão de Crédito</option>
                      <option value="Boleto">Boleto</option>
                      <option value="Dinheiro">Dinheiro</option>
                    </select>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/10 flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3 rounded-xl font-bold hover:bg-white/5 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-tech-green text-white px-8 py-3 rounded-xl font-bold hover:bg-tech-green/90 transition-all shadow-lg shadow-tech-green/20"
                  >
                    Salvar Transação
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
