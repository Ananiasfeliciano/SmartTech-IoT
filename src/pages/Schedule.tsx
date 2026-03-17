import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar as CalendarIcon, Plus, Clock, User, MapPin, X, DollarSign, RefreshCw, LogOut } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, orderBy, addDoc, getDocs } from 'firebase/firestore';

interface ScheduleItem {
  id: string;
  clientId?: string;
  clientName: string;
  type: 'installation' | 'maintenance' | 'diagnostic' | 'google_event';
  date: string;
  notes: string;
  budgetValue?: number;
  status: 'scheduled' | 'completed' | 'cancelled';
  isGoogleEvent?: boolean;
}

interface Client {
  id: string;
  name: string;
}

export default function Schedule() {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [googleEvents, setGoogleEvents] = useState<ScheduleItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newSchedule, setNewSchedule] = useState<Partial<ScheduleItem>>({
    type: 'maintenance',
    status: 'scheduled',
    date: new Date().toISOString().slice(0, 16)
  });

  const checkGoogleStatus = async () => {
    try {
      const res = await fetch('/api/auth/google/status');
      const data = await res.json();
      setIsGoogleConnected(data.connected);
      if (data.connected) {
        fetchGoogleEvents();
      }
    } catch (error) {
      console.error('Error checking Google status:', error);
    }
  };

  const fetchGoogleEvents = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/calendar/events');
      if (res.ok) {
        const data = await res.json();
        const formattedEvents = data.map((event: any) => ({
          id: event.id,
          clientName: event.summary,
          type: 'google_event',
          date: event.start.dateTime || event.start.date,
          notes: event.description || '',
          status: 'scheduled',
          isGoogleEvent: true
        }));
        setGoogleEvents(formattedEvents);
      } else if (res.status === 401) {
        setIsGoogleConnected(false);
      }
    } catch (error) {
      console.error('Error fetching Google events:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGoogleConnect = async () => {
    try {
      const res = await fetch('/api/auth/google/url');
      const { url } = await res.json();
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      window.open(
        url,
        'google_oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      );
    } catch (error) {
      console.error('Error connecting to Google:', error);
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await fetch('/api/auth/google/logout', { method: 'POST' });
      setIsGoogleConnected(false);
      setGoogleEvents([]);
    } catch (error) {
      console.error('Error logging out from Google:', error);
    }
  };

  useEffect(() => {
    checkGoogleStatus();

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.provider === 'google') {
        setIsGoogleConnected(true);
        fetchGoogleEvents();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    // Fetch clients for dropdown
    const fetchClients = async () => {
      const snapshot = await getDocs(collection(db, 'clients'));
      setClients(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
    };
    fetchClients();

    const q = query(collection(db, 'schedules'), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSchedules(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ScheduleItem[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'schedules');
    });
    return () => unsubscribe();
  }, []);

  const allSchedules = [...schedules, ...googleEvents].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!newSchedule.clientId) newErrors.clientId = 'Selecione um cliente';
    if (!newSchedule.date) newErrors.date = 'Selecione a data e hora';
    
    if (newSchedule.budgetValue !== undefined && (isNaN(Number(newSchedule.budgetValue)) || Number(newSchedule.budgetValue) < 0)) {
      newErrors.budgetValue = 'Orçamento inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const client = clients.find(c => c.id === newSchedule.clientId);
    try {
      await addDoc(collection(db, 'schedules'), {
        ...newSchedule,
        clientName: client?.name || 'Unknown',
        budgetValue: Number(newSchedule.budgetValue) || 0,
        createdAt: new Date().toISOString()
      });
      setIsModalOpen(false);
      setNewSchedule({ type: 'maintenance', status: 'scheduled', date: new Date().toISOString().slice(0, 16) });
      setErrors({});
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'schedules');
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Agenda Técnica</h1>
          <p className="text-white/50">Planejamento de visitas e manutenções.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {isGoogleConnected ? (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={fetchGoogleEvents}
                disabled={isSyncing}
                className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 transition-all disabled:opacity-50"
                title="Sincronizar Google Calendar"
              >
                <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleGoogleLogout}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-red-500/10 text-red-500 px-4 py-3 rounded-xl font-bold hover:bg-red-500/20 transition-all border border-red-500/20"
              >
                <LogOut className="w-5 h-5" />
                Desconectar Google
              </button>
            </div>
          ) : (
            <button
              onClick={handleGoogleConnect}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-black px-4 py-3 rounded-xl font-bold hover:bg-white/90 transition-all shadow-lg"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
              Conectar Google Agenda
            </button>
          )}
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-tech-blue text-white px-6 py-3 rounded-xl font-bold hover:bg-tech-blue/90 transition-all shadow-lg shadow-tech-blue/20"
          >
            <Plus className="w-5 h-5" />
            Agendar Visita
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {allSchedules.length === 0 ? (
            <div className="py-20 text-center bg-tech-gray rounded-2xl border border-dashed border-white/10">
              <CalendarIcon className="w-12 h-12 text-white/10 mx-auto mb-4" />
              <p className="text-white/30">Nenhum agendamento para os próximos dias.</p>
            </div>
          ) : (
            allSchedules.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`bg-tech-gray p-6 rounded-2xl border ${item.isGoogleEvent ? 'border-tech-green/30' : 'border-white/10'} shadow-xl flex items-center gap-6 hover:border-tech-blue/30 transition-all`}
              >
                <div className={`text-center min-w-[80px] py-2 px-4 rounded-xl ${item.isGoogleEvent ? 'bg-tech-green/10 text-tech-green border-tech-green/20' : 'bg-tech-blue/10 text-tech-blue border-tech-blue/20'} border`}>
                  <p className="text-xs font-bold uppercase">{new Date(item.date).toLocaleDateString('pt-BR', { month: 'short' })}</p>
                  <p className="text-2xl font-black">{new Date(item.date).getDate()}</p>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${item.isGoogleEvent ? 'bg-tech-green/10 text-tech-green' : 'bg-white/5 text-white/40'}`}>
                      {item.isGoogleEvent ? 'Google Calendar' : item.type}
                    </span>
                    <span className="text-xs text-white/30">•</span>
                    <div className="flex items-center gap-1 text-xs text-white/40">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(item.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                  <h3 className="font-bold text-lg">{item.clientName}</h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-white/50">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{item.isGoogleEvent ? 'Evento Externo' : 'Local do Cliente'}</span>
                    </div>
                    {item.budgetValue !== undefined && item.budgetValue > 0 && (
                      <div className="flex items-center gap-1 text-tech-blue font-bold">
                        <DollarSign className="w-4 h-4" />
                        <span>Orçamento: R$ {item.budgetValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </div>
                </div>
                {!item.isGoogleEvent && (
                  <button className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-sm font-bold transition-colors">
                    Detalhes
                  </button>
                )}
              </motion.div>
            ))
          )}
        </div>

        <div className="bg-tech-gray p-6 rounded-2xl border border-white/10 shadow-xl h-fit">
          <h3 className="font-bold text-lg mb-6">Calendário</h3>
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-white/30 mb-4">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <div key={`${d}-${i}`}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 31 }).map((_, i) => (
              <div 
                key={i} 
                className={`aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  i + 1 === new Date().getDate() 
                    ? 'bg-tech-blue text-white shadow-lg shadow-tech-blue/20' 
                    : 'hover:bg-white/5 text-white/60'
                }`}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal Novo Agendamento */}
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
              className="relative w-full max-w-2xl bg-tech-gray rounded-2xl shadow-2xl border border-white/10 overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between shrink-0">
                <h2 className="text-xl font-bold">Agendar Visita Técnica</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddSchedule} className="p-6 space-y-6 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/60">Cliente</label>
                    <select
                      value={newSchedule.clientId || ''}
                      onChange={(e) => {
                        setNewSchedule({ ...newSchedule, clientId: e.target.value });
                        if (errors.clientId) setErrors({ ...errors, clientId: '' });
                      }}
                      className={`w-full bg-white/5 border ${errors.clientId ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 focus:outline-none focus:border-tech-blue/50`}
                    >
                      <option value="">Selecione um cliente</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    {errors.clientId && <p className="text-xs text-red-500 mt-1">{errors.clientId}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/60">Tipo de Visita</label>
                    <select
                      value={newSchedule.type}
                      onChange={(e) => setNewSchedule({ ...newSchedule, type: e.target.value as any })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-tech-blue/50"
                    >
                      <option value="installation">Instalação</option>
                      <option value="maintenance">Manutenção</option>
                      <option value="diagnostic">Diagnóstico</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/60">Data e Hora</label>
                    <input
                      type="datetime-local"
                      value={newSchedule.date || ''}
                      onChange={(e) => {
                        setNewSchedule({ ...newSchedule, date: e.target.value });
                        if (errors.date) setErrors({ ...errors, date: '' });
                      }}
                      className={`w-full bg-white/5 border ${errors.date ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 focus:outline-none focus:border-tech-blue/50`}
                    />
                    {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/60">Orçamento Estimado (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newSchedule.budgetValue || ''}
                      onChange={(e) => {
                        setNewSchedule({ ...newSchedule, budgetValue: e.target.value === '' ? undefined : Number(e.target.value) });
                        if (errors.budgetValue) setErrors({ ...errors, budgetValue: '' });
                      }}
                      className={`w-full bg-white/5 border ${errors.budgetValue ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 focus:outline-none focus:border-tech-blue/50`}
                      placeholder="0,00"
                    />
                    {errors.budgetValue && <p className="text-xs text-red-500 mt-1">{errors.budgetValue}</p>}
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-white/60">Notas / Observações</label>
                    <textarea
                      rows={3}
                      value={newSchedule.notes || ''}
                      onChange={(e) => setNewSchedule({ ...newSchedule, notes: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-tech-blue/50 resize-none"
                    />
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
                    className="bg-tech-blue text-white px-8 py-3 rounded-xl font-bold hover:bg-tech-blue/90 transition-all shadow-lg shadow-tech-blue/20"
                  >
                    Agendar Visita
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
