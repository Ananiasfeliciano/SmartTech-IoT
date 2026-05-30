import { Headphones, LogOut } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { modules } from '../data/osData';
import { useAuth } from '../context/AuthContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const location = useLocation();
  const { logout, profile } = useAuth();

  return (
    <aside className="flex h-full w-[286px] flex-col border-r border-white/10 bg-[#030914]/95 shadow-2xl shadow-black/40 backdrop-blur-xl">
      <div className="flex h-[74px] items-center gap-3 border-b border-white/10 px-5">
        <img src="/imagen/logo.png" alt="SMARTTECH IoT OS" className="h-12 w-12 rounded-xl object-cover ring-1 ring-blue-400/30" />
        <div>
          <h1 className="whitespace-nowrap text-lg font-bold leading-tight text-white">SMARTTECH <span className="text-blue-400">IoT OS</span></h1>
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">Sistema Operacional</p>
        </div>
      </div>

      <nav className="smart-scroll flex-1 space-y-1 overflow-y-auto px-3 py-5">
        {modules.map((item) => {
          const isActive = location.pathname === item.path || (item.path === '/' && location.pathname === '/');
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={cn(
                'group flex items-center gap-3 rounded-md px-4 py-2.5 text-[15px] transition-all duration-200',
                isActive ? 'border border-blue-400/25 bg-blue-600/80 text-white shadow-lg shadow-blue-900/30' : 'text-slate-300 hover:bg-white/[0.06] hover:text-white',
              )}
            >
              <item.icon className={cn('h-5 w-5', isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-300')} />
              <span className="truncate">{item.title}</span>
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-white/10 p-4">
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-3 flex items-center gap-3">
            <Headphones className="h-6 w-6 text-white" />
            <div className="font-semibold">Suporte Tecnico</div>
          </div>
          <div className="space-y-2 text-sm text-slate-300">
            <p>(11) 99999-9999</p>
            <p>suporte@smarttechiot.com.br</p>
            <p className="flex items-center gap-2 text-green-400"><span className="h-2 w-2 rounded-full bg-green-500" />Online</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <img src="/imagen/Tecnico.png" alt="Admin" className="h-10 w-10 rounded-full object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{profile?.name || 'Admin'}</p>
            <p className="truncate text-xs capitalize text-slate-400">{profile?.role || 'Administrador'}</p>
          </div>
        </div>
        <button onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-red-300 transition-colors hover:bg-red-400/10">
          <LogOut className="h-5 w-5" />
          <span className="font-medium">Sair</span>
        </button>
      </div>
    </aside>
  );
}
