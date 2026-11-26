"use client";

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { usePreferencias } from '@/components/PreferenciasProvider';
import NotificacionesTopbar from '@/components/NotificacionesTopbar';
import { Search, Sun, Moon, AlarmClock, HelpCircle } from 'lucide-react';

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { modoPantalla, setModoPantalla, tr } = usePreferencias();

  const [busquedaGlobal, setBusquedaGlobal] = useState('');
  const [recordatoriosActivos, setRecordatoriosActivos] = useState(true);
  const [equipo, setEquipo] = useState<any[]>([]);
  const [usuario, setUsuario] = useState<{
    nombre: string;
    rol_sistema?: string;
    foto_url?: string;
  }>({
    nombre: 'Alejandro Fego',
    rol_sistema: 'Titular',
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('mb_sesion_usuario');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.nombre) setUsuario(parsed);
      }
      const savedRec = localStorage.getItem('mb_recordatorios_activos');
      if (savedRec === '0') setRecordatoriosActivos(false);
    } catch {
      // Silencioso
    }

    const cargarEquipo = async () => {
      const { data } = await supabase
        .from('equipo')
        .select('id, nombre, foto_url')
        .order('nombre', { ascending: true });
      if (data) setEquipo(data);
    };
    cargarEquipo();
  }, []);

  if (pathname === '/login') return null;

  const alternarRecordatorios = () => {
    const next = !recordatoriosActivos;
    setRecordatoriosActivos(next);
    localStorage.setItem('mb_recordatorios_activos', next ? '1' : '0');
  };

  const manejarBusqueda = (e: React.FormEvent) => {
    e.preventDefault();
    const q = busquedaGlobal.trim();
    if (!q) return;
    router.push(`/proyectos?q=${encodeURIComponent(q)}`);
  };

  return (
    <header className="mx-3 mt-3 mb-1 bg-[#181818] border border-white/10 rounded-full px-4 py-2 flex flex-wrap items-center justify-between gap-3 shadow-xl relative z-40">
      {/* BUSCADOR GLOBAL */}
      <form onSubmit={manejarBusqueda} className="relative flex-1 min-w-[220px] max-w-md">
        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={busquedaGlobal}
          onChange={(e) => setBusquedaGlobal(e.target.value)}
          placeholder={tr('buscarPlaceholder')}
          className="w-full bg-[#22242A] border border-white/10 focus:border-[#D4EE36]/60 rounded-full pl-9 pr-4 py-1.5 text-xs text-white placeholder-gray-400 outline-none"
        />
      </form>

      {/* CONTROLES DERECHA */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setModoPantalla(modoPantalla === 'claro' ? 'oscuro' : 'claro')}
          className="bg-[#25272E] hover:bg-white/10 border border-white/10 rounded-full px-3 py-1.5 text-xs font-bold text-gray-200 inline-flex items-center gap-1.5 cursor-pointer"
        >
          {modoPantalla === 'claro' ? (
            <>
              <Moon className="w-3.5 h-3.5 text-[#D4EE36]" /> {tr('oscuro')}
            </>
          ) : (
            <>
              <Sun className="w-3.5 h-3.5 text-[#D4EE36]" /> {tr('claro')}
            </>
          )}
        </button>

        <button
          type="button"
          onClick={alternarRecordatorios}
          className="bg-[#25272E] hover:bg-white/10 border border-white/10 rounded-full px-3 py-1.5 text-xs font-bold text-gray-200 inline-flex items-center gap-1.5 cursor-pointer"
        >
          <AlarmClock className="w-3.5 h-3.5 text-[#D4EE36]" />
          <span>{recordatoriosActivos ? tr('recordatoriosSi') : tr('recordatoriosNo')}</span>
        </button>

        <span className="bg-[#2B2410] border border-[#EAB308]/50 text-[#EAB308] rounded-full px-3 py-1.5 text-xs font-extrabold">
          {usuario.rol_sistema || tr('titular')}
        </span>

        {/* NOTIFICACIONES CON AVISOS DEL EQUIPO + SONIDO */}
        <NotificacionesTopbar />

        <button
          type="button"
          onClick={() => router.push('/configuracion')}
          className="bg-[#25272E] hover:bg-white/10 border border-white/10 rounded-full px-3 py-1.5 text-xs font-bold text-gray-200 inline-flex items-center gap-1.5 cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
          <span>{tr('instructivo')}</span>
        </button>

        {/* AVATARES EN LÍNEA */}
        <div className="flex items-center -space-x-1.5 pl-1">
          {equipo.slice(0, 4).map((m) => {
            const ini = String(m.nombre || '?')
              .replace(/^Arq\.\s*/i, '')
              .split(' ')
              .map((p: string) => p[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();
            return (
              <div
                key={m.id}
                title={m.nombre}
                className="relative w-7 h-7 rounded-full border-2 border-[#181818] bg-[#25272E] flex items-center justify-center text-[10px] font-extrabold text-white overflow-hidden"
              >
                {m.foto_url ? (
                  <img src={m.foto_url} alt={m.nombre} className="w-full h-full object-cover" />
                ) : (
                  ini
                )}
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-[#181818]" />
              </div>
            );
          })}
        </div>
      </div>
    </header>
  );
}