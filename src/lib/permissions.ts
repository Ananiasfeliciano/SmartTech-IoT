export const ROLES = ['admin', 'tecnico', 'comercial', 'financeiro', 'estoque', 'visualizador'] as const;
export type Role = (typeof ROLES)[number];
export type Permission = 'view' | 'create' | 'edit' | 'delete' | 'export' | 'approve' | 'cancel';

const ALL: Permission[] = ['view', 'create', 'edit', 'delete', 'export', 'approve', 'cancel'];
const READ: Permission[] = ['view', 'export'];
const EDIT: Permission[] = ['view', 'create', 'edit', 'export'];

// '*' = wildcard para módulos não listados explicitamente
const ROLE_PERMISSIONS: Record<Role, Record<string, Permission[]>> = {
  admin: { '*': ALL },
  tecnico: {
    ordens: ['view', 'create', 'edit', 'export'],
    prontuarios: ['view', 'create', 'edit', 'export'],
    wifi: EDIT,
    automacao: EDIT,
    clientes: ['view'],
    produtos: ['view'],
    estoque: ['view'],
    kits: ['view'],
    '*': READ,
  },
  comercial: {
    clientes: ALL,
    orcamentos: ALL,
    contratos: ['view', 'create', 'edit', 'approve', 'export'],
    relatorios: ['view', 'export'],
    ordens: ['view', 'export'],
    '*': READ,
  },
  financeiro: {
    financeiro: ALL,
    notas: ALL,
    relatorios: ALL,
    contratos: ['view', 'approve', 'cancel', 'export'],
    clientes: ['view', 'export'],
    orcamentos: ['view', 'export'],
    '*': READ,
  },
  estoque: {
    estoque: ALL,
    produtos: ALL,
    kits: ALL,
    ordens: ['view', 'edit'],
    '*': READ,
  },
  visualizador: { '*': READ },
};

export function hasPermission(role: Role | string, module: string, permission: Permission): boolean {
  const normalized = (ROLES.includes(role as Role) ? role : 'visualizador') as Role;
  const perms = ROLE_PERMISSIONS[normalized];
  const modulePerms = perms[module] ?? perms['*'] ?? [];
  return modulePerms.includes(permission);
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrador',
  tecnico: 'Técnico',
  comercial: 'Comercial',
  financeiro: 'Financeiro',
  estoque: 'Estoque',
  visualizador: 'Visualizador',
};

export const ROLE_COLORS: Record<Role, string> = {
  admin: 'text-blue-300 bg-blue-500/15 border-blue-500/20',
  tecnico: 'text-green-300 bg-green-500/15 border-green-500/20',
  comercial: 'text-purple-300 bg-purple-500/15 border-purple-500/20',
  financeiro: 'text-yellow-300 bg-yellow-500/15 border-yellow-500/20',
  estoque: 'text-orange-300 bg-orange-500/15 border-orange-500/20',
  visualizador: 'text-slate-300 bg-slate-500/15 border-slate-500/20',
};
