"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ModalAjustesEstudio from '@/components/ModalAjustesEstudio';
import { usePreferencias } from '@/components/PreferenciasProvider';
import { Search, Sun, Moon, AlarmClock, Bell, HelpCircle } from 'lucide-react';

export default function Topbar() {
  const router = useRouter();
  const { modoPantalla, setModoPantalla, tr } = usePreferencias();
  const [busqueda, setBusqueda] = useState('');
  const [recordatorios, setRecordatorios] = useState(true);
  const [modalAjustes, setModalAjustes] = useState(false);

  const manejarBusqueda = (e: React.FormEvent) => {
    e.preventDefault();
    const q = busqueda.trim();
    if (!q) return;
    router.push(`/proyectos?q=${encodeURIComponent(q)}`);
  };

  return (
    <>
      <header className="mt-3 mx-3 rounded-3xl bg-[#2A2825]/85 backdrop-blur-md border border-white/10 px-5 py-3 flex flex-wrap items-center justify-between gap-4 relative z-20 shadow-xl">
        {/* BUSCADOR IZQUIERDA */}
        <form onSubmit={manejarBusqueda} className="relative flex-1 max-w-md min-w-[220px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder={tr('buscarPlaceholder')}
            className="w-full bg-[#1E2530] border border-white/10 rounded-full pl-10 pr-4 py-2 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-[#EAB308]/60 transition-colors"
          />
        </form>

        {/* BOTONES DERECHA */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setModoPantalla(modoPantalla === 'oscuro' ? 'claro' : 'oscuro')}
            className="bg-[#1E2530] hover:bg-[#27303F] border border-white/10 text-white px-3.5 py-2 rounded-full text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            {modoPantalla === 'claro' ? (
              <Moon className="w-3.5 h-3.5 text-[#EAB308]" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-[#EAB308]" />
            )}
            <span>{modoPantalla === 'claro' ? tr('oscuro') : tr('claro')}</span>
          </button>

          <button
            type="button"
            onClick={() => setRecordatorios(!recordatorios)}
            className="bg-[#1E2530] hover:bg-[#27303F] border border-white/10 text-white px-3.5 py-2 rounded-full text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <AlarmClock className="w-3.5 h-3.5 text-[#EAB308]" />
            <span>{recordatorios ? tr('recordatoriosSi') : tr('recordatoriosNo')}</span>
          </button>

          <button
            type="button"
            onClick={() => setModalAjustes(true)}
            className="bg-[#5C4921]/75 hover:bg-[#6E5727] border border-[#EAB308]/60 text-[#EAB308] px-3.5 py-2 rounded-full text-xs font-extrabold cursor-pointer transition-colors"
          >
            {tr('titular')}
          </button>

          <button
            type="button"
            className="bg-white/5 hover:bg-white/10 border border-white/15 text-white px-3.5 py-2 rounded-full text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Bell className="w-3.5 h-3.5 text-gray-200" />
            <span>{tr('notificaciones')}</span>
          </button>

          <button
            type="button"
            className="bg-white/5 hover:bg-white/10 border border-white/15 text-white px-3.5 py-2 rounded-full text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5 text-gray-200" />
            <span>{tr('instructivo')}</span>
          </button>

          {/* BOTÓN AF -> ABRE AJUSTES DEL ESTUDIO */}
          <button
            type="button"
            onClick={() => setModalAjustes(true)}
            title="Ajustes del Estudio"
            className="w-9 h-9 rounded-full bg-[#1E2530] hover:bg-[#27303F] border border-white/10 hover:border-[#EAB308] text-xs font-extrabold text-[#EAB308] flex items-center justify-center cursor-pointer transition-colors"
          >
            AF
          </button>
        </div>
      </header>

      <ModalAjustesEstudio
        abierto={modalAjustes}
        onClose={() => setModalAjustes(false)}
      />
    </>
  );
}