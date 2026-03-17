import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Wrench, 
  Cpu, 
  Calendar, 
  DollarSign, 
  Activity, 
  LogOut,
  Settings
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Users, label: 'Clientes', path: '/clients' },
  { icon: Wrench, label: 'Serviços', path: '/services' },
  { icon: Cpu, label: 'Equipamentos', path: '/equipment' },
  { icon: Calendar, label: 'Agenda', path: '/schedule' },
  { icon: DollarSign, label: 'Financeiro', path: '/finance' },
  { icon: Activity, label: 'Diagnóstico', path: '/diagnostics' },
];

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const location = useLocation();
  const { logout, profile } = useAuth();

  return (
    <aside className="w-64 h-full bg-tech-gray border-r border-white/10 flex flex-col">
      <div className="p-6">
        <h1 className="text-xl font-bold text-tech-blue flex items-center gap-2">
          <Cpu className="w-8 h-8" />
          <span>SmartTech IoT</span>
        </h1>
        <p className="text-xs text-white/50 mt-1">Manager v1.0</p>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
                isActive 
                  ? "bg-tech-blue text-white shadow-lg shadow-tech-blue/20" 
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-white/40 group-hover:text-tech-blue")} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-4 py-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-tech-blue/20 flex items-center justify-center text-tech-blue font-bold">
            {profile?.name?.charAt(0) || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{profile?.name || 'Ananias Feliciano'}</p>
            <p className="text-xs text-white/40 truncate capitalize">{profile?.role || 'Admin'}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sair</span>
        </button>
      </div>
    </aside>
  );
}
