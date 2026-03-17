import { Cpu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { motion } from 'motion/react';

export default function Login() {
  const { user, signIn, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/" />;

  return (
    <div className="min-h-screen bg-tech-black flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-tech-gray rounded-2xl p-8 border border-white/10 shadow-2xl"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-tech-blue/10 text-tech-blue mb-4">
            <Cpu className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">SmartTech IoT</h1>
          <p className="text-white/50">Manager - Técnico Ananias Feliciano</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={signIn}
            className="w-full flex items-center justify-center gap-3 bg-white text-black font-bold py-3 px-4 rounded-xl hover:bg-white/90 transition-all active:scale-95"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            Entrar com Google
          </button>
          
          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-tech-gray px-2 text-white/30 font-medium">Acesso Restrito</span>
            </div>
          </div>

          <p className="text-xs text-center text-white/30">
            Sistema de gestão profissional para automação e IoT.
            Acesso exclusivo para técnicos autorizados.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
