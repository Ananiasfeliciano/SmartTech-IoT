import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Plus, Search, AlertCircle, CheckCircle2, FileText, X, User, ShieldAlert, Clock, Filter, Trash2 } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, orderBy, addDoc, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';

interface Diagnostic {
  id: string;
  clientId: string;
  clientName: string;
  problemType: string;
  date: string;
  description: string;
  equipment: string;
  solution: string;
  observations: string;
  status: 'solved' | 'pending';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface Client {
  id: string;
  name: string;
}

export default function Diagnostics() {
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'solved'>('all');
  
  const [newDiag, setNewDiag] = useState<Partial<Diagnostic>>({
    status: 'pending',
    severity: 'medium',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    // Fetch clients
    const fetchClients = async () => {
      const snapshot = await getDocs(collection(db, 'clients'));
      setClients(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
    };
    fetchClients();

    const q = query(collection(db, 'diagnostics'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setDiagnostics(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Diagnostic[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'diagnostics');
    });
    return () => unsubscribe();
  }, []);

  const handleAddDiagnostic = async (e: React.FormEvent) => {
    e.preventDefault();
    const client = clients.find(c => c.id === newDiag.clientId);
    try {
      await addDoc(collection(db, 'diagnostics'), {
        ...newDiag,
        clientName: client?.name || 'Desconhecido',
        createdAt: new Date().toISOString()
      });
      setIsModalOpen(false);
      setNewDiag({ status: 'pending', severity: 'medium', date: new Date().toISOString().split('T')[0] });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'diagnostics');
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    try {
      await updateDoc(doc(db, 'diagnostics', id), {
        status: currentStatus === 'solved' ? 'pending' : 'solved'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'diagnostics');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este diagnóstico?')) return;
    try {
      await deleteDoc(doc(db, 'diagnostics', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'diagnostics');
    }
  };

  const filteredDiagnostics = diagnostics.filter(diag => {
    const matchesSearch = 
      diag.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      diag.problemType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      diag.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || diag.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'high': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      default: return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Diagnóstico de Rede</h1>
          <p className="text-white/50">Relatórios técnicos de problemas, severidade e soluções.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-tech-blue text-white px-6 py-3 rounded-xl font-bold hover:bg-tech-blue/90 transition-all shadow-lg shadow-tech-blue/20"
        >
          <Plus className="w-5 h-5" />
          Novo Diagnóstico
        </button>
      </header>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
          <input
            type="text"
            placeholder="Buscar por cliente, problema ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-tech-gray border border-white/10 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-tech-blue/50 transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'pending', 'solved'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all border ${
                filterStatus === status 
                  ? 'bg-tech-blue/20 border-tech-blue text-tech-blue' 
                  : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60'
              }`}
            >
              {status === 'all' ? 'Todos' : status === 'pending' ? 'Pendentes' : 'Resolvidos'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filteredDiagnostics.length === 0 ? (
          <div className="py-20 text-center bg-tech-gray rounded-2xl border border-dashed border-white/10">
            <Activity className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/30">Nenhum diagnóstico encontrado.</p>
          </div>
        ) : (
          filteredDiagnostics.map((diag) => (
            <motion.div
              key={diag.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-tech-gray p-8 rounded-2xl border border-white/10 shadow-xl hover:border-white/20 transition-all group"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${diag.status === 'solved' ? 'bg-tech-green/10 text-tech-green' : 'bg-red-400/10 text-red-400'}`}>
                    {diag.status === 'solved' ? <CheckCircle2 className="w-10 h-10" /> : <AlertCircle className="w-10 h-10" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-2xl font-bold">{diag.problemType}</h3>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${getSeverityColor(diag.severity)}`}>
                        {diag.severity}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-white/40 text-sm">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        <span className="text-tech-blue font-medium">{diag.clientName}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{new Date(diag.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleToggleStatus(diag.id, diag.status)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all border ${
                      diag.status === 'solved' 
                        ? 'bg-tech-green/10 text-tech-green border-tech-green/20 hover:bg-tech-green/20' 
                        : 'bg-red-400/10 text-red-400 border-red-400/20 hover:bg-red-400/20'
                    }`}
                  >
                    {diag.status === 'solved' ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    {diag.status === 'solved' ? 'Resolvido' : 'Marcar como Resolvido'}
                  </button>
                  <button 
                    onClick={() => handleDelete(diag.id)}
                    className="p-3 bg-white/5 text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                      <ShieldAlert className="w-3 h-3" />
                      Análise do Problema
                    </h4>
                    <p className="text-white/80 leading-relaxed text-lg">{diag.description}</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                    <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-2">Infraestrutura Afetada</h4>
                    <p className="text-white/60 font-mono text-sm">{diag.equipment}</p>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div className="bg-tech-green/5 p-6 rounded-2xl border border-tech-green/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                      <CheckCircle2 className="w-20 h-20 text-tech-green" />
                    </div>
                    <h4 className="text-[10px] font-black text-tech-green uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                      <FileText className="w-3 h-3" />
                      Protocolo de Solução
                    </h4>
                    <p className="text-white/80 leading-relaxed italic">
                      {diag.status === 'solved' ? diag.solution : 'Aguardando execução técnica...'}
                    </p>
                  </div>
                  {diag.observations && (
                    <div>
                      <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-2">Notas de Campo</h4>
                      <p className="text-white/40 text-sm italic">"{diag.observations}"</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Modal Novo Diagnóstico */}
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
              className="relative w-full max-w-4xl bg-tech-gray rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-tech-blue/20 flex items-center justify-center text-tech-blue">
                    <Plus className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-bold">Novo Relatório de Diagnóstico</h2>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddDiagnostic} className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase tracking-wider">Cliente</label>
                    <select
                      required
                      value={newDiag.clientId || ''}
                      onChange={(e) => setNewDiag({ ...newDiag, clientId: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-tech-blue/50"
                    >
                      <option value="">Selecione um cliente</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase tracking-wider">Tipo de Problema</label>
                    <input
                      required
                      type="text"
                      value={newDiag.problemType || ''}
                      onChange={(e) => setNewDiag({ ...newDiag, problemType: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-tech-blue/50"
                      placeholder="Ex: Lentidão na Rede Wi-Fi"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase tracking-wider">Data</label>
                    <input
                      required
                      type="date"
                      value={newDiag.date || ''}
                      onChange={(e) => setNewDiag({ ...newDiag, date: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-tech-blue/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase tracking-wider">Severidade</label>
                    <select
                      value={newDiag.severity || 'medium'}
                      onChange={(e) => setNewDiag({ ...newDiag, severity: e.target.value as any })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-tech-blue/50"
                    >
                      <option value="low">Baixa</option>
                      <option value="medium">Média</option>
                      <option value="high">Alta</option>
                      <option value="critical">Crítica</option>
                    </select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-bold text-white/40 uppercase tracking-wider">Equipamentos Envolvidos</label>
                    <input
                      required
                      type="text"
                      value={newDiag.equipment || ''}
                      onChange={(e) => setNewDiag({ ...newDiag, equipment: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-tech-blue/50"
                      placeholder="Ex: Roteador TP-Link AX50, Switch Gigabit"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-3">
                    <label className="text-xs font-bold text-white/40 uppercase tracking-wider">Descrição Detalhada</label>
                    <textarea
                      required
                      rows={3}
                      value={newDiag.description || ''}
                      onChange={(e) => setNewDiag({ ...newDiag, description: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-tech-blue/50 resize-none"
                      placeholder="Descreva o comportamento do problema..."
                    />
                  </div>

                  <div className="space-y-2 md:col-span-3">
                    <label className="text-xs font-bold text-white/40 uppercase tracking-wider">Solução Aplicada</label>
                    <textarea
                      rows={3}
                      value={newDiag.solution || ''}
                      onChange={(e) => setNewDiag({ ...newDiag, solution: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-tech-blue/50 resize-none"
                      placeholder="Quais passos foram tomados para resolver?"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-3">
                    <label className="text-xs font-bold text-white/40 uppercase tracking-wider">Observações Técnicas</label>
                    <input
                      type="text"
                      value={newDiag.observations || ''}
                      onChange={(e) => setNewDiag({ ...newDiag, observations: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-tech-blue/50"
                      placeholder="Notas adicionais para referência futura..."
                    />
                  </div>
                </div>

                <div className="pt-8 border-t border-white/10 flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-8 py-4 rounded-xl font-bold hover:bg-white/5 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-tech-blue text-white px-10 py-4 rounded-xl font-bold hover:bg-tech-blue/90 transition-all shadow-lg shadow-tech-blue/20"
                  >
                    Salvar Diagnóstico
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
