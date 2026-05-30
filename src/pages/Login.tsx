import { LockKeyhole, Wifi } from 'lucide-react';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { user, signIn, registerAdmin, loading } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/" />;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (isRegistering) {
        await registerAdmin(email, password, name);
      } else {
        await signIn(email, password);
      }
    } catch (err: any) {
      const code = err?.code ?? '';
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('E-mail ou senha inválidos.');
      } else if (code === 'auth/email-already-in-use') {
        setError('Este e-mail já está cadastrado. Faça login.');
      } else if (code === 'auth/weak-password') {
        setError('A senha deve ter no mínimo 6 caracteres.');
      } else {
        setError(err?.message ?? 'Erro ao autenticar. Tente novamente.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#020812] p-4 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(0,132,255,0.20),transparent_35%),linear-gradient(135deg,#020812,#071525_50%,#02050c)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-blue-400/40" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md rounded-xl border border-blue-400/20 bg-[#06101b]/90 p-8 shadow-2xl shadow-blue-950/40 backdrop-blur-xl"
      >
        <div className="mb-8 text-center">
          <img src="/imagen/logo.png" alt="SMARTTECH IoT OS" className="mx-auto mb-4 h-24 w-24 rounded-2xl object-cover ring-1 ring-blue-400/30" />
          <h1 className="mb-1 text-3xl font-bold text-white">SMARTTECH <span className="text-blue-400">IoT OS</span></h1>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Sistema Operacional</p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {isRegistering && (
            <input className="os-input" placeholder="Nome do Administrador" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          )}
          <input className="os-input" type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus={!isRegistering} />
          <input className="os-input" type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <div className="rounded-lg border border-red-400/20 bg-red-500/10 px-4 py-3 text-center text-sm text-red-200">{error}</div>}
          <button type="submit" disabled={submitting} className="os-button os-button-primary w-full justify-center py-3 disabled:opacity-60">
            {submitting ? (isRegistering ? 'Cadastrando...' : 'Entrando...') : (isRegistering ? 'Cadastrar' : 'Entrar')}
          </button>
        </form>
        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#06101b] px-2 text-white/30 font-medium">Acesso Restrito</span></div>
        </div>
        <div className="mb-5 grid grid-cols-2 gap-3 text-xs text-slate-300">
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3"><Wifi className="mb-2 h-4 w-4 text-blue-300" />Rede segura</div>
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3"><LockKeyhole className="mb-2 h-4 w-4 text-blue-300" />Admin OS</div>
        </div>
        <p className="text-center text-xs text-white/35">
          {isRegistering ? (
            <>Já tem uma conta?{' '}
              <button type="button" onClick={() => { setIsRegistering(false); setError(null); }} className="text-blue-400 hover:underline">Fazer login</button>
            </>
          ) : (
            <>Primeiro acesso?{' '}
              <button type="button" onClick={() => { setIsRegistering(true); setError(null); }} className="text-blue-400 hover:underline">Cadastrar administrador</button>
            </>
          )}
        </p>
      </motion.div>
    </div>
  );
}
