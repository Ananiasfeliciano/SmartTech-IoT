import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cpu, Plus, Search, MapPin, Tag, Calendar, X, User, Package, DollarSign, TrendingUp, Trash2 } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, orderBy, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';

interface Equipment {
  id: string;
  clientId: string;
  clientName: string;
  type: string;
  brand: string;
  model: string;
  location: string;
  installDate: string;
  observations: string;
}

interface Material {
  id: string;
  name: string;
  brand: string;
  category: string;
  purchaseCost: number;
  sellingPrice: number;
  stock: number;
  unit: string;
  createdAt: string;
}

interface Client {
  id: string;
  name: string;
}

export default function Equipment() {
  const [activeTab, setActiveTab] = useState<'installed' | 'catalog'>('installed');
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [newEquipment, setNewEquipment] = useState<Partial<Equipment>>({
    installDate: new Date().toISOString().split('T')[0]
  });

  const [newMaterial, setNewMaterial] = useState<Partial<Material> & { margin?: number }>({
    purchaseCost: 0,
    sellingPrice: 0,
    margin: 0,
    stock: 0,
    unit: 'un'
  });

  const calculatePricing = (type: 'cost' | 'price' | 'margin', value: number) => {
    const cost = type === 'cost' ? value : (newMaterial.purchaseCost || 0);
    const price = type === 'price' ? value : (newMaterial.sellingPrice || 0);
    const margin = type === 'margin' ? value : (newMaterial.margin || 0);

    if (type === 'cost' || type === 'margin') {
      const newPrice = cost * (1 + margin / 100);
      setNewMaterial(prev => ({ ...prev, purchaseCost: cost, margin, sellingPrice: Number(newPrice.toFixed(2)) }));
    } else if (type === 'price') {
      const newMargin = cost > 0 ? ((price - cost) / cost) * 100 : 0;
      setNewMaterial(prev => ({ ...prev, sellingPrice: price, margin: Number(newMargin.toFixed(2)) }));
    }
  };

  useEffect(() => {
    // Fetch clients for dropdown
    const fetchClients = async () => {
      const snapshot = await getDocs(collection(db, 'clients'));
      setClients(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
    };
    fetchClients();

    const qEq = query(collection(db, 'equipments'), orderBy('installDate', 'desc'));
    const unsubEq = onSnapshot(qEq, (snapshot) => {
      setEquipments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Equipment[]);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'equipments');
    });

    const qMat = query(collection(db, 'materials'), orderBy('name', 'asc'));
    const unsubMat = onSnapshot(qMat, (snapshot) => {
      setMaterials(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Material[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'materials');
    });

    return () => {
      unsubEq();
      unsubMat();
    };
  }, []);

  const handleAddEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    const client = clients.find(c => c.id === newEquipment.clientId);
    try {
      await addDoc(collection(db, 'equipments'), {
        ...newEquipment,
        clientName: client?.name || 'Unknown',
        createdAt: new Date().toISOString()
      });
      setIsModalOpen(false);
      setNewEquipment({ installDate: new Date().toISOString().split('T')[0] });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'equipments');
    }
  };

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'materials'), {
        ...newMaterial,
        createdAt: new Date().toISOString()
      });
      setIsMaterialModalOpen(false);
      setNewMaterial({ purchaseCost: 0, sellingPrice: 0, stock: 0, unit: 'un' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'materials');
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este material?')) return;
    try {
      await deleteDoc(doc(db, 'materials', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'materials');
    }
  };

  const filteredEquipments = equipments.filter(eq => 
    eq.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMaterials = materials.filter(mat => 
    mat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mat.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mat.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Equipamentos & Materiais</h1>
          <p className="text-white/50">Gerencie o inventário instalado e o catálogo de produtos.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {activeTab === 'installed' ? (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-tech-blue text-white px-6 py-3 rounded-xl font-bold hover:bg-tech-blue/90 transition-all shadow-lg shadow-tech-blue/20"
            >
              <Plus className="w-5 h-5" />
              Novo Equipamento
            </button>
          ) : (
            <button
              onClick={() => setIsMaterialModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-tech-green text-white px-6 py-3 rounded-xl font-bold hover:bg-tech-green/90 transition-all shadow-lg shadow-tech-green/20"
            >
              <Plus className="w-5 h-5" />
              Novo Material
            </button>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setActiveTab('installed')}
          className={`px-6 py-3 font-bold transition-all border-b-2 ${
            activeTab === 'installed' ? 'border-tech-blue text-tech-blue' : 'border-transparent text-white/40 hover:text-white/60'
          }`}
        >
          Equipamentos Instalados
        </button>
        <button
          onClick={() => setActiveTab('catalog')}
          className={`px-6 py-3 font-bold transition-all border-b-2 ${
            activeTab === 'catalog' ? 'border-tech-green text-tech-green' : 'border-transparent text-white/40 hover:text-white/60'
          }`}
        >
          Catálogo de Materiais
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
        <input
          type="text"
          placeholder={activeTab === 'installed' ? "Buscar por marca, modelo ou cliente..." : "Buscar por nome, marca ou categoria..."}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-tech-gray border border-white/10 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-tech-blue/50 transition-colors"
        />
      </div>

      {activeTab === 'installed' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredEquipments.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-tech-gray rounded-2xl border border-dashed border-white/10">
              <Cpu className="w-12 h-12 text-white/10 mx-auto mb-4" />
              <p className="text-white/30">Nenhum equipamento registrado ainda.</p>
            </div>
          ) : (
            filteredEquipments.map((eq) => (
              <motion.div
                key={eq.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-tech-gray p-6 rounded-2xl border border-white/10 shadow-xl hover:border-tech-blue/30 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-tech-blue/10 flex items-center justify-center text-tech-blue mb-4">
                  <Cpu className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-lg">{eq.brand} {eq.model}</h3>
                <p className="text-sm text-white/50 mb-1">{eq.type}</p>
                <div className="flex items-center gap-2 text-xs text-tech-blue font-medium mb-4">
                  <User className="w-3 h-3" />
                  <span>{eq.clientName}</span>
                </div>
                
                <div className="space-y-2 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2 text-xs text-white/40">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{eq.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/40">
                    <Calendar className="w-3 h-3" />
                    <span>Instalado em: {new Date(eq.installDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaterials.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-tech-gray rounded-2xl border border-dashed border-white/10">
              <Package className="w-12 h-12 text-white/10 mx-auto mb-4" />
              <p className="text-white/30">Nenhum material cadastrado no catálogo.</p>
            </div>
          ) : (
            filteredMaterials.map((mat) => (
              <motion.div
                key={mat.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-tech-gray p-6 rounded-2xl border border-white/10 shadow-xl hover:border-tech-green/30 transition-all group relative flex flex-col"
              >
                <button 
                  onClick={() => handleDeleteMaterial(mat.id)}
                  className="absolute top-4 right-4 p-2 text-white/10 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 z-10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-tech-green/10 flex items-center justify-center text-tech-green shrink-0">
                    <Package className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-lg truncate leading-tight">{mat.name}</h3>
                    <p className="text-sm text-white/40 truncate">{mat.brand || 'Sem marca'} • {mat.category || 'Sem categoria'}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 pt-4 border-t border-white/5">
                  <div className="space-y-1">
                    <p className="text-[10px] text-white/30 uppercase font-bold tracking-wider">Custo de Compra</p>
                    <div className="flex items-center gap-1.5 text-white/70">
                      <DollarSign className="w-3.5 h-3.5 text-white/20" />
                      <span className="font-mono text-sm font-medium">R$ {mat.purchaseCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-white/30 uppercase font-bold tracking-wider">Preço de Venda</p>
                    <div className="flex items-center gap-1.5 text-tech-green">
                      <Tag className="w-3.5 h-3.5 text-tech-green/30" />
                      <span className="font-mono text-sm font-bold">R$ {mat.sellingPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-white/30 uppercase font-bold tracking-wider">Margem Bruta</p>
                    <div className="flex items-center gap-1.5 text-tech-blue">
                      <TrendingUp className="w-3.5 h-3.5 text-tech-blue/30" />
                      <span className="font-mono text-sm font-bold">
                        {mat.purchaseCost > 0 
                          ? (((mat.sellingPrice - mat.purchaseCost) / mat.purchaseCost) * 100).toFixed(1) 
                          : '0.0'}%
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-white/30 uppercase font-bold tracking-wider">Estoque Atual</p>
                    <div className="flex items-center gap-1.5 text-white/70">
                      <Package className="w-3.5 h-3.5 text-white/20" />
                      <span className="font-mono text-sm font-medium">{mat.stock} <span className="text-[10px] text-white/30 uppercase">{mat.unit}</span></span>
                    </div>
                  </div>
                </div>

                <div className="mt-auto pt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-tech-green/5 rounded-lg border border-tech-green/10">
                    <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Lucro:</span>
                    <span className="text-xs font-bold text-tech-green font-mono">
                      R$ {(mat.sellingPrice - mat.purchaseCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Modal Novo Equipamento */}
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
                <h2 className="text-xl font-bold">Novo Equipamento Instalado</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddEquipment} className="p-6 space-y-6 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/60">Cliente</label>
                    <select
                      required
                      value={newEquipment.clientId || ''}
                      onChange={(e) => setNewEquipment({ ...newEquipment, clientId: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-tech-blue/50"
                    >
                      <option value="">Selecione um cliente</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/60">Tipo de Dispositivo</label>
                    <input
                      required
                      type="text"
                      placeholder="Ex: Câmera, Sensor, Lâmpada"
                      value={newEquipment.type || ''}
                      onChange={(e) => setNewEquipment({ ...newEquipment, type: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-tech-blue/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/60">Marca</label>
                    <input
                      required
                      type="text"
                      value={newEquipment.brand || ''}
                      onChange={(e) => setNewEquipment({ ...newEquipment, brand: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-tech-blue/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/60">Modelo</label>
                    <input
                      required
                      type="text"
                      value={newEquipment.model || ''}
                      onChange={(e) => setNewEquipment({ ...newEquipment, model: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-tech-blue/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/60">Localização na Planta</label>
                    <input
                      type="text"
                      placeholder="Ex: Cozinha, Entrada Principal"
                      value={newEquipment.location || ''}
                      onChange={(e) => setNewEquipment({ ...newEquipment, location: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-tech-blue/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/60">Data de Instalação</label>
                    <input
                      type="date"
                      value={newEquipment.installDate || ''}
                      onChange={(e) => setNewEquipment({ ...newEquipment, installDate: e.target.value })}
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
                    Salvar Equipamento
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Novo Material */}
      <AnimatePresence>
        {isMaterialModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMaterialModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-tech-gray rounded-2xl shadow-2xl border border-white/10 overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between shrink-0">
                <h2 className="text-xl font-bold">Novo Material no Catálogo</h2>
                <button onClick={() => setIsMaterialModalOpen(false)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddMaterial} className="p-6 space-y-6 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-medium text-white/60">Nome do Material/Produto</label>
                    <input
                      required
                      type="text"
                      placeholder="Ex: Cabo de Rede Cat6, Câmera IP 4MP"
                      value={newMaterial.name || ''}
                      onChange={(e) => setNewMaterial({ ...newMaterial, name: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-tech-green/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/60">Marca</label>
                    <input
                      type="text"
                      value={newMaterial.brand || ''}
                      onChange={(e) => setNewMaterial({ ...newMaterial, brand: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-tech-green/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/60">Categoria</label>
                    <input
                      type="text"
                      placeholder="Ex: Cabeamento, CFTV, Automação"
                      value={newMaterial.category || ''}
                      onChange={(e) => setNewMaterial({ ...newMaterial, category: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-tech-green/50"
                    />
                  </div>

                  <div className="md:col-span-2 p-4 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                    <div className="flex items-center gap-2 text-tech-green mb-2">
                      <DollarSign className="w-4 h-4" />
                      <h3 className="text-sm font-bold uppercase tracking-wider">Precificação e Lucro</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-white/40 uppercase tracking-widest">Custo de Compra</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 text-sm">R$</span>
                          <input
                            required
                            type="number"
                            step="0.01"
                            value={newMaterial.purchaseCost || ''}
                            onChange={(e) => calculatePricing('cost', Number(e.target.value))}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-tech-green/50 font-mono"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-medium text-white/40 uppercase tracking-widest">Margem de Lucro (%)</label>
                        <div className="relative">
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 text-sm">%</span>
                          <input
                            required
                            type="number"
                            step="0.1"
                            value={newMaterial.margin || ''}
                            onChange={(e) => calculatePricing('margin', Number(e.target.value))}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-tech-green/50 font-mono"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-medium text-white/40 uppercase tracking-widest">Preço de Venda</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 text-sm">R$</span>
                          <input
                            required
                            type="number"
                            step="0.01"
                            value={newMaterial.sellingPrice || ''}
                            onChange={(e) => calculatePricing('price', Number(e.target.value))}
                            className="w-full bg-tech-green/10 border border-tech-green/30 text-tech-green rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-tech-green font-bold font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-white/40">
                        <TrendingUp className="w-3 h-3" />
                        <span>Lucro Bruto por Unidade:</span>
                      </div>
                      <span className="font-bold text-tech-green font-mono">
                        R$ {((newMaterial.sellingPrice || 0) - (newMaterial.purchaseCost || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/60">Estoque Inicial</label>
                    <input
                      type="number"
                      value={newMaterial.stock || ''}
                      onChange={(e) => setNewMaterial({ ...newMaterial, stock: Number(e.target.value) })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-tech-green/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/60">Unidade</label>
                    <select
                      value={newMaterial.unit || 'un'}
                      onChange={(e) => setNewMaterial({ ...newMaterial, unit: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-tech-green/50"
                    >
                      <option value="un">Unidade (un)</option>
                      <option value="m">Metro (m)</option>
                      <option value="kg">Quilo (kg)</option>
                      <option value="cx">Caixa (cx)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/10 flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => setIsMaterialModalOpen(false)}
                    className="px-6 py-3 rounded-xl font-bold hover:bg-white/5 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-tech-green text-white px-8 py-3 rounded-xl font-bold hover:bg-tech-green/90 transition-all shadow-lg shadow-tech-green/20"
                  >
                    Salvar Material
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
