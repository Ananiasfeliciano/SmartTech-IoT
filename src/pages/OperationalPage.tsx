import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Bell,
  CalendarDays,
  Check,
  CircleDollarSign,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Download,
  Edit3,
  Eye,
  FileText,
  Filter,
  Globe2,
  Home,
  Lightbulb,
  MoreVertical,
  Paperclip,
  Plus,
  Power,
  Router,
  Search,
  Send,
  Server,
  Signal,
  Trash2,
  Wifi,
  X,
  Zap,
} from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { dashboardStats, ModuleConfig, OsRecord, statusTone } from '../data/osData';

type FormState = Omit<OsRecord, 'id'>;

const emptyRecord = (module: ModuleConfig): FormState => ({
  codigo: `${module.id.toUpperCase().slice(0, 4)}-${Date.now().toString().slice(-6)}`,
  titulo: '',
  cliente: '',
  categoria: module.singular,
  status: 'Aberta',
  prioridade: 'Media',
  responsavel: 'Admin',
  data: new Date().toISOString().slice(0, 10),
  valor: 0,
  descricao: '',
  contato: '',
  local: '',
});

const currency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const statusClass = (status: string) => {
  const tone = statusTone(status);
  return {
    green: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
    yellow: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
    red: 'bg-red-500/15 text-red-300 border-red-500/20',
    blue: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
  }[tone];
};

const priorityClass = (priority: string) => {
  if (priority === 'Alta' || priority === 'Critica') return 'bg-red-500/15 text-red-300 border-red-500/20';
  if (priority === 'Media') return 'bg-amber-500/15 text-amber-300 border-amber-500/20';
  return 'bg-slate-500/20 text-slate-200 border-white/10';
};

const useModuleRecords = (module: ModuleConfig) => {
  const storageKey = `smarttech-os-${module.id}`;
  const [records, setRecords] = useState<OsRecord[]>(() => {
    const stored = localStorage.getItem(storageKey);
    return stored ? JSON.parse(stored) : module.records;
  });

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    setRecords(stored ? JSON.parse(stored) : module.records);
  }, [storageKey, module.records]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(records));
  }, [records, storageKey]);

  return [records, setRecords] as const;
};

export default function OperationalPage({ module }: { module: ModuleConfig }) {
  const [records, setRecords] = useModuleRecords(module);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('Todos');
  const [category, setCategory] = useState('Todos');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<OsRecord | null>(null);
  const [selectedId, setSelectedId] = useState(records[0]?.id || '');
  const [form, setForm] = useState<FormState>(() => emptyRecord(module));
  const [error, setError] = useState('');
  const pageSize = 8;

  const categories = useMemo(() => ['Todos', ...Array.from(new Set(records.map((record) => record.categoria)))], [records]);
  const statuses = useMemo(() => ['Todos', ...Array.from(new Set(records.map((record) => record.status)))], [records]);
  const filteredRecords = useMemo(() => {
    const text = query.toLowerCase();
    return records.filter((record) => {
      const matchesText = [record.codigo, record.titulo, record.cliente, record.responsavel, record.descricao].join(' ').toLowerCase().includes(text);
      return matchesText && (status === 'Todos' || record.status === status) && (category === 'Todos' || record.categoria === category);
    });
  }, [records, query, status, category]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const visibleRecords = filteredRecords.slice((page - 1) * pageSize, page * pageSize);
  const selected = records.find((record) => record.id === selectedId) || visibleRecords[0] || records[0];

  useEffect(() => setPage(1), [query, status, category, module.id]);
  useEffect(() => {
    if (!selectedId && records[0]) setSelectedId(records[0].id);
  }, [records, selectedId]);

  const summaryCards = useMemo(() => {
    const totalValue = records.reduce((sum, record) => sum + Number(record.valor || 0), 0);
    return [
      { label: `Total de ${module.title}`, value: String(records.length), helper: '+12 este mes', tone: 'blue' },
      { label: 'Concluidos / Ativos', value: String(records.filter((record) => ['Concluida', 'Ativo', 'Aprovado', 'Pago', 'Emitida'].includes(record.status)).length), helper: '55,6% do total', tone: 'green' },
      { label: 'Pendentes', value: String(records.filter((record) => ['Pendente', 'Em Andamento', 'Aberta'].includes(record.status)).length), helper: '32,6% do total', tone: 'yellow' },
      { label: 'Alta prioridade', value: String(records.filter((record) => ['Alta', 'Critica'].includes(record.prioridade)).length), helper: '4,1% do total', tone: 'red' },
      { label: 'Valor Total', value: currency(totalValue), helper: '+18,5% este mes', tone: 'blue' },
    ];
  }, [module.title, records]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyRecord(module));
    setError('');
    setModalOpen(true);
  };

  const openEdit = (record: OsRecord) => {
    setEditing(record);
    const { id: _id, ...rest } = record;
    setForm(rest);
    setError('');
    setModalOpen(true);
  };

  const saveRecord = (event: React.FormEvent) => {
    event.preventDefault();
    const missing = module.fields.find((field) => field.required && !String((form as any)[field.key] ?? '').trim());
    if (missing) {
      setError(`Preencha o campo obrigatorio: ${missing.label}.`);
      return;
    }
    if (Number(form.valor) < 0) {
      setError('O valor nao pode ser negativo.');
      return;
    }
    if (editing) {
      setRecords((current) => current.map((record) => (record.id === editing.id ? { ...form, id: editing.id, valor: Number(form.valor) } : record)));
      setSelectedId(editing.id);
    } else {
      const newRecord = { ...form, id: `${module.id}-${Date.now()}`, valor: Number(form.valor) };
      setRecords((current) => [newRecord, ...current]);
      setSelectedId(newRecord.id);
    }
    setModalOpen(false);
  };

  const deleteRecord = (id: string) => {
    const record = records.find((item) => item.id === id);
    if (!record || !confirm(`Excluir ${record.codigo}?`)) return;
    const next = records.filter((item) => item.id !== id);
    setRecords(next);
    setSelectedId(next[0]?.id || '');
  };

  const duplicateRecord = (record: OsRecord) => {
    const copy = { ...record, id: `${module.id}-${Date.now()}`, codigo: `${record.codigo}-C`, titulo: `${record.titulo} (copia)`, status: 'Pendente' };
    setRecords((current) => [copy, ...current]);
    setSelectedId(copy.id);
  };

  if (module.id === 'dashboard') {
    return (
      <>
        <DashboardView module={module} records={records} openCreate={openCreate} />
        <AnimatePresence>
          {modalOpen && (
            <RecordModal module={module} form={form} setForm={setForm} error={error} editing={editing} close={() => setModalOpen(false)} saveRecord={saveRecord} />
          )}
        </AnimatePresence>
      </>
    );
  }

  if (module.id === 'automacao') {
    return (
      <>
        <AutomationView module={module} records={records} openCreate={openCreate} openEdit={openEdit} duplicateRecord={duplicateRecord} deleteRecord={deleteRecord} />
        <AnimatePresence>
          {modalOpen && <RecordModal module={module} form={form} setForm={setForm} error={error} editing={editing} close={() => setModalOpen(false)} saveRecord={saveRecord} />}
        </AnimatePresence>
      </>
    );
  }

  if (module.id === 'wifi') {
    return (
      <>
        <WifiView module={module} records={filteredRecords} query={query} setQuery={setQuery} openCreate={openCreate} openEdit={openEdit} duplicateRecord={duplicateRecord} deleteRecord={deleteRecord} />
        <AnimatePresence>
          {modalOpen && <RecordModal module={module} form={form} setForm={setForm} error={error} editing={editing} close={() => setModalOpen(false)} saveRecord={saveRecord} />}
        </AnimatePresence>
      </>
    );
  }

  if (module.id === 'contratos') {
    return (
      <>
        <ContractsView module={module} records={filteredRecords} query={query} setQuery={setQuery} openCreate={openCreate} openEdit={openEdit} duplicateRecord={duplicateRecord} deleteRecord={deleteRecord} selected={selected} />
        <AnimatePresence>
          {modalOpen && <RecordModal module={module} form={form} setForm={setForm} error={error} editing={editing} close={() => setModalOpen(false)} saveRecord={saveRecord} />}
        </AnimatePresence>
      </>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-[1.65rem] font-semibold text-white">{module.title}</h1>
          <p className="mt-1 text-sm text-slate-300">{module.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="os-button os-button-muted"><Download className="h-4 w-4" />Exportar</button>
          <button className="os-button os-button-muted"><FileText className="h-4 w-4" />Relatorio</button>
          <button className="os-button os-button-primary" onClick={openCreate}><Plus className="h-5 w-5" />{module.primaryAction}</button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((card, index) => (
          <motion.div className="os-card p-5" key={card.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
            <div className={`os-orb os-orb-${card.tone}`}><module.icon className="h-5 w-5" /></div>
            <div className="mt-3 text-sm text-slate-300">{card.label}</div>
            <div className="mt-1 text-2xl font-semibold text-white">{card.value}</div>
            <div className={`mt-2 text-xs ${card.tone === 'red' ? 'text-red-300' : card.tone === 'yellow' ? 'text-amber-300' : 'text-emerald-300'}`}>{card.helper}</div>
          </motion.div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="os-card overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-white/10 p-4 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input className="os-input pl-10" placeholder={module.searchPlaceholder} value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
            <label className="os-select-wrap">
              <span>Status:</span>
              <select value={status} onChange={(event) => setStatus(event.target.value)}>{statuses.map((item) => <option key={item}>{item}</option>)}</select>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </label>
            <label className="os-select-wrap">
              <span>Categoria:</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </label>
            <button className="os-button os-button-muted"><Filter className="h-4 w-4" />Filtros</button>
          </div>

          <div className="overflow-x-auto">
            <table className="os-table">
              <thead>
                <tr><th>Codigo</th><th>Cliente</th><th>Descricao</th><th>Responsavel</th><th>Data</th><th>Status</th><th>Prioridade</th><th>Acoes</th></tr>
              </thead>
              <tbody>
                {visibleRecords.map((record) => (
                  <tr key={record.id} className={selected?.id === record.id ? 'is-selected' : ''} onClick={() => setSelectedId(record.id)}>
                    <td className="font-medium text-white">{record.codigo}</td>
                    <td><div className="flex items-center gap-3"><span className="os-avatar">{record.cliente.slice(0, 2).toUpperCase()}</span><span>{record.cliente}</span></div></td>
                    <td className="max-w-[260px]"><div className="truncate text-white">{record.titulo}</div><div className="truncate text-xs text-slate-400">{record.categoria}</div></td>
                    <td>{record.responsavel}</td>
                    <td>{new Date(record.data).toLocaleDateString('pt-BR')}</td>
                    <td><span className={`os-badge ${statusClass(record.status)}`}>{record.status}</span></td>
                    <td><span className={`os-badge ${priorityClass(record.prioridade)}`}>{record.prioridade}</span></td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button className="os-icon-button" onClick={(event) => { event.stopPropagation(); setSelectedId(record.id); }} title="Ver"><Eye className="h-4 w-4" /></button>
                        <button className="os-icon-button" onClick={(event) => { event.stopPropagation(); openEdit(record); }} title="Editar"><Edit3 className="h-4 w-4" /></button>
                        <button className="os-icon-button" onClick={(event) => { event.stopPropagation(); duplicateRecord(record); }} title="Duplicar"><Copy className="h-4 w-4" /></button>
                        <button className="os-icon-button danger" onClick={(event) => { event.stopPropagation(); deleteRecord(record.id); }} title="Excluir"><Trash2 className="h-4 w-4" /></button>
                        <button className="os-icon-button" title="Mais"><MoreVertical className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-white/10 px-4 py-4 text-sm text-slate-300 sm:flex-row sm:items-center sm:justify-between">
            <span>Mostrando {visibleRecords.length ? (page - 1) * pageSize + 1 : 0} a {Math.min(page * pageSize, filteredRecords.length)} de {filteredRecords.length} registros</span>
            <div className="flex items-center gap-2">
              <button className="os-page-button" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft className="h-4 w-4" /></button>
              {Array.from({ length: totalPages }).slice(0, 5).map((_, index) => <button className={`os-page-button ${page === index + 1 ? 'active' : ''}`} key={index} onClick={() => setPage(index + 1)}>{index + 1}</button>)}
              <button className="os-page-button" disabled={page === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        </div>

        {selected && <DetailPanel selected={selected} openEdit={openEdit} close={() => setSelectedId('')} />}
      </section>

      <AnimatePresence>
        {modalOpen && (
          <RecordModal module={module} form={form} setForm={setForm} error={error} editing={editing} close={() => setModalOpen(false)} saveRecord={saveRecord} />
        )}
      </AnimatePresence>
    </div>
  );
}

function DashboardView({ module, records, openCreate }: { module: ModuleConfig; records: OsRecord[]; openCreate: () => void }) {
  const chartData = [
    { name: 'Jan', receita: 18000, os: 12 },
    { name: 'Fev', receita: 26000, os: 18 },
    { name: 'Mar', receita: 22000, os: 15 },
    { name: 'Abr', receita: 37000, os: 26 },
    { name: 'Mai', receita: 45500, os: 31 },
    { name: 'Jun', receita: 52000, os: 35 },
  ];
  const pieData = [
    { name: 'Switches', value: 2, color: '#2687ff' },
    { name: 'Access Points', value: 4, color: '#67c23a' },
    { name: 'Cameras', value: 6, color: '#a855f7' },
    { name: 'Outros', value: 4, color: '#fb923c' },
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex items-center gap-4">
          <img src="/imagen/logo.png" alt="SMARTTECH IoT OS" className="h-14 w-14 rounded-xl object-cover ring-1 ring-blue-400/30" />
          <div><h1 className="text-[1.75rem] font-semibold">SMARTTECH IoT OS</h1><p className="text-sm text-slate-300">{module.subtitle}</p></div>
        </div>
        <button className="os-button os-button-primary" onClick={openCreate}><Plus className="h-5 w-5" />Novo Registro</button>
      </header>
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        {dashboardStats.map((stat) => (
          <div className="os-card p-5" key={stat.label}><div className={`os-orb os-orb-${stat.tone}`}><stat.icon className="h-5 w-5" /></div><div className="mt-3 text-sm text-slate-300">{stat.label}</div><div className="mt-1 text-2xl font-semibold">{stat.value}</div><div className="mt-2 text-xs text-emerald-300">{stat.delta}</div></div>
        ))}
      </section>
      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="os-card p-5">
          <h2 className="mb-4 font-semibold">Faturamento e Servicos</h2>
          <div className="h-[310px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs><linearGradient id="colorReceita" x1="0" x2="0" y1="0" y2="1"><stop offset="5%" stopColor="#0a84ff" stopOpacity={0.45} /><stop offset="95%" stopColor="#0a84ff" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid stroke="#ffffff12" vertical={false} /><XAxis dataKey="name" stroke="#94a3b8" tickLine={false} axisLine={false} /><YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#08131f', border: '1px solid #1e3a5f', borderRadius: 8, color: '#fff' }} />
                <Area type="monotone" dataKey="receita" stroke="#0a84ff" fill="url(#colorReceita)" strokeWidth={3} /><Bar dataKey="os" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="os-card p-5">
          <h2 className="mb-4 font-semibold">Equipamentos por Tipo</h2>
          <div className="grid gap-4 md:grid-cols-[190px_1fr]">
            <div className="h-[190px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} innerRadius={55} outerRadius={82} dataKey="value">{pieData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie></PieChart></ResponsiveContainer></div>
            <div className="space-y-3 self-center">{pieData.map((item) => <div className="flex items-center justify-between text-sm" key={item.name}><span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span><span>{item.value}</span></div>)}</div>
          </div>
          <button className="os-button os-button-primary mt-5">Ver Equipamentos</button>
        </div>
      </section>
      <section className="grid gap-4 xl:grid-cols-3">
        <div className="os-card p-5 xl:col-span-2">
          <h2 className="mb-4 font-semibold">Atividades Recentes</h2>
          <div className="space-y-2">{records.slice(0, 5).map((record) => <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] p-3" key={record.id}><div><div className="font-medium">{record.titulo}</div><div className="text-sm text-slate-400">{record.cliente}</div></div><span className={`os-badge ${statusClass(record.status)}`}>{record.status}</span></div>)}</div>
        </div>
        <div className="os-card p-5">
          <h2 className="mb-4 font-semibold">Ultimos Testes Realizados</h2>
          {['Teste de Internet', 'Teste de Rede Cabeada', 'Teste de Wi-Fi', 'Teste de Velocidade', 'Teste de Acesso aos APs'].map((test) => <div className="mb-3 flex items-center justify-between text-sm" key={test}><span>{test}</span><span className="os-badge bg-emerald-500/15 text-emerald-300 border-emerald-500/20">Aprovado</span></div>)}
        </div>
      </section>
    </div>
  );
}

function AutomationView({ module, records, openCreate, openEdit, duplicateRecord, deleteRecord }: { module: ModuleConfig; records: OsRecord[]; openCreate: () => void; openEdit: (record: OsRecord) => void; duplicateRecord: (record: OsRecord) => void; deleteRecord: (id: string) => void }) {
  const devices = [
    ['Lampada Sala', 'Sala de Estar', Lightbulb, true, 'yellow'],
    ['Tomada TV', 'Sala de Estar', Power, true, 'green'],
    ['Ar Condicionado', 'Sala de Estar', Zap, true, 'blue'],
    ['Cortina Sala', 'Sala de Estar', Home, false, 'purple'],
    ['Luz Cozinha', 'Cozinha', Lightbulb, true, 'yellow'],
    ['Interruptor Closet', 'Quarto Casal', Power, false, 'purple'],
    ['Ventilador Quarto', 'Quarto Casal', Zap, true, 'cyan'],
    ['Luz Banheiro', 'Banheiro', Lightbulb, false, 'yellow'],
  ] as const;
  const pieData = [
    { name: 'Online', value: 96, color: '#60c43c' },
    { name: 'Offline', value: 10, color: '#ef4444' },
    { name: 'Inativos', value: 9, color: '#2687ff' },
    { name: 'Outros', value: 13, color: '#9333ea' },
  ];
  const energy = Array.from({ length: 12 }, (_, index) => ({ name: `${index * 2}h`, value: [2, 7, 8, 13, 8, 12, 16, 19, 23, 15, 13, 18][index] }));

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div><h1 className="text-[1.65rem] font-semibold">{module.title}</h1><p className="mt-1 text-sm text-slate-300">{module.subtitle}</p></div>
        <div className="flex flex-wrap gap-3"><button className="os-button os-button-muted"><Clock3 className="h-4 w-4" />Historico de Eventos</button><button className="os-button os-button-primary" onClick={openCreate}><Plus className="h-5 w-5" />Adicionar Dispositivo</button></div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ['Dispositivos', '128', 'Online 96', 'blue'],
          ['Ambientes', '12', 'Ativos', 'green'],
          ['Cenas', '24', 'Ativas', 'purple'],
          ['Rotinas', '18', 'Ativas', 'blue'],
          ['Consumo Hoje', '12,4 kWh', '+8,2% vs ontem', 'green'],
        ].map(([label, value, helper, tone]) => <KpiCard key={label} icon={label === 'Consumo Hoje' ? Zap : module.icon} label={label} value={value} helper={helper} tone={tone} />)}
      </section>

      <Tabs tabs={['Visao Geral', 'Dispositivos', 'Ambientes', 'Cenas', 'Rotinas', 'Usuarios', 'Relatorios', 'Configuracoes']} />

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="os-card p-4">
            <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Dispositivos Rapidos</h2><button className="text-sm text-blue-300">Ver todos os dispositivos</button></div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {devices.map(([name, room, Icon, active, tone]) => (
                <div key={name} className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-center">
                  <Icon className={`mx-auto mb-3 h-8 w-8 ${tone === 'yellow' ? 'text-amber-300' : tone === 'green' ? 'text-green-300' : tone === 'purple' ? 'text-purple-300' : 'text-blue-300'}`} />
                  <div className="text-sm font-medium">{name}</div><div className="text-xs text-slate-400">{room}</div>
                  <button className={`mx-auto mt-3 flex h-6 w-12 items-center rounded-full p-1 ${active ? 'bg-blue-600' : 'bg-slate-700'}`}><span className={`h-4 w-4 rounded-full bg-white transition ${active ? 'translate-x-6' : ''}`} /></button>
                  <div className={`mt-2 text-xs ${active ? 'text-blue-300' : 'text-slate-400'}`}>{active ? 'Ligado' : 'Desligado'}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <ScenePanel />
            <RoutinePanel />
          </div>
          <ModuleRecordsPanel records={records} openEdit={openEdit} duplicateRecord={duplicateRecord} deleteRecord={deleteRecord} title="Registros de Automacao" />
        </div>
        <div className="space-y-4">
          <PieSummary title="Resumo da Automacao" center="128" sub="dispositivos" data={pieData} />
          <div className="os-card p-4"><h2 className="font-semibold">Consumo de Energia</h2><div className="mt-3 text-2xl font-semibold">12,4 kWh</div><div className="h-32"><ResponsiveContainer width="100%" height="100%"><BarChart data={energy}><XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} /><Bar dataKey="value" fill="#58b947" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div></div>
          <EventsPanel />
        </div>
      </section>
    </div>
  );
}

function WifiView({ module, records, query, setQuery, openCreate, openEdit, duplicateRecord, deleteRecord }: { module: ModuleConfig; records: OsRecord[]; query: string; setQuery: (value: string) => void; openCreate: () => void; openEdit: (record: OsRecord) => void; duplicateRecord: (record: OsRecord) => void; deleteRecord: (id: string) => void }) {
  const networks = ['CORPORATIVA', 'VISITANTES', 'CFTV', 'IOT', 'ADM'];
  const topology = ['AP-RECEPCAO', 'AP-ESCRITORIO', 'AP-SALA-REUNIAO', 'AP-ESTOQUE'];
  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div><h1 className="text-[1.65rem] font-semibold">{module.title}</h1><p className="mt-1 text-sm text-slate-300">{module.subtitle}</p></div>
        <div className="flex flex-wrap gap-3"><button className="os-button os-button-muted"><Router className="h-4 w-4" />Mapa de Rede</button><button className="os-button os-button-muted"><FileText className="h-4 w-4" />Relatorio</button><button className="os-button os-button-primary" onClick={openCreate}><Plus className="h-5 w-5" />Adicionar Rede</button></div>
      </header>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ['Redes Ativas', '12', '+2 este mes', 'blue'],
          ['Access Points', '24', 'Online: 20 - Offline: 4', 'blue'],
          ['Clientes Conectados', '156', '2.4GHz: 78 - 5GHz: 78', 'blue'],
          ['Trafego Hoje', '1,24 TB', '+18,6% vs ontem', 'green'],
          ['Performance', 'Otima', 'Todos os sistemas OK', 'red'],
        ].map(([label, value, helper, tone]) => <KpiCard key={label} icon={label === 'Trafego Hoje' ? Signal : Wifi} label={label} value={value} helper={helper} tone={tone} />)}
      </section>
      <Tabs tabs={['Visao Geral', 'Redes', 'Access Points', 'Clientes', 'Topologia', 'Performance', 'Relatorios', 'Configuracoes']} />
      <section className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <div className="os-card overflow-hidden">
            <div className="flex items-center justify-between p-4"><h2 className="font-semibold">Redes Wi-Fi</h2><div className="relative w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className="os-input py-2 pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar rede..." /></div></div>
            <table className="os-table min-w-[720px]"><thead><tr><th>Nome da Rede</th><th>VLAN</th><th>Banda</th><th>Clientes</th><th>Trafego Hoje</th><th>Status</th><th>Acoes</th></tr></thead><tbody>{networks.map((network, index) => { const record = records[index % Math.max(records.length, 1)]; return <tr key={network}><td><Wifi className="mr-3 inline h-5 w-5 text-blue-300" />{network}<div className="text-xs text-slate-400">Rede {network.toLowerCase()}</div></td><td>{(index + 1) * 10}</td><td>{index === 4 ? '5GHz' : '2.4GHz / 5GHz'}</td><td>{[62, 35, 18, 24, 17][index]}</td><td>{[482, 215, 128, 96, 156][index]} GB</td><td><span className="os-badge bg-emerald-500/15 text-emerald-300 border-emerald-500/20">Online</span></td><td>{record && <div className="flex gap-1"><button className="os-icon-button" onClick={() => openEdit(record)}><Edit3 className="h-4 w-4" /></button><button className="os-icon-button" onClick={() => duplicateRecord(record)}><Copy className="h-4 w-4" /></button><button className="os-icon-button danger" onClick={() => deleteRecord(record.id)}><Trash2 className="h-4 w-4" /></button></div>}</td></tr>; })}</tbody></table>
          </div>
          <div className="grid gap-4 lg:grid-cols-2"><MiniTable title="Access Points" rows={topology} /><MiniTable title="Clientes Conectados" rows={['Notebook-Joao', 'iPhone-Maria', 'Galaxy-S22', 'Camera-01', 'Sensor-Porta']} /></div>
        </div>
        <div className="space-y-4">
          <BandwidthPanel />
          <TopologyPanel />
          <EventsPanel title="Alertas e Notificacoes" />
        </div>
      </section>
    </div>
  );
}

function ContractsView({ module, records, query, setQuery, openCreate, openEdit, duplicateRecord, deleteRecord, selected }: { module: ModuleConfig; records: OsRecord[]; query: string; setQuery: (value: string) => void; openCreate: () => void; openEdit: (record: OsRecord) => void; duplicateRecord: (record: OsRecord) => void; deleteRecord: (id: string) => void; selected?: OsRecord }) {
  const current = selected || records[0];
  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div><h1 className="text-[1.65rem] font-semibold">{module.title}</h1><p className="mt-1 text-sm text-slate-300">{module.subtitle}</p></div>
        <div className="flex flex-wrap gap-3"><button className="os-button os-button-muted"><FileText className="h-4 w-4" />Relatorio</button><button className="os-button os-button-muted"><Download className="h-4 w-4" />Exportar</button><button className="os-button os-button-primary" onClick={openCreate}><Plus className="h-5 w-5" />Novo Contrato</button></div>
      </header>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard icon={FileText} label="Contratos Ativos" value="128" helper="+18 este mes" tone="blue" />
        <KpiCard icon={CircleDollarSign} label="Receita Recorrente (MRR)" value="R$ 37.890,00" helper="+22,4% este mes" tone="green" />
        <KpiCard icon={CalendarDays} label="Receita Anual (ARR)" value="R$ 454.680,00" helper="+22,4% este mes" tone="blue" />
        <KpiCard icon={Clock3} label="A Vencer (7 dias)" value="12" helper="Atencao necessaria" tone="yellow" />
        <KpiCard icon={Bell} label="Inadimplentes" value="8" helper="Acao necessaria" tone="red" />
      </section>
      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="os-card overflow-hidden">
          <Tabs tabs={['Todos', 'Ativos', 'A Vencer', 'Inadimplentes', 'Cancelados', 'Suspensos']} compact />
          <div className="flex flex-col gap-3 border-y border-white/10 p-4 lg:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className="os-input pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por contrato, cliente ou plano..." /></div><button className="os-button os-button-muted"><Filter className="h-4 w-4" />Filtros</button></div>
          <table className="os-table"><thead><tr><th>Contrato</th><th>Cliente</th><th>Plano</th><th>Valor Mensal</th><th>Vencimento</th><th>Status</th><th>SLA</th><th>Acoes</th></tr></thead><tbody>{records.slice(0, 8).map((record, index) => <tr key={record.id}><td>{record.codigo}<div className="text-xs text-slate-400">Inicio: {new Date(record.data).toLocaleDateString('pt-BR')}</div></td><td><span className="os-avatar mr-3 inline-grid">{record.cliente.slice(0, 2).toUpperCase()}</span>{record.cliente}</td><td><span className="os-badge bg-emerald-500/15 text-emerald-300 border-emerald-500/20">SMART BUSINESS</span><div className="text-xs text-slate-400">Suporte completo</div></td><td>{currency([399.9, 199.9, 99.9, 699.9, 79.9][index % 5])}</td><td>{index % 3 === 0 ? 'Em 7 dias' : index % 3 === 1 ? 'Em 2 dias' : 'Vence hoje'}</td><td><span className={`os-badge ${index === 3 ? 'bg-red-500/15 text-red-300 border-red-500/20' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'}`}>{index === 3 ? 'Vencido' : 'Ativo'}</span></td><td>{index % 2 ? '48h' : '24h'}</td><td><div className="flex gap-1"><button className="os-icon-button" onClick={() => openEdit(record)}><Eye className="h-4 w-4" /></button><button className="os-icon-button" onClick={() => duplicateRecord(record)}><Copy className="h-4 w-4" /></button><button className="os-icon-button danger" onClick={() => deleteRecord(record.id)}><Trash2 className="h-4 w-4" /></button></div></td></tr>)}</tbody></table>
        </div>
        {current && <ContractSidePanel record={current} openEdit={openEdit} />}
      </section>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, helper, tone }: { icon: React.ElementType; label: string; value: string; helper: string; tone: string }) {
  return (
    <div className="os-card p-5">
      <div className={`os-orb os-orb-${tone}`}><Icon className="h-5 w-5" /></div>
      <div className="mt-3 text-sm text-slate-300">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      <div className={`mt-2 text-xs ${tone === 'red' ? 'text-red-300' : tone === 'yellow' ? 'text-amber-300' : 'text-emerald-300'}`}>{helper}</div>
    </div>
  );
}

function Tabs({ tabs, compact }: { tabs: string[]; compact?: boolean }) {
  return (
    <div className={`flex gap-7 overflow-x-auto border-b border-white/10 ${compact ? 'px-4' : ''}`}>
      {tabs.map((tab, index) => (
        <button key={tab} className={`shrink-0 border-b-2 py-3 text-sm ${index === 0 ? 'border-blue-400 text-blue-300' : 'border-transparent text-slate-400'}`}>{tab}</button>
      ))}
    </div>
  );
}

function PieSummary({ title, center, sub, data }: { title: string; center: string; sub: string; data: Array<{ name: string; value: number; color: string }> }) {
  return (
    <div className="os-card p-4">
      <h2 className="mb-4 font-semibold">{title}</h2>
      <div className="grid items-center gap-3 sm:grid-cols-[150px_1fr]">
        <div className="relative h-36">
          <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} innerRadius={45} outerRadius={65} dataKey="value">{data.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie></PieChart></ResponsiveContainer>
          <div className="absolute inset-0 grid place-items-center text-center"><div><div className="text-2xl font-semibold">{center}</div><div className="text-xs text-slate-400">{sub}</div></div></div>
        </div>
        <div className="space-y-3 text-sm">{data.map((item) => <div className="flex items-center justify-between" key={item.name}><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span><span>{Math.round(item.value / data.reduce((sum, entry) => sum + entry.value, 0) * 100)}%</span></div>)}</div>
      </div>
    </div>
  );
}

function ScenePanel() {
  return (
    <div className="os-card p-4">
      <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Cenas Favoritas</h2><button className="text-sm text-blue-300">Ver todas</button></div>
      <div className="grid grid-cols-3 gap-3">{['Bom Dia', 'Noite', 'Filme', 'Festa', 'Ausente'].map((scene) => <button key={scene} className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-center text-sm hover:border-blue-400/30"><Power className="mx-auto mb-2 h-5 w-5 text-green-300" />{scene}</button>)}</div>
    </div>
  );
}

function RoutinePanel() {
  return (
    <div className="os-card p-4">
      <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Rotinas Ativas</h2><button className="text-sm text-blue-300">Ver todas</button></div>
      {['Rotina Bom Dia', 'Rotina Noite', 'Desligar Luzes', 'Irrigacao Jardim', 'Modo Ausente'].map((routine, index) => <div className="mb-3 flex items-center justify-between text-sm" key={routine}><div><div>{routine}</div><div className="text-xs text-slate-400">{index % 2 ? 'Todos os dias as 22:00' : 'Todos os dias as 06:30'}</div></div><span className={`os-badge ${index === 4 ? 'bg-slate-500/20 text-slate-300 border-white/10' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'}`}>{index === 4 ? 'Inativa' : 'Ativa'}</span></div>)}
    </div>
  );
}

function EventsPanel({ title = 'Eventos Recentes' }: { title?: string }) {
  return (
    <div className="os-card p-4">
      <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">{title}</h2><button className="text-sm text-blue-300">Ver todos</button></div>
      {['Lampada Sala ligada', 'Cortina Sala fechada', 'Ar Condicionado desligado', 'Cena Noite ativada', 'Tomada TV desligada'].map((event, index) => <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3 text-sm last:border-0" key={event}><div className="flex items-center gap-3"><span className={`os-orb h-8 w-8 ${index % 2 ? 'os-orb-purple' : 'os-orb-green'}`}><Zap className="h-4 w-4" /></span><span>{event}<div className="text-xs text-slate-400">Sala de Estar</div></span></div><span className="text-xs text-slate-400">Hoje 08:{30 - index * 5}</span></div>)}
    </div>
  );
}

function MiniTable({ title, rows }: { title: string; rows: string[] }) {
  return (
    <div className="os-card p-4">
      <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">{title}</h2><button className="text-sm text-blue-300">Ver todos</button></div>
      {rows.map((row, index) => <div className="mb-3 flex items-center justify-between text-sm" key={row}><span className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-white text-slate-700"><Server className="h-4 w-4" /></span>{row}<span className="text-xs text-slate-400">{index % 2 ? '5GHz' : '2.4GHz'}</span></span><button className="os-icon-button h-8 w-8"><Eye className="h-4 w-4" /></button></div>)}
    </div>
  );
}

function BandwidthPanel() {
  return (
    <div className="os-card p-4">
      <h2 className="font-semibold">Uso de Banda</h2>
      {[['Download', '780,42 GB', '62%', 'bg-blue-500'], ['Upload', '480,18 GB', '38%', 'bg-green-500']].map(([label, value, percent, color]) => <div className="mt-5" key={label}><div className="text-xs text-slate-400">{label}</div><div className="mt-1 text-xl font-semibold">{value}</div><div className="mt-3 flex items-center gap-3"><div className="h-2 flex-1 rounded-full bg-slate-800"><div className={`h-full rounded-full ${color}`} style={{ width: percent }} /></div><span className="text-xs text-slate-300">{percent}</span></div></div>)}
    </div>
  );
}

function TopologyPanel() {
  return (
    <div className="os-card p-4 text-center">
      <div className="mb-3 flex items-center justify-between text-left"><h2 className="font-semibold">Topologia da Rede</h2><button className="text-sm text-blue-300">Ver mapa</button></div>
      <Globe2 className="mx-auto h-9 w-9 text-cyan-300" /><div className="mx-auto h-8 w-px bg-green-500/60" /><div className="mx-auto rounded-md bg-slate-700 px-5 py-2 text-sm">Firewall</div><div className="mx-auto h-8 w-px bg-green-500/60" /><div className="mx-auto rounded-md bg-slate-700 px-6 py-2 text-sm">Switch Principal</div>
      <div className="mt-5 grid grid-cols-4 gap-2 text-xs">{['AP-RECEPCAO', 'AP-ESCRITORIO', 'AP-SALA', 'AP-ESTOQUE'].map((ap, index) => <div key={ap}><span className={`mx-auto mb-2 block h-9 w-12 rounded-full ${index === 3 ? 'bg-red-500/70' : 'bg-white'}`} /><span className="text-slate-300">{ap}</span></div>)}</div>
    </div>
  );
}

function ModuleRecordsPanel({ records, openEdit, duplicateRecord, deleteRecord, title }: { records: OsRecord[]; openEdit: (record: OsRecord) => void; duplicateRecord: (record: OsRecord) => void; deleteRecord: (id: string) => void; title: string }) {
  return (
    <div className="os-card p-4">
      <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">{title}</h2><span className="text-sm text-slate-400">{records.length} itens</span></div>
      {records.slice(0, 4).map((record) => (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm" key={record.id}>
          <div><div className="font-medium">{record.titulo}</div><div className="text-xs text-slate-400">{record.codigo} - {record.cliente}</div></div>
          <div className="flex gap-1"><button className="os-icon-button" onClick={() => openEdit(record)}><Edit3 className="h-4 w-4" /></button><button className="os-icon-button" onClick={() => duplicateRecord(record)}><Copy className="h-4 w-4" /></button><button className="os-icon-button danger" onClick={() => deleteRecord(record.id)}><Trash2 className="h-4 w-4" /></button></div>
        </div>
      ))}
    </div>
  );
}

function ContractSidePanel({ record, openEdit }: { record: OsRecord; openEdit: (record: OsRecord) => void }) {
  return (
    <aside className="os-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 p-5"><div className="flex items-center gap-3"><h2 className="text-xl font-semibold">{record.codigo}</h2><span className="os-badge bg-emerald-500/15 text-emerald-300 border-emerald-500/20">Ativo</span></div><X className="h-4 w-4 text-slate-400" /></div>
      <div className="p-5">
        <Tabs tabs={['Resumo', 'Servicos', 'Cobrancas', 'Historico']} compact />
        <div className="mt-5 space-y-5 text-sm">
          <Detail label="Cliente" value={`${record.cliente} - ${record.contato}`} />
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4"><Home className="mb-3 h-8 w-8 text-green-300" /><div className="font-semibold">SMART BUSINESS</div><div className="text-slate-400">Suporte completo para empresa</div><div className="mt-2">{currency(399.9)} / mes</div></div>
          <div className="grid grid-cols-2 gap-3"><Detail label="Proximo Vencimento" value="15/05/2026" /><Detail label="SLA" value="24 horas" /><Detail label="Renovacao" value="Automatica" /><Detail label="Prazo Minimo" value="12 meses" /></div>
          <div><h3 className="mb-3 font-medium">Equipamentos Cobertos</h3>{['1 Switch TP-Link TL-SG2428', '4 Access Points TP-Link EAP225', '6 Cameras Intelbras IP', '1 Roteador Mikrotik RB4011'].map((item) => <div className="mb-2 flex items-center gap-2 text-slate-300" key={item}><Check className="h-4 w-4 text-green-400" />{item}</div>)}</div>
          <button className="os-button os-button-primary w-full" onClick={() => openEdit(record)}><FileText className="h-4 w-4" />Gerar Contrato PDF</button>
        </div>
      </div>
    </aside>
  );
}

function DetailPanel({ selected, openEdit, close }: { selected: OsRecord; openEdit: (record: OsRecord) => void; close: () => void }) {
  return (
    <aside className="os-card overflow-hidden">
      <div className="flex items-start justify-between border-b border-white/10 p-5">
        <div><div className="flex items-center gap-3"><h2 className="text-xl font-semibold">{selected.codigo}</h2><span className={`os-badge ${statusClass(selected.status)}`}>{selected.status}</span></div><p className="mt-1 text-sm text-slate-400">{selected.titulo}</p></div>
        <button className="os-icon-button" onClick={close}><X className="h-4 w-4" /></button>
      </div>
      <div className="flex border-b border-white/10 px-5 text-sm">{['Detalhes', 'Produtos/Servicos', 'Historico'].map((tab, index) => <button className={`border-b-2 px-3 py-4 ${index === 0 ? 'border-blue-400 text-blue-300' : 'border-transparent text-slate-400'}`} key={tab}>{tab}</button>)}</div>
      <div className="space-y-5 p-5">
        <div className="grid grid-cols-2 gap-4 text-sm"><Detail label="Cliente" value={selected.cliente} /><Detail label="Data" value={new Date(selected.data).toLocaleDateString('pt-BR')} /><Detail label="Contato" value={selected.contato} /><Detail label="Responsavel" value={selected.responsavel} /><Detail label="Local" value={selected.local} wide /><Detail label="Valor" value={currency(selected.valor)} /><Detail label="Prioridade" value={selected.prioridade} /></div>
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4"><h3 className="mb-2 font-medium">Descricao / Observacoes</h3><p className="text-sm leading-6 text-slate-300">{selected.descricao}</p></div>
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4"><h3 className="mb-4 font-medium">Status Atual</h3><div className="grid grid-cols-4 gap-2">{['Aberta', 'Em Andamento', 'Aguardando', 'Concluida'].map((step, index) => <div key={step} className="text-xs text-slate-400"><div className={`mb-2 h-2 rounded-full ${index < 2 ? 'bg-blue-500' : 'bg-slate-700'}`} />{step}</div>)}</div></div>
        <div><div className="mb-3 flex items-center justify-between"><h3 className="font-medium">Anexos</h3><button className="text-xs text-blue-300">Ver todos</button></div>{['Topologia_Rede.pdf', 'Teste_Speed_15-04.png'].map((file) => <div className="mb-2 flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm" key={file}><span className="flex items-center gap-2"><Paperclip className="h-4 w-4 text-blue-300" />{file}</span><Download className="h-4 w-4 text-slate-400" /></div>)}</div>
        <div className="grid grid-cols-2 gap-3"><button className="os-button os-button-muted" onClick={() => openEdit(selected)}><Edit3 className="h-4 w-4" />Editar</button><button className="os-button os-button-primary"><Check className="h-4 w-4" />Finalizar</button></div>
      </div>
    </aside>
  );
}

function Detail({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return <div className={wide ? 'col-span-2' : ''}><div className="mb-1 text-xs text-slate-400">{label}</div><div className="text-slate-100">{value}</div></div>;
}

function RecordModal({ module, form, setForm, error, editing, close, saveRecord }: { module: ModuleConfig; form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>>; error: string; editing: OsRecord | null; close: () => void; saveRecord: (event: React.FormEvent) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} />
      <motion.form className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-blue-400/20 bg-[#06101b] shadow-2xl shadow-blue-950/40" initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.96 }} onSubmit={saveRecord}>
        <div className="flex items-center justify-between border-b border-white/10 p-5"><div><h2 className="text-xl font-semibold">{editing ? 'Editar' : 'Novo'} {module.singular}</h2><p className="text-sm text-slate-400">SMARTTECH IoT OS</p></div><button type="button" className="os-icon-button" onClick={close}><X className="h-5 w-5" /></button></div>
        <div className="grid gap-4 overflow-y-auto p-5 md:grid-cols-2">
          {module.fields.map((field) => {
            const value = String((form as any)[field.key] ?? '');
            if (field.type === 'textarea') return <label className="md:col-span-2" key={field.key}><span className="os-label">{field.label}{field.required ? ' *' : ''}</span><textarea className="os-input min-h-28 resize-y" value={value} onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))} /></label>;
            if (field.type === 'select') return <label key={field.key}><span className="os-label">{field.label}{field.required ? ' *' : ''}</span><select className="os-input" value={value} onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}>{field.options?.map((option) => <option key={option}>{option}</option>)}</select></label>;
            return <label key={field.key}><span className="os-label">{field.label}{field.required ? ' *' : ''}</span><input className="os-input" type={field.type || 'text'} value={value} onChange={(event) => setForm((current) => ({ ...current, [field.key]: field.type === 'number' ? Number(event.target.value) : event.target.value }))} /></label>;
          })}
        </div>
        {error && <div className="mx-5 mb-3 rounded-lg border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}
        <div className="flex flex-wrap justify-end gap-3 border-t border-white/10 p-5"><button type="button" className="os-button os-button-muted" onClick={close}>Cancelar</button><button type="button" className="os-button os-button-muted"><Send className="h-4 w-4" />Enviar</button><button type="submit" className="os-button os-button-primary"><Check className="h-4 w-4" />Salvar</button></div>
      </motion.form>
    </div>
  );
}
