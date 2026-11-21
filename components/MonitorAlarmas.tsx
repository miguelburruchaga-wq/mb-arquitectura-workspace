"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Bell, X, Volume2, ArrowRight } from 'lucide-react';

// Genera un sonido de alarma claro (3 tonos) sin depender de archivos externos
function reproducirSonidoAlarma() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const notas = [880, 1108.73, 1318.51];
    notas.forEach((frecuencia, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frecuencia, ctx.currentTime + i * 0.18);

      gain.gain.setValueAtTime(0.001, ctx.currentTime + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + i * 0.18 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + i * 0.18);
      osc.stop(ctx.currentTime + i * 0.18 + 0.36);
    });
  } catch {
    // Si el navegador bloqueó el audio por falta de interacción previa, continúa silencioso
  }
}

export default function MonitorAlarmas() {
  const router = useRouter();
  const [alertaActiva, setAlertaActiva] = useState<any | null>(null);
  const alertaActivaRef = useRef<any | null>(null);
  const intervaloSonidoRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    alertaActivaRef.current = alertaActiva;
  }, [alertaActiva]);

  const formatearFecha = (fechaStr: string | null) => {
    if (!fechaStr) return '—';
    const partes = fechaStr.split('-');
    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : fechaStr;
  };

  const detenerSonido = () => {
    if (intervaloSonidoRef.current) {
      clearInterval(intervaloSonidoRef.current);
      intervaloSonidoRef.current = null;
    }
  };

  // Desactiva la alarma definitivamente en Supabase y cierra el cartel
  const silenciarYDesactivar = async (visita: any) => {
    detenerSonido();
    setAlertaActiva(null);
    if (visita?.id) {
      const key = `alarma_global_${visita.id}_${visita.alarma_fecha}_${visita.alarma_horario}`;
      localStorage.setItem(key, '1');
      await supabase.from('visitas').update({ alarma_activa: false }).eq('id', visita.id);
    }
  };

  const irALaVisitaEnAgenda = async () => {
    if (!alertaActiva) return;
    const visita = alertaActiva;
    await silenciarYDesactivar(visita);
    router.push(`/agenda?visitaId=${visita.id}`);
    window.dispatchEvent(new CustomEvent('abrir-visita-agenda', { detail: visita.id }));
  };

  useEffect(() => {
    const chequearAlarmas = async () => {
      const { data: visitas } = await supabase
        .from('visitas')
        .select('*')
        .eq('alarma_activa', true)
        .eq('estado', 'Programada');

      const lista = visitas || [];

      // Si hay una alerta en pantalla pero la visita ya fue completada o desactivada, la cerramos
      if (alertaActivaRef.current) {
        const sigueVigente = lista.some((v) => v.id === alertaActivaRef.current.id);
        if (!sigueVigente) {
          detenerSonido();
          setAlertaActiva(null);
        }
        return;
      }

      const ahora = new Date();

      for (const v of lista) {
        if (!v.alarma_fecha || !v.alarma_horario) continue;

        const fechaAlarma = new Date(`${v.alarma_fecha}T${v.alarma_horario}:00`);
        const diffMin = (ahora.getTime() - fechaAlarma.getTime()) / 60000;
        const key = `alarma_global_${v.id}_${v.alarma_fecha}_${v.alarma_horario}`;

        if (diffMin >= 0 && diffMin <= 15 && !localStorage.getItem(key)) {
          localStorage.setItem(key, '1');
          setAlertaActiva(v);

          reproducirSonidoAlarma();
          let repeticiones = 0;
          detenerSonido();
          intervaloSonidoRef.current = setInterval(() => {
            repeticiones += 1;
            if (repeticiones >= 3) {
              detenerSonido();
              return;
            }
            reproducirSonidoAlarma();
          }, 4000);

          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`Recordatorio: ${v.titulo}`, {
              body: `${v.proyecto_codigo || ''} · ${v.proyecto_nombre || ''} (${formatearFecha(v.fecha)} ${v.horario} hs)`,
            });
          }
          break;
        }
      }
    };

    chequearAlarmas();
    const intervalo = setInterval(chequearAlarmas, 15000);

    return () => {
      clearInterval(intervalo);
      detenerSonido();
    };
  }, []);

  if (!alertaActiva) return null;

  return (
    <div
      onClick={irALaVisitaEnAgenda}
      className="fixed top-6 right-6 bg-[#1A1A1A] hover:bg-[#222222] border border-[#EAB308] shadow-2xl rounded-2xl p-4 flex items-start gap-3.5 z-[100] max-w-sm animate-bounce cursor-pointer transition-colors"
    >
      <div className="w-10 h-10 rounded-full bg-[#EAB308]/20 text-[#EAB308] flex items-center justify-center flex-shrink-0">
        <Bell className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase text-[#EAB308]">
          <Volume2 className="w-3.5 h-3.5" /> Recordatorio de Visita
        </div>
        <div className="text-sm font-bold text-white mt-0.5 truncate">{alertaActiva.titulo}</div>
        <div className="text-xs text-gray-400 mt-0.5">
          {formatearFecha(alertaActiva.fecha)} · {alertaActiva.horario} hs
        </div>
        <div className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-[#EAB308]">
          Ver visita en Agenda <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          silenciarYDesactivar(alertaActiva);
        }}
        className="text-gray-400 hover:text-white cursor-pointer"
        title="Silenciar y cerrar"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}