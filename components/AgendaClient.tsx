"use client";

import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ModalVisita, {
  reproducirSonidoAlarmaVisita,
  lanzarNotificacionSistema,
} from '@/components/ModalVisita';
import ModalTarea from '@/components/ModalTarea';
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  Plus,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Bell,
  X,
} from 'lucide-react';

const MESES_LARGO = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const DIAS_SEMANA = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

function formatearFechaCorta(iso?: string | null) {
  if (!iso) return '—';
  const [y, m, d] = String(iso).split('T')[0].split('-');
  if (!y || !m || !d) return String(iso);
  return `${d}/${m}/${y}`;
}

export default function AgendaClient({
  visitasIniciales = [],
  tareasIniciales = [],
  proyectos = [],
  equipo = [],
}: {
  visitasIniciales: any[];
  tareasIniciales?: any[];
  proyectos?: any[];
  equipo?: any[];
}) {
  const router = useRouter();
  const [montado, setMontado] = useState(false);
  const [visitas, setVisitas] = useState<any[]>(visitasIniciales);
  const [tareas, setTareas] = useState<any[]>(tareasIniciales);

  const [pestana, setPestana] = useState<'calendario' | 'pendientes' | 'realizadas'>('calendario');
  const [modoVista, setModoVista] = useState<'Mes' | 'Semana'>('Mes');
  const [fechaCursor, setFechaCursor] = useState(() => new Date());

  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtroProyecto, setFiltroProyecto] = useState('Todos');
  const [filtroTipo, setFiltroTipo] = useState('Todos');

  const [modalVisita, setModalVisita] = useState(false);
  const [visitaEditando, setVisitaEditando] = useState<any | null>(null);
  const [fechaNuevaVisita, setFechaNuevaVisita] = useState('');

  const [modalTarea, setModalTarea] = useState(false);
  const [tareaEditando, setTareaEditando] = useState<any | null>(null);

  const [alarmaSonando, setAlarmaSonando] = useState<any | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setMontado(true);
  }, []);

  useEffect(() => {
    setVisitas(visitasIniciales);
  }, [visitasIniciales]);

  useEffect(() => {
    setTareas(tareasIniciales);
  }, [tareasIniciales]);

  const mostrarToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  // Monitor en tiempo real de alarmas de Visitas y Agenda
  useEffect(() => {
    const revisarAlarmas = () => {
      const ahora = new Date();
      const yyyy = ahora.getFullYear();
      const mm = String(ahora.getMonth() + 1).padStart(2, '0');
      const dd = String(ahora.getDate()).padStart(2, '0');
      const hh = String(ahora.getHours()).padStart(2, '0');
      const min = String(ahora.getMinutes()).padStart(2, '0');
      const fechaActual = `${yyyy}-${mm}-${dd}`;
      const horaActual = `${hh}:${min}`;

      for (const v of visitas) {
        if (!v.alarma_activa || !v.alarma_fecha || !v.alarma_hora) continue;
        const clave = `mb_alarma_vis_${v.id}_${v.alarma_fecha}_${v.alarma_hora}`;
        if (localStorage.getItem(clave)) continue;

        if (
          v.alarma_fecha < fechaActual ||
          (v.alarma_fecha === fechaActual && v.alarma_hora <= horaActual)
        ) {
          localStorage.setItem(clave, '1');
          setAlarmaSonando(v);
          break;
        }
      }
    };

    revisarAlarmas();
    const timer = setInterval(revisarAlarmas, 5000);
    return () => clearInterval(timer);
  }, [visitas]);

  // Bucle sonoro continuo + notificación de Windows por encima de cualquier ventana
  useEffect(() => {
    if (!alarmaSonando) return;

    const tono = alarmaSonando.alarma_tono || 'Campana Suave';
    const vol =
      typeof alarmaSonando.alarma_volumen === 'number' ? alarmaSonando.alarma_volumen : 80;

    reproducirSonidoAlarmaVisita(tono, vol);
    lanzarNotificacionSistema(
      '🔔 Recordatorio de Agenda / Visita',
      `${alarmaSonando.titulo || alarmaSonando.motivo} (${alarmaSonando.alarma_hora} hs)`
    );

    const loopSonido = setInterval(() => {
      reproducirSonidoAlarmaVisita(tono, vol);
    }, 2200);

    return () => clearInterval(loopSonido);
  }, [alarmaSonando]);

  // Unificar Visitas, Tareas y Entregas de Obra
  const eventosUnificados = useMemo(() => {
    const lista: any[] = [];

    for (const v of visitas) {
      if (filtroProyecto !== 'Todos' && v.proyecto_codigo !== filtroProyecto) continue;
      if (filtroTipo !== 'Todos' && filtroTipo !== 'Visita') continue;

      const fechaIso = String(v.fecha || '').split('T')[0];
      if (!fechaIso) continue;

      lista.push({
        uid: `vis-${v.id}`,
        clase: 'Visita',
        fecha: fechaIso,
        hora: v.horario || v.hora || '',
        titulo: v.titulo || v.motivo || 'Visita de obra',
        subtitulo: v.tipo || 'Visita',
        proyecto_codigo: v.proyecto_codigo || '',
        proyecto_nombre: v.proyecto_nombre || '',
        realizada: v.estado === 'Realizada',
        alarma_activa: Boolean(v.alarma_activa),
        raw: v,
      });
    }

    for (const t of tareas) {
      if (filtroProyecto !== 'Todos' && t.proyecto_codigo !== filtroProyecto) continue;
      if (filtroTipo !== 'Todos' && filtroTipo !== 'Tarea') continue;

      const fechaIso = String(t.fecha_vencimiento || '').split('T')[0];
      if (!fechaIso) continue;

      lista.push({
        uid: `tar-${t.id}`,
        clase: 'Tarea',
        fecha: fechaIso,
        hora: '',
        titulo: t.titulo || 'Tarea',
        subtitulo: t.rubro || 'Tarea',
        proyecto_codigo: t.proyecto_codigo || '',
        proyecto_nombre: t.proyecto_nombre || '',
        realizada: t.estado === 'Finalizado' || t.estado === 'Completada',
        alarma_activa: false,
        raw: t,
      });
    }

    for (const p of proyectos) {
      if (filtroProyecto !== 'Todos' && p.codigo !== filtroProyecto) continue;
      if (filtroTipo !== 'Todos' && filtroTipo !== 'Entrega') continue;

      const fechaIso = String(p.entrega_estimada || '').split('T')[0];
      if (!fechaIso) continue;

      lista.push({
        uid: `ent-${p.codigo}`,
        clase: 'Entrega',
        fecha: fechaIso,
        hora: '',
        titulo: `Entrega · ${p.nombre}`,
        subtitulo: 'Entrega de obra',
        proyecto_codigo: p.codigo,
        proyecto_nombre: p.nombre,
        realizada: p.estado === 'Finalizado',
        alarma_activa: false,
        raw: p,
      });
    }

    return lista;
  }, [visitas, tareas, proyectos, filtroProyecto, filtroTipo]);

  const anioActual = fechaCursor.getFullYear();
  const mesActual = fechaCursor.getMonth();
  const prefijoMes = `${anioActual}-${String(mesActual + 1).padStart(2, '0')}`;

  const kpis = useMemo(() => {
    const eventosMes = eventosUnificados.filter((e) => e.fecha.startsWith(prefijoMes)).length;
    const visitasRealizadas = visitas.filter((v) => v.estado === 'Realizada').length;
    const visitasPendientes = visitas.filter((v) => v.estado !== 'Realizada').length;
    const tareasCompletadas = tareas.filter(
      (t) => t.estado === 'Finalizado' || t.estado === 'Completada'
    ).length;

    return {
      eventosMes,
      visitasRealizadas,
      visitasPendientes,
      tareasTotal: tareas.length,
      tareasCompletadas,
    };
  }, [eventosUnificados, prefijoMes, visitas, tareas]);

  const celdasCalendario = useMemo(() => {
    if (modoVista === 'Semana') {
      const base = new Date(fechaCursor);
      const day = base.getDay();
      const diffLun = day === 0 ? -6 : 1 - day;
      base.setDate(base.getDate() + diffLun);

      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(base);
        d.setDate(base.getDate() + i);
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
          d.getDate()
        ).padStart(2, '0')}`;
        return {
          iso,
          dia: d.getDate(),
          esMesActual: d.getMonth() === mesActual,
        };
      });
    }

    const primerDiaMes = new Date(anioActual, mesActual, 1);
    const diaSemanaInicio = primerDiaMes.getDay();
    const offsetLunes = diaSemanaInicio === 0 ? 6 : diaSemanaInicio - 1;

    const inicioGrilla = new Date(anioActual, mesActual, 1 - offsetLunes);
    return Array.from({ length: 35 }, (_, i) => {
      const d = new Date(inicioGrilla);
      d.setDate(inicioGrilla.getDate() + i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      return {
        iso,
        dia: d.getDate(),
        esMesActual: d.getMonth() === mesActual,
      };
    });
  }, [fechaCursor, anioActual, mesActual, modoVista]);

  const moverPeriodo = (delta: number) => {
    const next = new Date(fechaCursor);
    if (modoVista === 'Semana') {
      next.setDate(next.getDate() + delta * 7);
    } else {
      next.setMonth(next.getMonth() + delta);
    }
    setFechaCursor(next);
  };

  const visitasPendientesLista = useMemo(
    () => visitas.filter((v) => v.estado !== 'Realizada'),
    [visitas]
  );

  const visitasRealizadasLista = useMemo(
    () => visitas.filter((v) => v.estado === 'Realizada'),
    [visitas]
  );

  const hoyIso = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen text-white p-8 font-sans">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Visitas y Agenda</h1>
        <p className="text-xs text-gray-400 mt-1">
          Visitas de obra, reuniones con clientes, coordinación de proveedores y calendario unificado
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#181818] border border-white/10 rounded-2xl p-4">
          <div className="text-xs text-gray-400">Eventos de {MESES_LARGO[mesActual]}</div>
          <div className="text-2xl font-extrabold text-white mt-1.5">{kpis.eventosMes}</div>
        </div>
        <div className="bg-[#181818] border border-white/10 rounded-2xl p-4">
          <div className="text-xs text-gray-400">Visitas realizadas</div>
          <div className="text-2xl font-extrabold text-emerald-400 mt-1.5">
            {kpis.visitasRealizadas}
          </div>
        </div>
        <div className="bg-[#181818] border border-white/10 rounded-2xl p-4">
          <div className="text-xs text-gray-400">Visitas pendientes</div>
          <div className="text-2xl font-extrabold text-[#D4EE36] mt-1.5">
            {kpis.visitasPendientes}
          </div>
        </div>
        <div className="bg-[#181818] border border-white/10 rounded-2xl p-4">
          <div className="text-xs text-gray-400">Tareas / Entregas</div>
          <div className="text-2xl font-extrabold text-white mt-1.5">
            {kpis.tareasTotal}{' '}
            <span className="text-gray-500 text-lg">/ {kpis.tareasCompletadas}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-between items-center gap-4 mb-5">
        <div className="inline-flex items-center gap-1 border-b border-white/10">
          {[
            { id: 'calendario', label: 'Calendario', icon: CalendarIcon },
            { id: 'pendientes', label: `Pendientes (${visitasPendientesLista.length})`, icon: Clock },
            {
              id: 'realizadas',
              label: `Realizadas (${visitasRealizadasLista.length})`,
              icon: CheckCircle2,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const activo = pestana === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPestana(tab.id as any)}
                className={`px-4 py-2.5 rounded-t-xl text-xs font-extrabold inline-flex items-center gap-1.5 border border-b-0 transition-colors cursor-pointer ${
                  activo
                    ? 'bg-[#181818] border-white/15 text-[#D4EE36]'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setVisitaEditando(null);
              setFechaNuevaVisita('');
              setModalVisita(true);
            }}
            className="bg-[#D4EE36] hover:bg-[#c3de28] text-black px-4 py-2 rounded-xl font-extrabold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" /> Agendar visita
          </button>
          <button
            type="button"
            onClick={() => {
              setTareaEditando(null);
              setModalTarea(true);
            }}
            className="bg-[#181818] hover:bg-white/10 border border-white/15 text-white px-4 py-2 rounded-xl font-extrabold text-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Nueva tarea
          </button>
        </div>
      </div>

      {pestana === 'calendario' && (
        <div className="bg-[#181818] border border-white/10 rounded-2xl p-5 shadow-2xl">
          <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
            <div className="flex items-center gap-4 text-xs font-bold text-gray-300">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D4EE36]" /> Visita
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" /> Tarea
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Entrega de obra
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setMostrarFiltros((v) => !v)}
                className="bg-[#222] hover:bg-white/10 border border-white/10 text-white px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" /> Filtros
              </button>

              <div className="bg-[#222] border border-white/10 rounded-xl p-0.5 inline-flex">
                {(['Mes', 'Semana'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setModoVista(m)}
                    className={`px-3 py-1 rounded-lg text-xs font-extrabold cursor-pointer ${
                      modoVista === m ? 'bg-[#D4EE36] text-black' : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <div className="bg-[#222] border border-white/10 rounded-xl px-2.5 py-1.5 inline-flex items-center gap-2.5 text-xs font-extrabold text-white">
                <button
                  type="button"
                  onClick={() => moverPeriodo(-1)}
                  className="text-gray-400 hover:text-white cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span>
                  {MESES_LARGO[mesActual]} {anioActual}
                </span>
                <button
                  type="button"
                  onClick={() => moverPeriodo(1)}
                  className="text-gray-400 hover:text-white cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setFechaCursor(new Date())}
                  className="text-[#D4EE36] hover:underline ml-1 cursor-pointer"
                >
                  Hoy
                </button>
              </div>
            </div>
          </div>

          {mostrarFiltros && (
            <div className="flex flex-wrap items-center gap-3 mb-4 p-3 rounded-xl bg-[#121212] border border-white/10 text-xs">
              <select
                value={filtroProyecto}
                onChange={(e) => setFiltroProyecto(e.target.value)}
                className="bg-[#1C1C1C] border border-gray-700 rounded-lg px-3 py-1.5 text-white font-semibold"
              >
                <option value="Todos">Proyecto: Todos</option>
                {proyectos.map((p) => (
                  <option key={p.codigo} value={p.codigo}>
                    {p.codigo} · {p.nombre}
                  </option>
                ))}
              </select>

              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="bg-[#1C1C1C] border border-gray-700 rounded-lg px-3 py-1.5 text-white font-semibold"
              >
                <option value="Todos">Tipo: Todos</option>
                <option value="Visita">Solo Visitas</option>
                <option value="Tarea">Solo Tareas</option>
                <option value="Entrega">Solo Entregas de obra</option>
              </select>
            </div>
          )}

          <div className="border border-white/10 rounded-xl overflow-hidden">
            <div className="grid grid-cols-7 bg-[#141414] border-b border-white/10">
              {DIAS_SEMANA.map((d) => (
                <div
                  key={d}
                  className="px-3 py-2.5 text-[11px] font-extrabold text-gray-400 border-r border-white/10 last:border-r-0"
                >
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {celdasCalendario.map((celda) => {
                const eventosDia = eventosUnificados.filter((e) => e.fecha === celda.iso);
                const esHoy = celda.iso === hoyIso;

                return (
                  <div
                    key={celda.iso}
                    onClick={() => {
                      setVisitaEditando(null);
                      setFechaNuevaVisita(celda.iso);
                      setModalVisita(true);
                    }}
                    className={`min-h-[118px] p-2 border-r border-b border-white/10 last:border-r-0 transition-colors cursor-pointer hover:bg-white/[0.03] ${
                      celda.esMesActual ? 'bg-[#161616]' : 'bg-[#121212]/70'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1.5">
                      <span
                        className={`text-xs font-extrabold ${
                          esHoy
                            ? 'bg-[#D4EE36] text-black px-1.5 py-0.5 rounded'
                            : celda.esMesActual
                            ? 'text-white'
                            : 'text-gray-600'
                        }`}
                      >
                        {celda.dia}
                      </span>

                      {eventosDia.length > 0 && (
                        <span className="bg-white/10 text-gray-300 text-[10px] font-bold px-1.5 py-0.2 rounded">
                          {eventosDia.length}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      {eventosDia.map((ev) => {
                        const estiloCard =
                          ev.clase === 'Visita'
                            ? 'bg-amber-950/75 border-amber-500/50 text-amber-200'
                            : ev.clase === 'Tarea'
                            ? 'bg-sky-950/75 border-sky-500/50 text-sky-200'
                            : 'bg-emerald-950/75 border-emerald-500/50 text-emerald-200';

                        return (
                          <div
                            key={ev.uid}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (ev.clase === 'Visita') {
                                setVisitaEditando(ev.raw);
                                setModalVisita(true);
                              } else if (ev.clase === 'Tarea') {
                                setTareaEditando(ev.raw);
                                setModalTarea(true);
                              }
                            }}
                            className={`rounded-lg border px-2 py-1 text-[10px] leading-tight ${estiloCard}`}
                          >
                            <div className="font-bold opacity-85 flex items-center justify-between gap-1">
                              <span className="truncate">
                                {ev.hora ? `${ev.hora} · ` : ''}
                                {ev.subtitulo}
                              </span>
                              {ev.alarma_activa && (
                                <Bell className="w-2.5 h-2.5 text-[#EAB308] flex-shrink-0" />
                              )}
                            </div>
                            <div className="font-extrabold text-white truncate mt-0.5">
                              {ev.titulo}
                            </div>
                            {ev.proyecto_codigo && (
                              <div className="text-[9px] opacity-75 truncate mt-0.5">
                                {ev.proyecto_codigo} · {ev.proyecto_nombre}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {pestana === 'pendientes' && (
        <div className="bg-[#181818] border border-white/10 rounded-2xl p-6 space-y-3">
          {visitasPendientesLista.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">
              No hay visitas pendientes programadas.
            </p>
          ) : (
            visitasPendientesLista.map((v) => (
              <div
                key={v.id}
                onClick={() => {
                  setVisitaEditando(v);
                  setModalVisita(true);
                }}
                className="bg-[#121212] border border-white/10 hover:border-white/25 rounded-xl p-4 flex flex-wrap justify-between items-center gap-3 cursor-pointer"
              >
                <div>
                  <div className="text-sm font-extrabold text-white flex items-center gap-2">
                    <span>{v.titulo || v.motivo}</span>
                    {v.alarma_activa && (
                      <span className="bg-[#EAB308]/15 border border-[#EAB308]/40 text-[#EAB308] px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1">
                        <Bell className="w-3 h-3" /> {formatearFechaCorta(v.alarma_fecha)}{' '}
                        {v.alarma_hora}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {formatearFechaCorta(v.fecha)} {v.horario ? `· ${v.horario} hs` : ''} ·{' '}
                    {v.proyecto_codigo || 'General'} {v.responsable ? `· ${v.responsable}` : ''}
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-amber-950/70 border border-amber-700/50 text-[#EAB308] text-xs font-bold">
                  {v.estado || 'Programada'}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {pestana === 'realizadas' && (
        <div className="bg-[#181818] border border-white/10 rounded-2xl p-6 space-y-3">
          {visitasRealizadasLista.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">
              Aún no hay visitas marcadas como realizadas.
            </p>
          ) : (
            visitasRealizadasLista.map((v) => (
              <div
                key={v.id}
                onClick={() => {
                  setVisitaEditando(v);
                  setModalVisita(true);
                }}
                className="bg-[#121212] border border-white/10 hover:border-white/25 rounded-xl p-4 flex flex-wrap justify-between items-center gap-3 cursor-pointer"
              >
                <div>
                  <div className="text-sm font-extrabold text-white">{v.titulo || v.motivo}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {formatearFechaCorta(v.fecha)} · {v.proyecto_codigo || 'General'}
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-700/50 text-emerald-400 text-xs font-bold">
                  Realizada
                </span>
              </div>
            ))
          )}
        </div>
      )}

      <ModalVisita
        abierto={modalVisita}
        onClose={() => {
          setModalVisita(false);
          setVisitaEditando(null);
          setFechaNuevaVisita('');
        }}
        onGuardado={(msg) => {
          mostrarToast(msg);
          router.refresh();
        }}
        visitaEditando={visitaEditando}
        proyectos={proyectos}
        equipo={equipo}
        fechaInicial={fechaNuevaVisita}
      />

      <ModalTarea
        abierto={modalTarea}
        onClose={() => {
          setModalTarea(false);
          setTareaEditando(null);
        }}
        onGuardado={(msg) => {
          mostrarToast(msg);
          router.refresh();
        }}
        tareaEditando={tareaEditando}
        proyectos={proyectos}
        equipo={equipo}
      />

      {/* ALARMA SONORA CONTINUA EMERGENTE */}
      {alarmaSonando &&
        montado &&
        createPortal(
          <div className="fixed top-6 right-6 bg-[#1C1C1C] border-2 border-[#EAB308] shadow-2xl rounded-2xl p-4 w-80 z-[10000] space-y-2.5 animate-pulse">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#EAB308]">
                🔔 ALARMA ACTIVA · AGENDA
              </span>
              <button
                type="button"
                onClick={() => setAlarmaSonando(null)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-sm font-extrabold text-white">
              {alarmaSonando.titulo || alarmaSonando.motivo}
            </div>
            <div className="text-xs text-gray-300">
              {alarmaSonando.proyecto_codigo ? `${alarmaSonando.proyecto_codigo} · ` : ''}
              Alarma: {formatearFechaCorta(alarmaSonando.alarma_fecha)} a las{' '}
              {alarmaSonando.alarma_hora} hs
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={async () => {
                  const item = alarmaSonando;
                  setAlarmaSonando(null);
                  await supabase
                    .from('visitas')
                    .update({ alarma_activa: false })
                    .eq('id', item.id);
                  setVisitas((prev) =>
                    prev.map((v) => (v.id === item.id ? { ...v, alarma_activa: false } : v))
                  );
                }}
                className="w-full py-2 rounded-xl bg-[#EAB308] hover:bg-[#CA9A04] text-black text-xs font-extrabold cursor-pointer"
              >
                Detener alarma
              </button>
            </div>
          </div>,
          document.body
        )}

      {toast &&
        montado &&
        createPortal(
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#161616] border border-gray-700/80 shadow-2xl rounded-xl px-5 py-3.5 flex items-center gap-3 z-[9999]">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-semibold text-white">{toast}</span>
          </div>,
          document.body
        )}
    </div>
  );
}