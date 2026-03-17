import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Wrench, 
  Calendar, 
  User, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  MoreVertical,
  Trash2,
  AlertCircle,
  X,
  Package,
  Minus,
  Check,
  FileText,
  Download
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  deleteDoc, 
  doc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { format } from 'date-fns';
import { generateServicePDF } from '../services/pdfService';

interface ServiceItem {
  description: string;
  quantity: number;
  unitValue: number;
}

export default function Services() {
  const [services, setServices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    clientId: '',
    type: 'automation',
    date: new Date().toISOString().split('T')[0],
    technician: '',
    value: 0,
    budgetValue: 0,
    status: 'pending',
    description: '',
    items: [] as ServiceItem[]
  });

  const [newItem, setNewItem] = useState<ServiceItem>({
    description: '',
    quantity: 1,
    unitValue: 0
  });

  useEffect(() => {
    const unsubServices = onSnapshot(
      query(collection(db, 'services'), orderBy('date', 'desc')),
      (snapshot) => {
        setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      }
    );

    const unsubClients = onSnapshot(collection(db, 'clients'), (snapshot) => {
      setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubMaterials = onSnapshot(collection(db, 'materials'), (snapshot) => {
      setMaterials(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubServices();
      unsubClients();
      unsubMaterials();
    };
  }, []);

  const updateTotals = (items: ServiceItem[]) => {
    const totalValue = items.reduce((acc, item) => acc + (item.quantity * item.unitValue), 0);
    setFormData(prev => ({
      ...prev,
      items,
      budgetValue: totalValue,
      value: totalValue
    }));
  };

  const addItem = () => {
    if (!newItem.description || newItem.unitValue < 0) return;
    const updatedItems = [...formData.items, newItem];
    updateTotals(updatedItems);
    setNewItem({ description: '', quantity: 1, unitValue: 0 });
  };

  const removeItem = (index: number) => {
    const updatedItems = formData.items.filter((_, i) => i !== index);
    updateTotals(updatedItems);
  };

  const updateItemQuantity = (index: number, delta: number) => {
    const updatedItems = [...formData.items];
    const newQty = Math.max(1, updatedItems[index].quantity + delta);
    updatedItems[index] = { ...updatedItems[index], quantity: newQty };
    updateTotals(updatedItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const client = clients.find(c => c.id === formData.clientId);
      const serviceData = {
        ...formData,
        clientName: client?.name || 'Cliente não encontrado',
        updatedAt: new Date().toISOString()
      };

      if (editingId) {
        await updateDoc(doc(db, 'services', editingId), serviceData);
      } else {
        await addDoc(collection(db, 'services'), {
          ...serviceData,
          createdAt: new Date().toISOString()
        });
      }
      
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving service:', error);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      clientId: '',
      type: 'automation',
      date: new Date().toISOString().split('T')[0],
      technician: '',
      value: 0,
      budgetValue: 0,
      status: 'pending',
      description: '',
      items: []
    });
  };

  const handleEdit = (service: any) => {
      setEditingId(service.id);
      setFormData({
        clientId: service.clientId || '',
        type: service.type || 'automation',
        date: service.date || new Date().toISOString().split('T')[0],
        technician: service.technician || '',
        value: service.value || 0,
        budgetValue: service.budgetValue || 0,
        status: service.status || 'pending',
        description: service.description || '',
        items: service.items || []
      });
      setIsModalOpen(true);
    };

  const handleApprove = async (id: string) => {
    try {
      await updateDoc(doc(db, 'services', id), {
        status: 'approved',
        approvedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error approving budget:', error);
    }
  };

  const handleConvertToOS = async (service: any) => {
    try {
      const { id, ...rest } = service;
      
      // 1. Create a new service record with status 'completed'
      await addDoc(collection(db, 'services'), {
        ...rest,
        status: 'completed',
        createdAt: new Date().toISOString(),
        description: `[OS Gerada de Orçamento] ${rest.description || ''}`
      });

      // 2. Update the original budget to 'completed' as well to mark it as processed
      await updateDoc(doc(db, 'services', id), {
        status: 'completed',
        completedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error converting budget to OS:', error);
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await updateDoc(doc(db, 'services', id), {
        status: 'completed',
        completedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error completing service:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'services', id));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting service:', error);
    }
  };

  const handleDownloadPDF = (service: any) => {
    const client = clients.find(c => c.id === service.clientId);
    
    generateServicePDF({
      type: service.status === 'completed' ? 'service_order' : 'budget',
      id: service.id,
      clientName: service.clientName,
      clientEmail: client?.email,
      clientPhone: client?.phone,
      serviceType: service.type,
      date: service.date,
      technician: service.technician,
      description: service.description,
      items: service.items || [],
      totalValue: service.value || 0
    });
  };

  const filteredServices = services.filter(service =>
    service.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.technician?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-tech-green/10 text-tech-green border-tech-green/20';
      case 'approved': return 'bg-tech-blue/10 text-tech-blue border-tech-blue/20';
      case 'pending': return 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20';
      case 'rejected': return 'bg-red-400/10 text-red-400 border-red-400/20';
      default: return 'bg-gray-400/10 text-gray-400 border-gray-400/20';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Concluído';
      case 'approved': return 'Aprovado';
      case 'pending': return 'Pendente';
      case 'rejected': return 'Rejeitado';
      default: return status;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Serviços & Orçamentos</h1>
          <p className="text-white/40 mt-1">Gerencie orçamentos e ordens de serviço (OS).</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center justify-center gap-2 bg-tech-blue hover:bg-tech-blue/80 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-tech-blue/20"
        >
          <Plus className="w-5 h-5" />
          Novo Orçamento/Serviço
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
        <input
          type="text"
          placeholder="Buscar por cliente, tipo ou técnico..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-tech-gray border border-white/10 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-tech-blue/50 transition-colors"
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-tech-blue border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="text-center py-20 bg-tech-gray rounded-2xl border border-white/5">
            <Wrench className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/40">Nenhum registro encontrado.</p>
          </div>
        ) : (
          filteredServices.map((service) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-tech-gray border border-white/10 rounded-2xl p-6 hover:border-tech-blue/30 transition-all group relative"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-tech-blue/10 flex items-center justify-center text-tech-blue shrink-0">
                    <Wrench className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-bold capitalize">{service.type.replace('_', ' ')}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(service.status)}`}>
                        {getStatusLabel(service.status)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-white/40">
                      <span className="flex items-center gap-1.5">
                        <User className="w-4 h-4" />
                        {service.clientName}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(service.date), 'dd/MM/yyyy')}
                      </span>
                      {service.technician && (
                        <span className="flex items-center gap-1.5">
                          <Wrench className="w-4 h-4" />
                          {service.technician}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-6 lg:text-right">
                  <div>
                    <p className="text-xs text-white/30 uppercase tracking-wider mb-1">Valor Total</p>
                    <p className="text-xl font-mono text-tech-green">R$ {(service.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {service.status === 'pending' && (
                      <button 
                        onClick={() => handleApprove(service.id)}
                        className="flex items-center gap-2 bg-tech-blue/20 text-tech-blue hover:bg-tech-blue hover:text-white px-4 py-2 rounded-lg text-sm font-bold transition-all"
                        title="Aprovar Orçamento"
                      >
                        <Check className="w-4 h-4" />
                        Aprovar
                      </button>
                    )}
                    {service.status === 'approved' && (
                      <button 
                        onClick={() => handleConvertToOS(service)}
                        className="flex items-center gap-2 bg-tech-green/20 text-tech-green hover:bg-tech-green hover:text-white px-4 py-2 rounded-lg text-sm font-bold transition-all"
                        title="Concluir Serviço"
                      >
                        <FileText className="w-4 h-4" />
                        Concluir
                      </button>
                    )}
                    <button 
                      onClick={() => handleDownloadPDF(service)}
                      className="flex items-center gap-2 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white px-4 py-2 rounded-lg text-sm font-bold transition-all border border-white/10"
                      title="Baixar PDF"
                    >
                      <Download className="w-4 h-4" />
                      PDF
                    </button>
                    <button 
                      onClick={() => handleEdit(service)}
                      className="p-2 text-white/20 hover:text-tech-blue transition-colors"
                      title="Editar"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setDeleteConfirm(service.id)}
                      className="p-2 text-white/20 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {service.items && service.items.length > 0 && (
                <div className="mt-6 pt-4 border-t border-white/5">
                  <h4 className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Package className="w-3 h-3" /> Materiais/Itens
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {service.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white/5 text-sm">
                        <span className="text-white/70">{item.quantity}x {item.description}</span>
                        <span className="text-white/40 font-mono">R$ {(item.unitValue * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {service.description && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <p className="text-sm text-white/40 italic">"{service.description}"</p>
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-tech-gray w-full max-w-3xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between shrink-0">
                <h2 className="text-xl font-bold">{editingId ? 'Editar Orçamento / OS' : 'Novo Orçamento / OS'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-white/40 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/60">Cliente</label>
                    <select
                      required
                      value={formData.clientId}
                      onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-tech-blue/50"
                    >
                      <option value="">Selecione um cliente</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>{client.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/60">Tipo de Serviço</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-tech-blue/50"
                    >
                      <option value="automation">Automação</option>
                      <option value="cameras">Câmeras/CFTV</option>
                      <option value="network">Redes/Wi-Fi</option>
                      <option value="maintenance">Manutenção</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/60">Data</label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-tech-blue/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/60">Técnico Responsável</label>
                    <input
                      type="text"
                      value={formData.technician}
                      onChange={(e) => setFormData({ ...formData, technician: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-tech-blue/50"
                      placeholder="Nome do técnico"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/60">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-tech-blue/50"
                    >
                      <option value="pending">Pendente</option>
                      <option value="approved">Aprovado</option>
                      <option value="rejected">Rejeitado</option>
                      <option value="completed">Concluído</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4 p-6 bg-white/5 rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
                      <Package className="w-4 h-4" /> Materiais e Itens
                    </h3>
                    {materials.length > 0 && (
                      <select 
                        onChange={(e) => {
                          const mat = materials.find(m => m.id === e.target.value);
                          if (mat) {
                            setNewItem({
                              description: `${mat.name} (${mat.brand})`,
                              quantity: 1,
                              unitValue: mat.sellingPrice
                            });
                          }
                        }}
                        className="text-[10px] bg-tech-blue/10 text-tech-blue border border-tech-blue/20 rounded-lg px-2 py-1 focus:outline-none font-bold uppercase tracking-wider"
                      >
                        <option value="">Importar do Catálogo...</option>
                        {materials.map(m => (
                          <option key={m.id} value={m.id}>{m.name} - R$ {m.sellingPrice}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <input
                        type="text"
                        placeholder="Descrição do material"
                        value={newItem.description}
                        onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-tech-blue/50"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        placeholder="Qtd"
                        value={newItem.quantity}
                        onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-tech-blue/50"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        placeholder="V. Unit"
                        value={newItem.unitValue || ''}
                        onChange={(e) => setNewItem({ ...newItem, unitValue: Number(e.target.value) })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-tech-blue/50"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={addItem}
                    className="w-full py-3 rounded-xl bg-tech-blue/10 hover:bg-tech-blue/20 text-tech-blue text-xs font-bold transition-all flex items-center justify-center gap-2 border border-tech-blue/20"
                  >
                    <Plus className="w-4 h-4" /> Adicionar ao Orçamento
                  </button>

                  {formData.items.length > 0 && (
                    <div className="mt-6 space-y-3">
                      <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] px-2">Itens Selecionados</div>
                      {formData.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 group/item">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-white/80">{item.description}</span>
                            <span className="text-xs text-white/30">Valor Unitário: R$ {item.unitValue.toLocaleString('pt-BR')}</span>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="flex items-center gap-3 bg-black/20 rounded-lg p-1 border border-white/5">
                              <button 
                                type="button"
                                onClick={() => updateItemQuantity(idx, -1)}
                                className="w-6 h-6 flex items-center justify-center rounded bg-white/5 hover:bg-white/10 text-white/40"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-sm font-mono w-6 text-center">{item.quantity}</span>
                              <button 
                                type="button"
                                onClick={() => updateItemQuantity(idx, 1)}
                                className="w-6 h-6 flex items-center justify-center rounded bg-white/5 hover:bg-white/10 text-white/40"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="text-right min-w-[100px]">
                              <span className="block text-xs text-white/20 uppercase font-black tracking-tighter">Subtotal</span>
                              <span className="font-mono text-sm text-tech-green">R$ {(item.quantity * item.unitValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <button 
                              type="button"
                              onClick={() => removeItem(idx)}
                              className="p-2 text-white/10 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                      <div className="mt-6 p-6 rounded-2xl bg-tech-green/5 border border-tech-green/10 flex justify-between items-center">
                        <div>
                          <span className="text-[10px] font-black text-tech-green uppercase tracking-[0.2em] block mb-1">Valor Total do Orçamento</span>
                          <span className="text-white/40 text-xs">{formData.items.length} itens no total</span>
                        </div>
                        <span className="text-3xl font-mono text-tech-green font-bold">R$ {formData.budgetValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/60">Descrição/Observações</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-tech-blue/50 h-24 resize-none"
                    placeholder="Detalhes adicionais do serviço..."
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-3 rounded-xl font-bold border border-white/10 hover:bg-white/5 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-tech-blue hover:bg-tech-blue/80 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-tech-blue/20"
                  >
                    Salvar Registro
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {deleteConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-tech-gray max-w-md w-full p-8 rounded-3xl border border-white/10 shadow-2xl text-center"
            >
              <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Excluir Registro?</h3>
              <p className="text-white/60 mb-8">Esta ação não pode ser desfeita. O registro será removido permanentemente.</p>
              <div className="flex gap-4">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-6 py-3 rounded-xl font-bold border border-white/10 hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-red-500/20"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
