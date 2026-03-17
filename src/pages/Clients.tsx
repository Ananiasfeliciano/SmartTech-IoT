import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  UserPlus, 
  Phone, 
  Mail, 
  MapPin,
  Trash2,
  Edit2,
  X
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';

interface Client {
  id: string;
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  city: string;
  type: 'residential' | 'business';
  observations: string;
  createdAt: string;
}

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [newClient, setNewClient] = useState<Partial<Client>>({
    type: 'residential'
  });

  useEffect(() => {
    const q = query(collection(db, 'clients'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const clientsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Client[];
      setClients(clientsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'clients');
    });

    return () => unsubscribe();
  }, []);

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'clients'), {
        ...newClient,
        createdAt: new Date().toISOString()
      });
      setIsModalOpen(false);
      setNewClient({ type: 'residential' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'clients');
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este cliente?')) {
      try {
        await deleteDoc(doc(db, 'clients', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `clients/${id}`);
      }
    }
  };

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Clientes</h1>
          <p className="text-white/50">Gerencie sua base de contatos e históricos.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-tech-blue text-white px-6 py-3 rounded-xl font-bold hover:bg-tech-blue/90 transition-all active:scale-95 shadow-lg shadow-tech-blue/20"
        >
          <UserPlus className="w-5 h-5" />
          Novo Cliente
        </button>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
        <input
          type="text"
          placeholder="Buscar clientes por nome ou email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-tech-gray border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-tech-blue/50 transition-colors"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredClients.map((client) => (
            <motion.div
              key={client.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-tech-gray p-6 rounded-2xl border border-white/10 shadow-xl group hover:border-tech-blue/30 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-tech-blue/10 flex items-center justify-center text-tech-blue font-bold text-xl">
                  {client.name.charAt(0)}
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteClient(client.id)}
                    className="p-2 rounded-lg hover:bg-red-400/10 text-white/40 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="text-lg font-bold mb-1">{client.name}</h3>
              <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-md ${client.type === 'business' ? 'bg-purple-400/10 text-purple-400' : 'bg-blue-400/10 text-blue-400'}`}>
                {client.type === 'business' ? 'Empresa' : 'Residencial'}
              </span>

              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3 text-sm text-white/60">
                  <Phone className="w-4 h-4 text-tech-blue" />
                  <span>{client.phone || client.whatsapp || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-white/60">
                  <Mail className="w-4 h-4 text-tech-blue" />
                  <span className="truncate">{client.email || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-white/60">
                  <MapPin className="w-4 h-4 text-tech-blue" />
                  <span className="truncate">{client.address}, {client.city}</span>
                </div>
              </div>

              <button className="w-full mt-6 py-2 rounded-lg bg-white/5 text-white/60 text-sm font-medium hover:bg-white/10 transition-colors">
                Ver Histórico Completo
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Modal Novo Cliente */}
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
                <h2 className="text-xl font-bold">Novo Cliente</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddClient} className="p-6 space-y-6 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/60">Nome Completo</label>
                    <input
                      required
                      type="text"
                      value={newClient.name || ''}
                      onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-tech-blue/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/60">Tipo de Cliente</label>
                    <select
                      value={newClient.type}
                      onChange={(e) => setNewClient({ ...newClient, type: e.target.value as any })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-tech-blue/50"
                    >
                      <option value="residential">Residencial</option>
                      <option value="business">Empresa</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/60">Telefone / WhatsApp</label>
                    <input
                      type="text"
                      value={newClient.phone || ''}
                      onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-tech-blue/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/60">Email</label>
                    <input
                      type="email"
                      value={newClient.email || ''}
                      onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-tech-blue/50"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-white/60">Endereço</label>
                    <input
                      type="text"
                      value={newClient.address || ''}
                      onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-tech-blue/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/60">Cidade</label>
                    <input
                      type="text"
                      value={newClient.city || ''}
                      onChange={(e) => setNewClient({ ...newClient, city: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-tech-blue/50"
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
                    Salvar Cliente
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
