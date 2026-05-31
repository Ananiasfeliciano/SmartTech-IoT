import { LockKeyhole, Shield, Wifi } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { getRateLimitStatus, recordFailedAttempt, clearRateLimit } from '../lib/rateLimit';
import { validatePasswordStrength, isValidEmail } from '../lib/sanitize';
import { logLoginSuccess, logLoginFailure, logRateLimitBlock } from '../services/securityLogger';
import { checkBruteForce, raiseImmediateAlert } from '../services/securityAlerts';

export default function Login() {
  const { user, signIn, registerAdmin, loading } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [blockLabel, setBlockLabel] = useState('');

  // Atualiza o countdown do bloqueio em tempo real
  useEffect(() => {
    if (!blockLabel) return;
    const interval = setInterval(() => {
      const status = getRateLimitStatus(email.toLowerCase().trim());
      if (!status.blocked) {
        setBlockLabel('');
        setError(null);
        clearInterval(interval);
      } else {
        setBlockLabel(status.remainingLabel);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [blockLabel, email]);

  if (loading) return null;
  if (user) return <Navigate to="/" />;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const emailKey = email.toLowerCase().trim();

    // Verificar rate limit antes de qualquer chamada
    const rlStatus = getRateLimitStatus(emailKey);
    if (rlStatus.blocked) {
      setBlockLabel(rlStatus.remainingLabel);
      setError(`Conta temporariamente bloqueada por segurança. Tente novamente em ${rlStatus.remainingLabel}.`);
      logRateLimitBlock(emailKey, rlStatus.remainingLabel);
      return;
    }

    // Validações client-side
    if (!isValidEmail(email)) { setError('Informe um e-mail válido.'); return; }

    if (isRegistering) {
      if (!name.trim()) { setError('Informe seu nome.'); return; }
      const pwError = validatePasswordStrength(password);
      if (pwError) { setError(pwError); return; }
    } else {
      if (password.length < 6) { setError('Senha muito curta.'); return; }
    }

    setSubmitting(true);
    try {
      if (isRegistering) {
        await registerAdmin(email, password, name);
      } else {
        await signIn(email, password);
        clearRateLimit(emailKey);
        // Log será feito via onAuthStateChanged no AuthContext; aqui apenas referência
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      let message: string;

      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        const updated = recordFailedAttempt(emailKey);
        logLoginFailure(emailKey, code, updated.attemptsLeft);
        // Item 18 — verificar padrão de brute force e gerar alerta automático
        checkBruteForce(emailKey);
        if (updated.blocked) {
          setBlockLabel(updated.remainingLabel);
          raiseImmediateAlert('critical', 'Login Bloqueado por Brute Force', `Rate limit atingido para: ${emailKey}`, emailKey);
          message = `Muitas tentativas incorretas. Tente novamente em ${updated.remainingLabel}.`;
        } else {
          message = `E-mail ou senha inválidos. ${updated.attemptsLeft > 0 ? `Tentativas restantes: ${updated.attemptsLeft}.` : ''}`;
        }
      } else if (code === 'auth/email-already-in-use') {
        message = 'Este e-mail já está cadastrado. Faça login.';
      } else if (code === 'auth/weak-password') {
        message = 'A senha deve ter no mínimo 6 caracteres.';
      } else if (code === 'auth/too-many-requests') {
        message = 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.';
      } else {
        message = (err as Error)?.message ?? 'Erro ao autenticar. Tente novamente.';
      }
      setError(message);
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
          <input className="os-input" type="password" placeholder={isRegistering ? 'Senha (mín. 8 chars, 1 maiúscula, 1 número)' : 'Senha'} value={password} onChange={(e) => setPassword(e.target.value)} required />
          {isRegistering && password.length > 0 && (
            <div className="flex gap-1">
              {[
                password.length >= 8,
                /[A-Z]/.test(password),
                /[0-9]/.test(password),
                password.length >= 12,
              ].map((ok, i) => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${ok ? 'bg-emerald-500' : 'bg-slate-700'}`} />
              ))}
            </div>
          )}
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
        <p className="mt-4 flex items-center justify-center gap-1 text-center text-[10px] text-white/20">
          <Shield className="h-3 w-3" />
          Dados protegidos conforme LGPD · Acesso monitorado e registrado
        </p>
      </motion.div>
    </div>
  );
}
