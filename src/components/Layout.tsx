import React, { useState } from 'react';
import { Bell, CalendarDays, ChevronDown, CircleHelp, Menu, Search, Sun, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { profile } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden bg-tech-black text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_45%_0%,rgba(0,132,255,0.14),transparent_34%),linear-gradient(135deg,#020812_0%,#06101b_48%,#02050c_100%)]" />

      <div className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-[#030914]/90 px-4 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-3">
          <img src="/imagen/logo.png" alt="SMARTTECH IoT OS" className="h-9 w-9 rounded-lg object-cover" />
          <span className="font-semibold">SMARTTECH <span className="text-blue-400">IoT OS</span></span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="rounded-lg border border-white/10 p-2 text-white/70 transition-colors hover:text-white">
          {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {isSidebarOpen && <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setIsSidebarOpen(false)} />}

      <div className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </div>

      <main className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="hidden h-18.5 shrink-0 items-center justify-between border-b border-white/10 bg-[#030914]/70 px-7 backdrop-blur-xl lg:flex">
          <div className="flex items-center gap-4">
            <button className="os-icon-button"><Menu className="h-5 w-5" /></button>
            <div className="relative w-130 max-w-[44vw]">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input className="os-input h-11 pl-12 pr-24" placeholder="Buscar prontuarios, equipamentos, IP, MAC..." />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-white/5 px-2 py-1 text-xs text-slate-300">CTRL + K</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="os-icon-button"><Sun className="h-5 w-5" /></button>
            <button className="os-icon-button relative"><Bell className="h-5 w-5" /><span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 text-[10px] font-semibold">12</span></button>
            <button className="os-icon-button"><CalendarDays className="h-5 w-5" /></button>
            <button className="os-icon-button"><CircleHelp className="h-5 w-5" /></button>
            <div className="flex items-center gap-3">
              <img src="/imagen/Tecnico.png" alt="Admin" className="h-11 w-11 rounded-full object-cover ring-1 ring-blue-400/30" />
              <div>
                <div className="text-sm font-semibold">{profile?.name || 'Admin'}</div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400"><span className="h-2 w-2 rounded-full bg-green-500" />Administrador</div>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </div>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-24 lg:px-7 lg:pt-5">
          {children}
        </div>
      </main>
    </div>
  );
}
