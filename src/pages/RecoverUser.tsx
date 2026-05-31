import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  AtSign,
  Mail,
  Phone,
  RefreshCw,
  Send,
  Shield,
  User,
} from 'lucide-react';
import { isValidEmail } from '../lib/sanitize';
import { requestUserRecovery } from '../services/authRecovery';

type SearchType = 'email' | 'phone';
type Step = 'form' | 'sent';

function isValidPhone(phone: string): boolean {
  return /^\(?\d{2}\)?\s?\d{4,5}[\s-]?\d{4}$/.test(phone.replace(/\s/g, ''));
}

export default function RecoverUser() {
  const [step, setStep]         = useState<Step>('form');
  const [searchType, setSearchType] = useState<SearchType>('email');
  const [value, setValue]       = useState('');
  const [error, setError]       = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (searchType === 'email' && !isValidEmail(value)) {
      setError('Informe um e-mail válido.');
      return;
    }
    if (searchType === 'phone' && !isValidPhone(value)) {
      setError('Informe um telefone válido (ex: (11) 99999-9999).');
      return;
    }

    setSubmitting(true);
    // Anti-enumeração: requestUserRecovery sempre retorna sucesso
    await requestUserRecovery(value, searchType);
    setSubmitting(false);
    setStep('sent');
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-tech-black p-4 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(0,132,255,0.18),transparent_35%),linear-gradient(135deg,#020812,#071525_50%,#02050c)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-blue-400/40" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md rounded-xl border border-blue-400/20 bg-tech-gray/90 p-8 shadow-2xl shadow-blue-950/40 backdrop-blur-xl"
      >
        {/* Logo */}
        <div className="mb-6 text-center">
          <img
            src="/imagen/logo.png"
            alt="SMARTTECH IoT OS"
            className="mx-auto mb-3 h-14 w-14 rounded-xl object-cover ring-1 ring-blue-400/30"
          />
          <h1 className="text-xl font-bold">
            SMARTTECH <span className="text-blue-400">IoT OS</span>
          </h1>
        </div>

        {step === 'form' ? (
          <>
            <div className="mb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15">
                  <User className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="font-semibold">Recuperar Usuário</h2>
                  <p className="text-xs text-slate-400">
                    Localize sua conta por e-mail ou telefone
                  </p>
                </div>
              </div>
            </div>

            {/* Selector tipo de busca */}
            <div className="mb-4 flex gap-2">
              {(['email', 'phone'] as SearchType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setSearchType(t); setValue(''); setError(''); }}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2 text-sm font-medium transition-colors ${
                    searchType === t
                      ? 'border-blue-500/40 bg-blue-500/15 text-blue-300'
                      : 'border-white/10 text-slate-400 hover:bg-white/5'
                  }`}
                >
                  {t === 'email' ? <Mail className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
                  {t === 'email' ? 'E-mail' : 'Telefone'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs text-slate-400">
                  {searchType === 'email' ? 'E-mail cadastrado' : 'Telefone cadastrado'}
                </label>
                <div className="relative">
                  {searchType === 'email'
                    ? <AtSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    : <Phone  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  }
                  <input
                    type={searchType === 'email' ? 'email' : 'tel'}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={searchType === 'email' ? 'seu@email.com' : '(11) 99999-9999'}
                    className="os-input w-full pl-9"
                    autoFocus
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="os-button os-button-primary w-full justify-center py-3 disabled:opacity-60"
              >
                {submitting ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" /> Buscando...</>
                ) : (
                  <><Send className="h-4 w-4" /> Localizar Conta</>
                )}
              </button>
            </form>

            {/* Aviso de privacidade */}
            <div className="mt-4 rounded-lg border border-slate-700/40 bg-slate-800/20 px-3 py-2.5 text-xs text-slate-500">
              Por segurança, os dados do usuário nunca são exibidos na tela. As
              informações serão enviadas ao e-mail cadastrado.
            </div>
          </>
        ) : (
          /* ── Confirmação ── */
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/15">
              <Mail className="h-7 w-7 text-blue-400" />
            </div>
            <h2 className="mb-2 text-lg font-semibold">Solicitação Recebida</h2>
            <p className="mb-6 text-sm text-slate-300">
              Se existir uma conta associada a esse dado, enviaremos as
              informações ao e-mail cadastrado, incluindo o nome do usuário e
              data do último acesso.
            </p>

            <div className="mb-5 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-left text-xs text-amber-200">
              <p className="font-medium">Por segurança:</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-amber-200/70">
                <li>Os dados do usuário nunca são exibidos diretamente</li>
                <li>O e-mail de recuperação é enviado somente ao endereço cadastrado</li>
                <li>Verifique sua caixa de entrada e spam</li>
              </ul>
            </div>

            <button
              onClick={() => { setStep('form'); setValue(''); }}
              className="mb-3 w-full rounded-xl border border-white/10 py-2.5 text-sm text-slate-300 hover:bg-white/5 transition-colors"
            >
              Tentar outro dado
            </button>
          </motion.div>
        )}

        {/* Rodapé */}
        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
          <Link to="/login" className="flex items-center gap-1 text-blue-400 hover:underline">
            <ArrowLeft className="h-3 w-3" /> Voltar para Login
          </Link>
          <Link to="/forgot-password" className="hover:text-slate-300 transition-colors">
            Recuperar senha
          </Link>
        </div>

        <p className="mt-5 flex items-center justify-center gap-1 text-center text-[10px] text-white/20">
          <Shield className="h-3 w-3" />
          Dados protegidos conforme LGPD · Acesso monitorado
        </p>
      </motion.div>
    </div>
  );
}
