"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ModalAjustesEstudio from '@/components/ModalAjustesEstudio';
import { usePreferencias } from '@/components/PreferenciasProvider';
import { Search, Sun, Moon, AlarmClock, Bell, HelpCircle } from 'lucide-react';

interface UsuarioConectado {
  id: string;
  nombre: string;
  rol: string;
  email: string;
  foto_url?: string | null;
}

export default function Topbar() {
  const router = useRouter();
  const { modoPantalla, setModoPantalla, tr } = usePreferencias();
  const [busqueda, setBusqueda] = useState('');
  const [recordatorios, setRecordatorios] = useState(true);
  const [modalAjustes, setModalAjustes] = useState(false);

  const [usuarioActual, setUsuarioActual] = useState<UsuarioConectado>({
    id: 'titular-af',
    nombre: 'Alejandro Fego',
    rol: 'Titular del Estudio',
    email: '',
    foto_url: null,
  });
  const [conectados, setConectados] = useState<UsuarioConectado[]>([]);

  const obtenerIniciales = (nom: string) => {
    const limpio = String(nom || 'AF')
      .replace(/^Arq\.\s*|^Dis\.\s*|^Ing\.\s*/i, '')
      .trim();
    const partes = limpio.split(/\s+/);
    if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase();
    return limpio.slice(0, 2).toUpperCase() || 'AF';
  };

  useEffect(() => {
    let canal: ReturnType<typeof supabase.channel> | null = null;
    let activo = true;

    const iniciarPresencia = async () => {
      // 1. Identificar al usuario logueado en Supabase Auth o en tabla equipo
      const { data: authData } = await supabase.auth.getUser();
      const emailAuth = authData?.user?.email || '';

      let perfil: UsuarioConectado = {
        id: authData?.user?.id || 'titular-af',
        nombre: 'Alejandro Fego',
        rol: 'Titular del Estudio',
        email: emailAuth,
        foto_url: null,
      };

      if (emailAuth) {
        const { data: miembro } = await supabase
          .from('equipo')
          .select('id, nombre, rol, email, foto_url')
          .ilike('email', emailAuth)
          .limit(1)
          .maybeSingle();

        if (miembro) {
          perfil = {
            id: String(miembro.id),
            nombre: miembro.nombre,
            rol: miembro.rol || 'Integrante del Estudio',
            email: miembro.email || emailAuth,
            foto_url: miembro.foto_url || null,
          };
        } else if (authData?.user?.user_metadata?.full_name) {
          perfil.nombre = authData.user.user_metadata.full_name;
        }
      }

      if (!activo) return;
      setUsuarioActual(perfil);

      // 2. Canal de presencia en tiempo real
      canal = supabase.channel('mb-estudio-online', {
        config: {
          presence: {
            key: perfil.email || perfil.id,
          },
        },
      });

      canal
        .on('presence', { event: 'sync' }, () => {
          if (!canal) return;
          const estado = canal.presenceState<UsuarioConectado>();
          const mapa = new Map<string, UsuarioConectado>();

          Object.values(estado).forEach((presencias) => {
            presencias.forEach((p) => {
              const clave = p.email || p.id || p.nombre;
              if (clave && !mapa.has(clave)) {
                mapa.set(clave, p);
              }
            });
          });

          setConectados(Array.from(mapa.values()));
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED' && canal) {
            await canal.track(perfil);
          }
        });
    };

    iniciarPresencia();

    return () => {
      activo = false;
      if (canal) {
        supabase.removeChannel(canal);
      }
    };
  }, []);

  const manejarBusqueda = (e: React.FormEvent) => {
    e.preventDefault();
    const q = busqueda.trim();
    if (!q) return;
    router.push(`/proyectos?q=${encodeURIComponent(q)}`);
  };

  // Filtramos al usuario propio para mostrar el resto al lado de AF
  const otrosConectados = conectados.filter(
    (u) =>
      (u.email && u.email !== usuarioActual.email) ||
      (!u.email && u.nombre !== usuarioActual.nombre)
  );

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

          {/* INTEGRANTES CONECTADOS EN VIVO */}
          {otrosConectados.length > 0 && (
            <div className="flex items-center gap-1.5 pl-1">
              {otrosConectados.map((u) => (
                <div
                  key={u.email || u.id}
                  onClick={() => router.push('/equipo')}
                  title={`${u.nombre} (${u.rol}) · En línea`}
                  className="relative group w-9 h-9 rounded-full bg-[#1E2530] hover:bg-[#27303F] border border-white/15 hover:border-emerald-400/70 text-xs font-extrabold text-white flex items-center justify-center cursor-pointer transition-all"
                >
                  {u.foto_url ? (
                    <img
                      src={u.foto_url}
                      alt={u.nombre}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span>{obtenerIniciales(u.nombre)}</span>
                  )}

                  {/* Punto verde de conectado */}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#2A2825]" />

                  {/* Tooltip al pasar el cursor */}
                  <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute top-11 right-0 bg-[#161616] border border-white/15 rounded-xl px-3 py-1.5 shadow-2xl whitespace-nowrap z-50">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      {u.nombre}
                    </div>
                    <div className="text-[10px] text-gray-400">{u.rol} · Conectado</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* BOTÓN AF (USUARIO ACTUAL) -> ABRE AJUSTES DEL ESTUDIO */}
          <button
            type="button"
            onClick={() => setModalAjustes(true)}
            title={`${usuarioActual.nombre} · Ajustes del Estudio`}
            className="relative w-9 h-9 rounded-full bg-[#1E2530] hover:bg-[#27303F] border border-white/10 hover:border-[#EAB308] text-xs font-extrabold text-[#EAB308] flex items-center justify-center cursor-pointer transition-colors"
          >
            {usuarioActual.foto_url ? (
              <img
                src={usuarioActual.foto_url}
                alt={usuarioActual.nombre}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              obtenerIniciales(usuarioActual.nombre)
            )}
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#2A2825]" />
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