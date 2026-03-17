import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Wrench, 
  Cpu, 
  Calendar, 
  TrendingUp, 
  DollarSign,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalClients: 0,
    servicesMonth: 0,
    totalEquipment: 0,
    monthlyRevenue: 0
  });
  const [recentServices, setRecentServices] = useState<any[]>([]);
  const [todaySchedules, setTodaySchedules] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    // Stats: Clients
    const unsubClients = onSnapshot(collection(db, 'clients'), (snapshot) => {
      setStats(prev => ({ ...prev, totalClients: snapshot.size }));
    });

    // Stats: Equipment
    const unsubEquipment = onSnapshot(collection(db, 'equipments'), (snapshot) => {
      setStats(prev => ({ ...prev, totalEquipment: snapshot.size }));
    });

    // Stats: Services & Revenue
    const unsubServices = onSnapshot(collection(db, 'services'), (snapshot) => {
      const services = snapshot.docs.map(doc => doc.data());
      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();

      const monthServices = services.filter(s => {
        const d = new Date(s.date);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      });

      const revenue = monthServices.reduce((acc, s) => acc + (Number(s.value) || 0), 0);

      setStats(prev => ({ 
        ...prev, 
        servicesMonth: monthServices.length,
        monthlyRevenue: revenue
      }));

      // Prepare chart data (last 6 months)
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const last6Months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const m = d.getMonth();
        const y = d.getFullYear();
        
        const mServices = services.filter(s => {
          const sd = new Date(s.date);
          return sd.getMonth() === m && sd.getFullYear() === y;
        });

        last6Months.push({
          name: months[m],
          revenue: mServices.reduce((acc, s) => acc + (Number(s.value) || 0), 0),
          services: mServices.length
        });
      }
      setChartData(last6Months);
    });

    // Recent Services
    const qRecent = query(collection(db, 'services'), orderBy('date', 'desc'), limit(3));
    const unsubRecent = onSnapshot(qRecent, (snapshot) => {
      setRecentServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Today's Schedules
    const unsubSchedules = onSnapshot(collection(db, 'schedules'), (snapshot) => {
      const today = new Date().toISOString().split('T')[0];
      const todayItems = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((s: any) => s.date.startsWith(today))
        .sort((a: any, b: any) => a.date.localeCompare(b.date));
      setTodaySchedules(todayItems);
    });

    return () => {
      unsubClients();
      unsubEquipment();
      unsubServices();
      unsubRecent();
      unsubSchedules();
    };
  }, []);

  const statCards = [
    { label: 'Total Clientes', value: stats.totalClients.toString(), icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Serviços (Mês)', value: stats.servicesMonth.toString(), icon: Wrench, color: 'text-green-400', bg: 'bg-green-400/10' },
    { label: 'Dispositivos IoT', value: stats.totalEquipment.toString(), icon: Cpu, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { label: 'Receita Mensal', value: `R$ ${stats.monthlyRevenue.toLocaleString('pt-BR')}`, icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-white/50">Bem-vindo de volta, Técnico Ananias Feliciano.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-tech-gray p-6 rounded-2xl border border-white/10 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <TrendingUp className="w-4 h-4 text-tech-green" />
            </div>
            <p className="text-white/50 text-sm font-medium">{stat.label}</p>
            <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-tech-gray p-6 rounded-2xl border border-white/10 shadow-xl h-[400px]"
        >
          <h3 className="text-lg font-bold mb-6">Faturamento Mensal</h3>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0A84FF" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#0A84FF" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis dataKey="name" stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #ffffff20', borderRadius: '12px' }}
                itemStyle={{ color: '#fff' }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#0A84FF" fillOpacity={1} fill="url(#colorRev)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-tech-gray p-6 rounded-2xl border border-white/10 shadow-xl h-[400px]"
        >
          <h3 className="text-lg font-bold mb-6">Serviços Realizados</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis dataKey="name" stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #ffffff20', borderRadius: '12px' }}
                itemStyle={{ color: '#fff' }}
              />
              <Bar dataKey="services" fill="#22C55E" radius={[4, 4, 0, 0]} barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-tech-gray p-6 rounded-2xl border border-white/10 shadow-xl">
          <h3 className="text-lg font-bold mb-6">Últimos Serviços</h3>
          <div className="space-y-4">
            {recentServices.length === 0 ? (
              <p className="text-white/30 text-center py-8">Nenhum serviço registrado.</p>
            ) : (
              recentServices.map((service) => (
                <div key={service.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-tech-blue/30 transition-colors group cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-tech-blue/10 flex items-center justify-center text-tech-blue">
                      <Wrench className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold capitalize">{service.type.replace('_', ' ')}</h4>
                      <p className="text-sm text-white/40">Cliente: {service.clientName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                      service.status === 'completed' ? 'bg-tech-green/10 text-tech-green' : 'bg-yellow-400/10 text-yellow-400'
                    }`}>
                      {service.status === 'completed' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {service.status === 'completed' ? 'Concluído' : 'Pendente'}
                    </span>
                    <p className="text-xs text-white/30 mt-1">{new Date(service.date).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-tech-gray p-6 rounded-2xl border border-white/10 shadow-xl">
          <h3 className="text-lg font-bold mb-6">Agenda de Hoje</h3>
          <div className="space-y-4">
            {todaySchedules.length === 0 ? (
              <p className="text-white/30 text-center py-8">Sem compromissos para hoje.</p>
            ) : (
              todaySchedules.map((item) => (
                <div key={item.id} className="relative pl-6 border-l-2 border-tech-blue/30 space-y-1">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-tech-blue border-4 border-tech-gray"></div>
                  <p className="text-xs text-tech-blue font-bold uppercase tracking-wider">
                    {new Date(item.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <h4 className="font-bold">{item.type}</h4>
                  <p className="text-sm text-white/50">{item.clientName}</p>
                </div>
              ))
            )}
          </div>
          <button className="w-full mt-8 py-3 rounded-xl bg-tech-blue/10 text-tech-blue font-bold hover:bg-tech-blue/20 transition-colors">
            Ver Agenda Completa
          </button>
        </div>
      </div>
    </div>
  );
}
