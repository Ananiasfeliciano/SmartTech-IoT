import { Eye, EyeOff, KeyRound, LockKeyhole, RefreshCw, Shield, Smartphone, Wifi } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  getMultiFactorResolver,
  TotpMultiFactorGenerator,
  type MultiFactorError,
  type MultiFactorResolver,
} from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { getRateLimitStatus, recordFailedAttempt, clearRateLimit } from '../lib/rateLimit';
import { validatePasswordStrength, isValidEmail } from '../lib/sanitize';
import { logLoginSuccess, logLoginFailure, logRateLimitBlock } from '../services/securityLogger';
import { checkBruteForce, raiseImmediateAlert } from '../services/securityAlerts';

type LoginStep = 'credentials' | 'mfa';

export default function Login() {
  const { user, signIn, registerAdmin, loading } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [step, setStep]         = useState<LoginStep>('credentials');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [name, setName]         = useState('');
  const [mfaCode, setMfaCode]   = useState('');
  const [mfaResolver, setMfaResolver] = useState<MultiFactorResolver | null>(null);
  const [error, setError]       = useState<string | null>(null);
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
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      let message: string;

      // ── 2FA: Firebase sinaliza que MFA é necessário ──────────────────────
      if (code === 'auth/multi-factor-auth-required') {
        const resolver = getMultiFactorResolver(auth, err as MultiFactorError);
        setMfaResolver(resolver);
        setStep('mfa');
        setSubmitting(false);
        return;
      }

      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        const updated = recordFailedAttempt(emailKey);
        logLoginFailure(emailKey, code, updated.attemptsLeft);
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

  // ── Handler: verificar código 2FA ────────────────────────────────────────
  const handleMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaResolver || mfaCode.length !== 6) return;
    setError(null);
    setSubmitting(true);
    try {
      const hint = mfaResolver.hints[0];
      const assertion = TotpMultiFactorGenerator.assertionForSignIn(hint.uid, mfaCode);
      await mfaResolver.resolveSignIn(assertion);
      // onAuthStateChanged no AuthContext cuida do resto
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      if (code === 'auth/invalid-verification-code') {
        setError('Código incorreto. Verifique o autenticador e tente novamente.');
      } else {
        setError((err as Error)?.message ?? 'Erro ao verificar código.');
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
        <AnimatePresence mode="wait">
          {/* ── Tela de credenciais ── */}
          {step === 'credentials' && (
            <motion.form
              key="credentials"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="space-y-4"
              onSubmit={handleSubmit}
            >
              {isRegistering && (
                <input className="os-input" placeholder="Nome do Administrador" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
              )}
              <input className="os-input" type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus={!isRegistering} />
              <div className="relative">
                <input
                  className="os-input w-full pr-10"
                  type={showPw ? 'text' : 'password'}
                  placeholder={isRegistering ? 'Senha (mín. 8 chars, 1 maiúscula, 1 número)' : 'Senha'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
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
              {/* Link esqueci minha senha — apenas no login normal */}
              {!isRegistering && (
                <div className="text-right">
                  <Link to="/forgot-password" className="text-xs text-blue-400 hover:underline">
                    Esqueci minha senha
                  </Link>
                </div>
              )}
              {error && <div className="rounded-lg border border-red-400/20 bg-red-500/10 px-4 py-3 text-center text-sm text-red-200">{error}</div>}
              <button type="submit" disabled={submitting} className="os-button os-button-primary w-full justify-center py-3 disabled:opacity-60">
                {submitting ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" /> {isRegistering ? 'Cadastrando...' : 'Entrando...'}</>
                ) : (
                  isRegistering ? 'Cadastrar' : 'Entrar'
                )}
              </button>
            </motion.form>
          )}

          {/* ── Tela de 2FA ── */}
          {step === 'mfa' && (
            <motion.form
              key="mfa"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
              onSubmit={handleMfa}
            >
              <div className="flex items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3">
                <Smartphone className="h-5 w-5 shrink-0 text-blue-400" />
                <div>
                  <p className="text-sm font-medium text-blue-200">Autenticação em Dois Fatores</p>
                  <p className="text-xs text-blue-300/70">Informe o código do seu aplicativo autenticador</p>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-slate-400">Código de 6 dígitos</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="os-input w-full text-center text-2xl tracking-[0.4em] font-mono"
                  autoFocus
                />
              </div>
              {error && <div className="rounded-lg border border-red-400/20 bg-red-500/10 px-4 py-3 text-center text-sm text-red-200">{error}</div>}
              <button
                type="submit"
                disabled={submitting || mfaCode.length !== 6}
                className="os-button os-button-primary w-full justify-center py-3 disabled:opacity-60"
              >
                {submitting ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" /> Verificando...</>
                ) : (
                  <><KeyRound className="h-4 w-4" /> Verificar Código</>
                )}
              </button>
              <button
                type="button"
                onClick={() => { setStep('credentials'); setMfaCode(''); setError(null); }}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-300"
              >
                ← Voltar
              </button>
            </motion.form>
          )}
        </AnimatePresence>
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
        {step === 'credentials' && !isRegistering && (
          <p className="mt-2 text-center text-xs text-white/25">
            <Link to="/recover-user" className="hover:text-white/40 transition-colors">
              Não sabe seu usuário?
            </Link>
          </p>
        )}
        <p className="mt-4 flex items-center justify-center gap-1 text-center text-[10px] text-white/20">
          <Shield className="h-3 w-3" />
          Dados protegidos conforme LGPD · Acesso monitorado e registrado
        </p>
      </motion.div>
    </div>
  );
}
