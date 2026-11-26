"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Bell, Check, MessageSquare, ArrowUpRight, Volume2 } from 'lucide-react';

export function reproducirSonidoNotificacion() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    [
      { freq: 783.99, delay: 0, dur: 0.14 },
      { freq: 1046.5, delay: 0.15, dur: 0.25 },
    ].forEach((n) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(n.freq, ctx.currentTime + n.delay);
      gain.gain.setValueAtTime(0.25, ctx.currentTime + n.delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + n.delay + n.dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + n.delay);
      osc.stop(ctx.currentTime + n.delay + n.dur + 0.02);
    });
  } catch {
    // Silencioso si el navegador bloquea audio sin interacción
  }
}

export default function NotificacionesTopbar() {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [avisos, setAvisos] = useState<any[]>([]);
  const [usuarioActual, setUsuarioActual] = useState('Alejandro Fego');
  const refContenedor = useRef<HTMLDivElement>(null);
  const idsNotificadosRef = useRef<Set<string>>(new Set());
  const primeraCargaRef = useRef(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('mb_sesion_usuario');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.nombre) setUsuarioActual(parsed.nombre);
      }
    } catch {
      // Silencioso
    }
  }, []);

  const cargarAvisos = async () => {
    const { data: proyectosData, error } = await supabase
      .from('proyectos')
      .select('id, codigo, nombre, comentarios');

    if (error || !proyectosData) return;

    const nombreNorm = usuarioActual.trim().toLowerCase();
    const sinArq = nombreNorm.replace(/^arq\.\s*/i, '');
    const primerNombre = sinArq.split(' ')[0] || sinArq;

    let vistosLocal: string[] = [];
    try {
      vistosLocal = JSON.parse(
        localStorage.getItem(`mb_notif_vistas_${nombreNorm}`) || '[]'
      );
      if (!Array.isArray(vistosLocal)) vistosLocal = [];
    } catch {
      vistosLocal = [];
    }

    const todosAvisos: any[] = [];

    for (const proy of proyectosData) {
      let listaComentarios = proy.comentarios;
      if (typeof listaComentarios === 'string') {
        try {
          listaComentarios = JSON.parse(listaComentarios);
        } catch {
          listaComentarios = [];
        }
      }
      if (!Array.isArray(listaComentarios)) continue;

      for (const c of listaComentarios) {
        if (!c) continue;
        const cId = c.id ?? `${c.fecha}_${c.texto}`;
        const uid = `${proy.codigo}_${cId}`;
        const texto = String(c.texto || c.mensaje || '').trim();
        if (!texto) continue;

        const textoLower = texto.toLowerCase();
        const autor = String(c.autor || 'Equipo').trim();

        // 1. Verificar si ESTE usuario ya la marcó como vista
        const vistosPor: string[] = Array.isArray(c.vistos_por) ? c.vistos_por : [];
        if (vistosPor.some((u) => String(u).toLowerCase() === nombreNorm)) continue;
        if (vistosLocal.includes(uid)) continue;

        // 2. Verificar si tiene menciones (@Nombre) o si es un aviso general para todos
        const tieneMencionArroba = texto.includes('@');
        const mencionaAlUsuario =
          textoLower.includes(`@${nombreNorm}`) ||
          textoLower.includes(`@${sinArq}`) ||
          (primerNombre.length >= 4 && textoLower.includes(`@${primerNombre}`));

        // Si NO tiene @, les aparece a TODOS los integrantes del equipo.
        // Si TIENE @, les aparece únicamente a los usuarios arrobados.
        if (!tieneMencionArroba || mencionaAlUsuario) {
          todosAvisos.push({
            uid,
            comentarioId: c.id,
            proyecto_codigo: proy.codigo,
            proyecto_nombre: proy.nombre,
            autor,
            mensaje: texto,
            fecha: c.fecha || '',
          });
        }
      }
    }

    todosAvisos.sort((a, b) => Number(b.comentarioId || 0) - Number(a.comentarioId || 0));

    // Sonido automático cuando ingresa una notificación nueva
    if (primeraCargaRef.current) {
      todosAvisos.forEach((a) => idsNotificadosRef.current.add(a.uid));
      primeraCargaRef.current = false;
    } else {
      const hayNueva = todosAvisos.some((a) => !idsNotificadosRef.current.has(a.uid));
      if (hayNueva) {
        todosAvisos.forEach((a) => idsNotificadosRef.current.add(a.uid));
        reproducirSonidoNotificacion();
      }
    }

    setAvisos(todosAvisos);
  };

  useEffect(() => {
    primeraCargaRef.current = true;
    idsNotificadosRef.current.clear();
    cargarAvisos();

    const timer = setInterval(cargarAvisos, 5000);
    const alPublicar = () => {
      cargarAvisos();
    };
    window.addEventListener('mb_nuevo_comentario', alPublicar);

    return () => {
      clearInterval(timer);
      window.removeEventListener('mb_nuevo_comentario', alPublicar);
    };
  }, [usuarioActual]);

  useEffect(() => {
    const cerrarClickAfuera = (e: MouseEvent) => {
      if (refContenedor.current && !refContenedor.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener('mousedown', cerrarClickAfuera);
    return () => document.removeEventListener('mousedown', cerrarClickAfuera);
  }, []);

  const marcarComoVista = async (aviso: any, navegarAlProyecto = false) => {
    const nombreNorm = usuarioActual.trim().toLowerCase();

    // Quitar de la lista visual de ESTE usuario
    setAvisos((prev) => prev.filter((a) => a.uid !== aviso.uid));

    // Guardar en localStorage de ESTE usuario
    try {
      const clave = `mb_notif_vistas_${nombreNorm}`;
      const prevLocal = JSON.parse(localStorage.getItem(clave) || '[]');
      if (!prevLocal.includes(aviso.uid)) {
        localStorage.setItem(clave, JSON.stringify([...prevLocal, aviso.uid]));
      }
    } catch {
      // Silencioso
    }

    // Guardar en Supabase (vistos_por) sin borrar el comentario del proyecto
    const { data: proy } = await supabase
      .from('proyectos')
      .select('comentarios')
      .eq('codigo', aviso.proyecto_codigo)
      .single();

    if (proy && Array.isArray(proy.comentarios)) {
      const actualizados = proy.comentarios.map((c: any) => {
        if (String(c.id) !== String(aviso.comentarioId)) return c;
        const prevVistos: string[] = Array.isArray(c.vistos_por) ? c.vistos_por : [];
        if (prevVistos.includes(usuarioActual)) return c;
        return { ...c, vistos_por: [...prevVistos, usuarioActual] };
      });

      await supabase
        .from('proyectos')
        .update({ comentarios: actualizados })
        .eq('codigo', aviso.proyecto_codigo);
    }

    if (navegarAlProyecto && aviso.proyecto_codigo) {
      setAbierto(false);
      router.push(`/proyectos/${aviso.proyecto_codigo}?tab=comentarios`);
    }
  };

  const marcarTodasVistas = async () => {
    const copia = [...avisos];
    for (const av of copia) {
      await marcarComoVista(av, false);
    }
  };

  return (
    <div ref={refContenedor} className="relative">
      <button
        type="button"
        onClick={() => {
          const next = !abierto;
          setAbierto(next);
          if (next) cargarAvisos();
        }}
        className={`px-3.5 py-2 rounded-full text-xs font-bold inline-flex items-center gap-2 transition-all cursor-pointer border ${
          abierto
            ? 'bg-[#25272E] border-[#D4EE36] text-white shadow-[0_0_0_1px_#D4EE36]'
            : 'bg-[#25272E] border-white/10 hover:border-white/25 text-gray-200'
        }`}
      >
        <Bell className="w-3.5 h-3.5 text-gray-300" />
        <span>Notificaciones</span>
        {avisos.length > 0 && (
          <span className="bg-[#D4EE36] text-black text-[10px] font-black px-1.5 py-0.2 rounded-full animate-pulse">
            {avisos.length}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 mt-2.5 w-96 bg-[#141519] border border-[#D4EE36]/50 rounded-2xl shadow-2xl p-4 z-[9999]">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold tracking-wider uppercase text-white">
                AVISOS DEL EQUIPO
              </span>
              <button
                type="button"
                onClick={reproducirSonidoNotificacion}
                title="Probar sonido de notificación"
                className="text-gray-400 hover:text-[#D4EE36] cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            </div>
            {avisos.length > 0 && (
              <button
                type="button"
                onClick={marcarTodasVistas}
                className="text-[11px] font-bold text-[#D4EE36] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3 h-3" /> Marcar todas vistas
              </button>
            )}
          </div>

          {avisos.length === 0 ? (
            <div className="py-6 text-center text-xs text-gray-300">
              No hay notificaciones ni menciones recientes para {usuarioActual}.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {avisos.map((av) => (
                <div
                  key={av.uid}
                  onClick={() => marcarComoVista(av, true)}
                  className="bg-[#1C1E24] hover:bg-[#242730] border border-white/10 rounded-xl p-3 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-[#D4EE36]">
                      <MessageSquare className="w-3 h-3" />
                      {av.proyecto_codigo} {av.proyecto_nombre ? `· ${av.proyecto_nombre}` : ''}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        marcarComoVista(av, false);
                      }}
                      title="Marcar como vista (quitar de mis notificaciones)"
                      className="text-[10px] font-bold text-gray-400 hover:text-white px-2 py-0.5 rounded bg-white/5 cursor-pointer"
                    >
                      Vista ✓
                    </button>
                  </div>

                  <p className="text-xs text-white leading-snug line-clamp-2">{av.mensaje}</p>

                  <div className="flex items-center justify-between mt-2 text-[10px] text-gray-400">
                    <span>
                      Por {av.autor} {av.fecha ? `· ${av.fecha}` : ''}
                    </span>
                    <span className="inline-flex items-center gap-0.5 text-sky-400 group-hover:underline font-bold">
                      Ir a comentarios <ArrowUpRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}