import {
  Activity,
  Archive,
  Banknote,
  Boxes,
  BriefcaseBusiness,
  ClipboardCheck,
  FileBarChart,
  FileText,
  Gauge,
  LayoutDashboard,
  LockKeyhole,
  LucideIcon,
  Map,
  Package,
  ReceiptText,
  Router,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Wifi,
  Wrench,
} from 'lucide-react';

export type ModuleId =
  | 'dashboard'
  | 'clientes'
  | 'orcamentos'
  | 'ordens'
  | 'prontuarios'
  | 'mapa'
  | 'produtos'
  | 'kits'
  | 'estoque'
  | 'financeiro'
  | 'notas'
  | 'relatorios'
  | 'configuracoes'
  | 'usuarios'
  | 'contratos'
  | 'automacao'
  | 'wifi';

export type Field = {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'email' | 'date' | 'select' | 'textarea';
  options?: string[];
  required?: boolean;
};

export type OsRecord = {
  id: string;
  codigo: string;
  titulo: string;
  cliente: string;
  categoria: string;
  status: string;
  prioridade: string;
  responsavel: string;
  data: string;
  valor: number;
  descricao: string;
  contato: string;
  local: string;
};

export type ModuleConfig = {
  id: ModuleId;
  title: string;
  subtitle: string;
  path: string;
  icon: LucideIcon;
  singular: string;
  searchPlaceholder: string;
  primaryAction: string;
  tableLabel: string;
  fields: Field[];
  records: OsRecord[];
};

const commonFields: Field[] = [
  { key: 'titulo', label: 'Titulo', required: true },
  { key: 'cliente', label: 'Cliente', required: true },
  { key: 'categoria', label: 'Categoria', required: true },
  { key: 'status', label: 'Status', type: 'select', options: ['Aberta', 'Em Andamento', 'Pendente', 'Aprovado', 'Concluida', 'Ativo', 'Pago', 'Emitida', 'Bloqueado'], required: true },
  { key: 'prioridade', label: 'Prioridade', type: 'select', options: ['Baixa', 'Media', 'Alta', 'Critica'], required: true },
  { key: 'responsavel', label: 'Responsavel', required: true },
  { key: 'data', label: 'Data', type: 'date', required: true },
  { key: 'valor', label: 'Valor', type: 'number', required: true },
  { key: 'contato', label: 'Contato' },
  { key: 'local', label: 'Local' },
  { key: 'descricao', label: 'Descricao', type: 'textarea', required: true },
];

const baseRecords: OsRecord[] = [
  {
    id: 'rec-001',
    codigo: 'OS-000191',
    titulo: 'Instalacao de switch e configuracao de rede',
    cliente: 'Empresa Exemplo LTDA',
    categoria: 'Rede Corporativa',
    status: 'Em Andamento',
    prioridade: 'Alta',
    responsavel: 'Joao Tecnico',
    data: '2026-05-30',
    valor: 12410,
    descricao: 'Estruturacao completa de rede com switches gerenciaveis, VLANs, APs e documentacao tecnica.',
    contato: '(11) 99999-0010',
    local: 'Vila Comercial - Sao Paulo - SP',
  },
  {
    id: 'rec-002',
    codigo: 'CLI-000086',
    titulo: 'Condominio Residencial Alpha',
    cliente: 'Condominio Residencial Alpha',
    categoria: 'Cliente Empresa',
    status: 'Ativo',
    prioridade: 'Media',
    responsavel: 'Carlos Silva',
    data: '2026-05-28',
    valor: 8500,
    descricao: 'Cliente recorrente com contratos de suporte, monitoramento Wi-Fi e manutencao preventiva.',
    contato: '(11) 98888-4400',
    local: 'Alphaville - Barueri - SP',
  },
  {
    id: 'rec-003',
    codigo: 'ORC-000123',
    titulo: 'Orcamento automacao residencial premium',
    cliente: 'Joao da Silva ME',
    categoria: 'Automacao',
    status: 'Pendente',
    prioridade: 'Alta',
    responsavel: 'Pedro Santos',
    data: '2026-05-26',
    valor: 21580,
    descricao: 'Cotacao de iluminacao inteligente, sensores, roteadores mesh e integracao por aplicativo.',
    contato: '(11) 97777-2211',
    local: 'Moema - Sao Paulo - SP',
  },
  {
    id: 'rec-004',
    codigo: 'PRT-000042',
    titulo: 'Prontuario tecnico rede Wi-Fi',
    cliente: 'Restaurante Sabor & Cia',
    categoria: 'Prontuario',
    status: 'Concluida',
    prioridade: 'Media',
    responsavel: 'Lucas Pereira',
    data: '2026-05-22',
    valor: 5200,
    descricao: 'Documentacao de topologia, senhas tecnicas, rack, APs, portas utilizadas e fotos da instalacao.',
    contato: '(11) 96666-1030',
    local: 'Tatuape - Sao Paulo - SP',
  },
  {
    id: 'rec-005',
    codigo: 'FIN-000318',
    titulo: 'Recebimento contrato mensal',
    cliente: 'Industria Exemplo LTDA',
    categoria: 'Mensalidade',
    status: 'Pago',
    prioridade: 'Baixa',
    responsavel: 'Admin',
    data: '2026-05-20',
    valor: 1890,
    descricao: 'Pagamento referente ao monitoramento remoto, suporte tecnico e relatorios de disponibilidade.',
    contato: '(11) 95555-7812',
    local: 'ABC Paulista - SP',
  },
  {
    id: 'rec-006',
    codigo: 'WIFI-000077',
    titulo: 'Rede Wi-Fi visitante isolada',
    cliente: 'Clinica Saude Total',
    categoria: 'Wi-Fi',
    status: 'Aprovado',
    prioridade: 'Media',
    responsavel: 'Joao Tecnico',
    data: '2026-05-18',
    valor: 3400,
    descricao: 'Configuracao de SSIDs separados, voucher de visitantes, controle de banda e portal cativo.',
    contato: '(11) 94444-9022',
    local: 'Pinheiros - Sao Paulo - SP',
  },
  {
    id: 'rec-007',
    codigo: 'KIT-000064',
    titulo: 'Kit Wi-Fi premium empresarial',
    cliente: 'Comercio Total LTDA',
    categoria: 'Kit',
    status: 'Ativo',
    prioridade: 'Alta',
    responsavel: 'Carlos Silva',
    data: '2026-05-16',
    valor: 6790,
    descricao: 'Kit composto por roteador principal, tres access points, nobreak e cabeamento Cat6.',
    contato: '(11) 93333-8877',
    local: 'Osasco - SP',
  },
  {
    id: 'rec-008',
    codigo: 'NF-000781',
    titulo: 'NF-e servicos de instalacao',
    cliente: 'Mercado Real LTDA',
    categoria: 'Fiscal',
    status: 'Emitida',
    prioridade: 'Baixa',
    responsavel: 'Admin',
    data: '2026-05-14',
    valor: 2750,
    descricao: 'Nota fiscal emitida para servicos tecnicos, instalacao de cameras e configuracao de rede.',
    contato: '(11) 92222-5500',
    local: 'Santo Andre - SP',
  },
  {
    id: 'rec-009',
    codigo: 'AUT-000118',
    titulo: 'Cena inteligente de seguranca',
    cliente: 'Apartamento 101',
    categoria: 'Automacao Inteligente',
    status: 'Em Andamento',
    prioridade: 'Critica',
    responsavel: 'Pedro Santos',
    data: '2026-05-12',
    valor: 4300,
    descricao: 'Automacao para acionar iluminacao, sirene e aviso mobile quando sensores detectarem intrusao.',
    contato: '(11) 91111-1313',
    local: 'Vila Mariana - Sao Paulo - SP',
  },
  {
    id: 'rec-010',
    codigo: 'EST-000245',
    titulo: 'Reposicao de switches e APs',
    cliente: 'SmartTech Estoque',
    categoria: 'Entrada',
    status: 'Pendente',
    prioridade: 'Media',
    responsavel: 'Admin',
    data: '2026-05-10',
    valor: 15100,
    descricao: 'Entrada planejada de switches gerenciaveis, access points dual band, conectores e cabos.',
    contato: '(11) 99999-9999',
    local: 'Estoque Central',
  },
];

const moduleMeta = [
  { id: 'dashboard', title: 'Dashboard', subtitle: 'Visao operacional em tempo real da SMARTTECH IoT OS.', path: '/', icon: LayoutDashboard },
  { id: 'clientes', title: 'Clientes', subtitle: 'Gerencie empresas, residencias, contatos e historico tecnico.', path: '/clientes', icon: Users },
  { id: 'orcamentos', title: 'Orcamentos', subtitle: 'Gerencie e acompanhe todos os orcamentos da sua empresa.', path: '/orcamentos', icon: FileText },
  { id: 'ordens', title: 'Ordens de Servico', subtitle: 'Controle aberturas, execucao, prioridade e encerramento das OS.', path: '/ordens-de-servico', icon: Wrench },
  { id: 'prontuarios', title: 'Prontuarios Tecnicos', subtitle: 'Documente redes, equipamentos, portas, testes, fotos e contratos.', path: '/prontuarios-tecnicos', icon: ClipboardCheck },
  { id: 'automacao', title: 'Automacao Inteligente', subtitle: 'Cenas, sensores, regras, dispositivos e monitoramento inteligente.', path: '/automacao-inteligente', icon: Sparkles },
  { id: 'wifi', title: 'Redes Wi-Fi', subtitle: 'SSIDs, senhas, VLANs, canais, APs e cobertura Wi-Fi.', path: '/redes-wifi', icon: Wifi },
  { id: 'contratos', title: 'Contratos Recorrentes', subtitle: 'Planos mensais, SLAs, renovacoes e faturamento recorrente.', path: '/contratos-recorrentes', icon: BriefcaseBusiness },
  { id: 'produtos', title: 'Produtos', subtitle: 'Catalogo tecnico com valores, categorias e disponibilidade.', path: '/produtos', icon: Package },
  { id: 'kits', title: 'Kits', subtitle: 'Monte pacotes de Wi-Fi, automacao, cameras e rede corporativa.', path: '/kits', icon: Boxes },
  { id: 'estoque', title: 'Estoque', subtitle: 'Controle entradas, saidas, alertas e itens criticos.', path: '/estoque', icon: Archive },
  { id: 'financeiro', title: 'Financeiro', subtitle: 'Receitas, despesas, cobrancas, contratos e indicadores.', path: '/financeiro', icon: Banknote },
  { id: 'notas', title: 'Notas Fiscais', subtitle: 'Emissao, acompanhamento e anexos fiscais de servicos e produtos.', path: '/notas-fiscais', icon: ReceiptText },
  { id: 'relatorios', title: 'Relatorios', subtitle: 'Relatorios operacionais, financeiros, tecnicos e recorrentes.', path: '/relatorios', icon: FileBarChart },
  { id: 'configuracoes', title: 'Configuracoes', subtitle: 'Preferencias da empresa, documentos, PDFs, SMTP e integracoes.', path: '/configuracoes', icon: Settings },
  { id: 'usuarios', title: 'Usuarios e Permissoes', subtitle: 'Controle acessos, perfis, tecnicos e permissoes administrativas.', path: '/usuarios-e-permissoes', icon: LockKeyhole },
  { id: 'mapa', title: 'Mapa de Rede', subtitle: 'Visualize topologia, IPs, switches, APs e disponibilidade.', path: '/mapa-de-rede', icon: Map },
] satisfies Array<Omit<ModuleConfig, 'fields' | 'records' | 'searchPlaceholder' | 'primaryAction' | 'tableLabel' | 'singular'>>;

const moduleHints: Record<ModuleId, Partial<OsRecord>> = {
  dashboard: { categoria: 'Indicador', codigo: 'DASH-000001' },
  clientes: { categoria: 'Cliente Empresa', codigo: 'CLI-000087', status: 'Ativo' },
  orcamentos: { categoria: 'Orcamento', codigo: 'ORC-000124', status: 'Pendente' },
  ordens: { categoria: 'Ordem de Servico', codigo: 'OS-000192', status: 'Aberta' },
  prontuarios: { categoria: 'Prontuario', codigo: 'PRT-000043', status: 'Concluida' },
  mapa: { categoria: 'Topologia', codigo: 'MAP-000044', status: 'Ativo' },
  produtos: { categoria: 'Produto', codigo: 'PROD-000255', status: 'Ativo' },
  kits: { categoria: 'Kit', codigo: 'KIT-000065', status: 'Ativo' },
  estoque: { categoria: 'Estoque', codigo: 'EST-000246', status: 'Pendente' },
  financeiro: { categoria: 'Financeiro', codigo: 'FIN-000319', status: 'Pago' },
  notas: { categoria: 'Fiscal', codigo: 'NF-000782', status: 'Emitida' },
  relatorios: { categoria: 'Relatorio', codigo: 'REL-000039', status: 'Concluida' },
  configuracoes: { categoria: 'Sistema', codigo: 'CFG-000012', status: 'Ativo' },
  usuarios: { categoria: 'Permissao', codigo: 'USR-000018', status: 'Ativo' },
  contratos: { categoria: 'Contrato', codigo: 'CTR-000071', status: 'Ativo' },
  automacao: { categoria: 'Automacao', codigo: 'AUT-000119', status: 'Em Andamento' },
  wifi: { categoria: 'Wi-Fi', codigo: 'WIFI-000078', status: 'Ativo' },
};

const cloneRecord = (record: OsRecord, index: number, moduleId: ModuleId): OsRecord => {
  const hint = moduleHints[moduleId];
  return {
    ...record,
    ...hint,
    id: `${moduleId}-${index + 1}`,
    codigo: index === 0 && hint.codigo ? hint.codigo : `${hint.codigo?.split('-')[0] || 'REG'}-${String(index + 81).padStart(6, '0')}`,
  };
};

export const modules: ModuleConfig[] = moduleMeta.map((meta) => ({
  ...meta,
  singular: meta.title.replace(/s$/, ''),
  searchPlaceholder: `Buscar ${meta.title.toLowerCase()}...`,
  primaryAction: meta.id === 'ordens' ? 'Nova OS' : `Novo ${meta.title.replace(/s$/, '')}`,
  tableLabel: `Lista de ${meta.title}`,
  fields: commonFields,
  records: baseRecords.map((record, index) => cloneRecord(record, index, meta.id)),
}));

export const statusTone = (status: string) => {
  const normalized = status.toLowerCase();
  if (['concluida', 'aprovado', 'ativo', 'pago', 'emitida'].some((word) => normalized.includes(word))) return 'green';
  if (['andamento', 'pendente', 'aberta'].some((word) => normalized.includes(word))) return 'yellow';
  if (['bloqueado', 'rejeitado', 'cancelada', 'critica'].some((word) => normalized.includes(word))) return 'red';
  return 'blue';
};

export const dashboardStats = [
  { label: 'Clientes Ativos', value: '86', delta: '+12 este mes', icon: Users, tone: 'blue' },
  { label: 'Ordens em Andamento', value: '25', delta: '27,8% do total', icon: Wrench, tone: 'yellow' },
  { label: 'Rede Operacional', value: '100%', delta: '191 dispositivos', icon: Activity, tone: 'green' },
  { label: 'Contratos Recorrentes', value: '34', delta: '+18,2% este mes', icon: ShieldCheck, tone: 'purple' },
  { label: 'Receita Total', value: 'R$ 215.780,00', delta: '+18,5% este mes', icon: Gauge, tone: 'blue' },
  { label: 'Redes Wi-Fi', value: '48', delta: '4 alertas resolvidos', icon: Router, tone: 'green' },
];
