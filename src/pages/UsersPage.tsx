import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Check,
  Edit3,
  Key,
  LockKeyhole,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  User,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query as firestoreQuery,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { getAuth } from 'firebase/auth';
import { initializeApp, getApp } from 'firebase/app';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { hasPermission, ROLE_COLORS, ROLE_LABELS, ROLES, type Role } from '../lib/permissions';
import { isValidEmail, validatePasswordStrength } from '../lib/sanitize';
import ConfirmDialog from '../components/ConfirmDialog';
import { logAdminAction, logPermissionChange } from '../services/securityLogger';
import firebaseConfig from '../../firebase-applet-config.json';

// ── Tipos ──────────────────────────────────────────────────────────────────
interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: Role;
  status: 'ativo' | 'inativo';
  createdAt?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

const AVATAR_COLORS = [
  'bg-blue-600', 'bg-purple-600', 'bg-green-600',
  'bg-amber-600', 'bg-rose-600', 'bg-cyan-600',
];
function avatarColor(uid: string): string {
  let hash = 0;
  for (const ch of uid) hash = (hash * 31 + ch.charCodeAt(0)) & 0xff;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

/** Cria usuário no Firebase Auth usando instância secundária para não deslogar o admin */
async function createAuthUser(email: string, password: string): Promise<string> {
  const SECONDARY_APP_NAME = '__smarttech_admin_create__';
  let secondaryApp;
  try {
    secondaryApp = getApp(SECONDARY_APP_NAME);
  } catch {
    secondaryApp = initializeApp(firebaseConfig, SECONDARY_APP_NAME);
  }
  const secondaryAuth = getAuth(secondaryApp);
  const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
  await secondaryAuth.signOut(); // desfaz sessão da app secundária
  return cred.user.uid;
}

// ── Componente principal ───────────────────────────────────────────────────
export default function UsersPage() {
  const { profile: adminProfile } = useAuth();
  const userRole = adminProfile?.role ?? 'visualizador';
  const canCreate = hasPermission(userRole, 'usuarios', 'create');
  const canEdit   = hasPermission(userRole, 'usuarios', 'edit');
  const canDelete = hasPermission(userRole, 'usuarios', 'delete');

  const [users, setUsers]       = useState<UserProfile[]>([]);
  const [loading, setLoading]   = useState(true);
  const [query, setQuery]       = useState('');
  const [filterRole, setFilterRole] = useState<Role | 'todos'>('todos');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // Modal criar usuário
  const [showCreate, setShowCreate]   = useState(false);
  const [createForm, setCreateForm]   = useState({ name: '', email: '', password: '', role: 'tecnico' as Role });
  const [createError, setCreateError] = useState('');
  const [creating, setCreating]       = useState(false);

  // Modal editar perfil
  const [editUser, setEditUser]     = useState<UserProfile | null>(null);
  const [editRole, setEditRole]     = useState<Role>('tecnico');
  const [editStatus, setEditStatus] = useState<'ativo' | 'inativo'>('ativo');
  const [saving, setSaving]         = useState(false);

  // Confirmação de exclusão
  const [confirmDel, setConfirmDel] = useState<{ open: boolean; uid: string; name: string }>({ open: false, uid: '', name: '' });
  const [deleting, setDeleting]     = useState(false);

  // ── Listener Firestore ──────────────────────────────────────────────────
  useEffect(() => {
    const q = firestoreQuery(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setUsers(snap.docs.map((d) => ({ uid: d.id, ...d.data() } as UserProfile)));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  // ── Criar usuário ───────────────────────────────────────────────────────
  const handleCreate = async () => {
    setCreateError('');
    const { name, email, password, role } = createForm;
    if (!name.trim()) { setCreateError('Informe o nome completo.'); return; }
    if (!isValidEmail(email)) { setCreateError('E-mail inválido.'); return; }
    const pwErr = validatePasswordStrength(password);
    if (pwErr) { setCreateError(pwErr); return; }

    setCreating(true);
    try {
      const uid = await createAuthUser(email, password);
      await setDoc(doc(db, 'users', uid), {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        role,
        status: 'ativo',
        uid,
        createdAt: new Date().toISOString(),
        createdBy: adminProfile?.email ?? '',
      });
      logAdminAction(adminProfile?.uid ?? '', adminProfile?.email ?? '', 'create_user', `Criou usuário ${email} com perfil ${role}`);
      setShowCreate(false);
      setCreateForm({ name: '', email: '', password: '', role: 'tecnico' });
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code ?? '';
      if (code === 'auth/email-already-in-use') setCreateError('Este e-mail já está cadastrado.');
      else setCreateError((e as Error)?.message ?? 'Erro ao criar usuário.');
    } finally {
      setCreating(false);
    }
  };

  // ── Editar perfil / status ──────────────────────────────────────────────
  const openEdit = (u: UserProfile) => {
    setEditUser(u);
    setEditRole(u.role);
    setEditStatus(u.status ?? 'ativo');
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', editUser.uid), { role: editRole, status: editStatus });
      if (editRole !== editUser.role) {
        logPermissionChange(adminProfile?.uid ?? '', adminProfile?.email ?? '', editUser.uid, editUser.role, editRole);
      }
      setEditUser(null);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // ── Excluir usuário ─────────────────────────────────────────────────────
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'users', confirmDel.uid));
      logAdminAction(adminProfile?.uid ?? '', adminProfile?.email ?? '', 'delete_user', `Removeu usuário ${confirmDel.name} (${confirmDel.uid})`);
      setConfirmDel({ open: false, uid: '', name: '' });
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  };

  // ── Filtros ─────────────────────────────────────────────────────────────
  const filtered = users.filter((u) => {
    const txt = query.toLowerCase();
    const matchText = `${u.name} ${u.email}`.toLowerCase().includes(txt);
    const matchRole = filterRole === 'todos' || u.role === filterRole;
    return matchText && matchRole;
  });

  // ── Estatísticas ────────────────────────────────────────────────────────
  const stats = {
    total:   users.length,
    ativos:  users.filter((u) => (u.status ?? 'ativo') === 'ativo').length,
    admins:  users.filter((u) => u.role === 'admin').length,
    novos:   users.filter((u) => {
      if (!u.createdAt) return false;
      return Date.now() - new Date(u.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000;
    }).length,
  };

  return (
    <div className="flex flex-col gap-5 p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Usuários e Permissões</h1>
          <p className="text-sm text-slate-400">Gerencie contas, perfis de acesso e permissões do sistema.</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Novo Usuário
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Total', value: stats.total, icon: User, color: 'text-blue-400 bg-blue-500/10' },
          { label: 'Ativos', value: stats.ativos, icon: UserCheck, color: 'text-green-400 bg-green-500/10' },
          { label: 'Admins', value: stats.admins, icon: Shield, color: 'text-purple-400 bg-purple-500/10' },
          { label: 'Novos (7d)', value: stats.novos, icon: Key, color: 'text-amber-400 bg-amber-500/10' },
        ].map((s) => (
          <div key={s.label} className="os-card flex items-center gap-3 p-4">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.color}`}>
              <s.icon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-bold">{s.value}</div>
              <div className="text-xs text-slate-400">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="os-input pl-9 w-full"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value as Role | 'todos')}
          className="os-input w-auto"
        >
          <option value="todos">Todos os Perfis</option>
          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
        {loading && <RefreshCw className="h-4 w-4 animate-spin text-slate-400" />}
      </div>

      {/* Tabela */}
      <div className="os-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs text-slate-400">
              <th className="px-4 py-3 font-medium">Usuário</th>
              <th className="px-4 py-3 font-medium hidden md:table-cell">E-mail</th>
              <th className="px-4 py-3 font-medium">Perfil</th>
              <th className="px-4 py-3 font-medium hidden lg:table-cell">Cadastro</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">Carregando usuários…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">Nenhum usuário encontrado.</td></tr>
            ) : filtered.map((u) => {
              const isActive = (u.status ?? 'ativo') === 'ativo';
              const isCurrentAdmin = u.email === adminProfile?.email;
              return (
                <motion.tr
                  key={u.uid}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                >
                  {/* Avatar + nome */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${avatarColor(u.uid)}`}>
                        {initials(u.name || u.email)}
                      </div>
                      <div>
                        <div className="font-medium leading-tight">
                          {u.name || '—'}
                          {isCurrentAdmin && <span className="ml-2 text-[10px] text-blue-400">(você)</span>}
                        </div>
                        <div className="text-xs text-slate-500 md:hidden">{u.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* E-mail */}
                  <td className="px-4 py-3 text-slate-400 hidden md:table-cell">{u.email}</td>

                  {/* Role */}
                  <td className="px-4 py-3">
                    <span className={`os-badge ${ROLE_COLORS[u.role] ?? 'text-slate-300 bg-slate-500/15 border-slate-500/20'}`}>
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  </td>

                  {/* Data */}
                  <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-BR') : '—'}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span className={`os-badge ${isActive
                      ? 'text-green-300 bg-green-500/15 border-green-500/20'
                      : 'text-red-300 bg-red-500/15 border-red-500/20'}`}>
                      {isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>

                  {/* Ações */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {canEdit && (
                        <button
                          onClick={() => openEdit(u)}
                          className="os-icon-button"
                          title="Editar perfil"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                      )}
                      {canDelete && !isCurrentAdmin && (
                        <button
                          onClick={() => setConfirmDel({ open: true, uid: u.uid, name: u.name || u.email })}
                          className="os-icon-button danger"
                          title="Remover usuário"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Modal: Criar Usuário ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
            <motion.div
              className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#0d1526] p-6 shadow-2xl"
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
                    <Plus className="h-5 w-5" />
                  </div>
                  <h2 className="font-semibold">Novo Usuário</h2>
                </div>
                <button onClick={() => setShowCreate(false)} className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-xs text-slate-400">Nome completo</label>
                  <input
                    value={createForm.name}
                    onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="João da Silva"
                    className="os-input w-full"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs text-slate-400">E-mail</label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="joao@smarttech.com.br"
                    className="os-input w-full"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs text-slate-400">Senha inicial</label>
                  <input
                    type="password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="Mínimo 8 chars, 1 maiúscula, 1 número"
                    className="os-input w-full"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs text-slate-400">Perfil de acesso</label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value as Role }))}
                    className="os-input w-full"
                  >
                    {ROLES.filter((r) => r !== 'admin').map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                    {userRole === 'admin' && <option value="admin">{ROLE_LABELS.admin}</option>}
                  </select>
                </div>

                {createError && (
                  <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{createError}</p>
                )}
              </div>

              <div className="mt-5 flex justify-end gap-3">
                <button onClick={() => setShowCreate(false)} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5">
                  Cancelar
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {creating ? 'Criando…' : 'Criar Usuário'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modal: Editar Perfil ──────────────────────────────────────────── */}
      <AnimatePresence>
        {editUser && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setEditUser(null)} />
            <motion.div
              className="relative z-10 w-full max-w-sm rounded-2xl border border-white/10 bg-[#0d1526] p-6 shadow-2xl"
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${avatarColor(editUser.uid)}`}>
                    {initials(editUser.name || editUser.email)}
                  </div>
                  <div>
                    <div className="font-semibold">{editUser.name || '—'}</div>
                    <div className="text-xs text-slate-400">{editUser.email}</div>
                  </div>
                </div>
                <button onClick={() => setEditUser(null)} className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs text-slate-400">Perfil de acesso</label>
                  <select value={editRole} onChange={(e) => setEditRole(e.target.value as Role)} className="os-input w-full">
                    {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {editRole === 'admin' && 'Acesso total a todos os módulos.'}
                    {editRole === 'tecnico' && 'Acesso a OS, Prontuários, Wi-Fi e Automação.'}
                    {editRole === 'comercial' && 'Acesso a Clientes, Orçamentos e Contratos.'}
                    {editRole === 'financeiro' && 'Acesso a Financeiro, Notas e Relatórios.'}
                    {editRole === 'estoque' && 'Acesso a Estoque, Produtos e Kits.'}
                    {editRole === 'visualizador' && 'Somente leitura em todos os módulos.'}
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs text-slate-400">Status da conta</label>
                  <div className="flex gap-2">
                    {(['ativo', 'inativo'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setEditStatus(s)}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2 text-sm font-medium transition-colors ${
                          editStatus === s
                            ? s === 'ativo'
                              ? 'border-green-500/40 bg-green-500/15 text-green-300'
                              : 'border-red-500/40 bg-red-500/15 text-red-300'
                            : 'border-white/10 text-slate-400 hover:bg-white/5'
                        }`}
                      >
                        {s === 'ativo' ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-3">
                <button onClick={() => setEditUser(null)} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5">
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Salvar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Confirmação de exclusão ───────────────────────────────────────── */}
      <ConfirmDialog
        open={confirmDel.open}
        title="Remover Usuário"
        description={`Tem certeza que deseja remover "${confirmDel.name}"? O perfil será excluído do Firestore. O acesso do usuário será revogado imediatamente.`}
        confirmLabel={deleting ? 'Removendo…' : 'Remover'}
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDel({ open: false, uid: '', name: '' })}
      />
    </div>
  );
}
