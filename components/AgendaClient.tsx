"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { moverAPapelera } from '@/lib/papelera';
import ModalTarea from '@/components/ModalTarea';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Upload,
  Download,
  Lock,
  X,
  ArrowRight,
  Trash2,
  Bell,
  CheckCircle2,
  ChevronDown,
  Plus,
} from 'lucide-react';

type FiltroAgenda = 'Todo' | 'Visitas' | 'Tareas' | 'Proyectos';
type VistaAgenda = 'Semana' | 'Mes' | 'Agenda';

const CATEGORIAS_VISITA = [
  'Visita de obra',
  'Reunión con cliente',
  'Coordinación de gremios',
  'Relevamiento técnico',
  'Entrega de documentación',
];

const ESTADOS_VISITA = ['Programada', 'Realizada', 'Cancelada'];

const INTEGRANTES = [
  'Alejandro Fego',
  'Arq. Joana Cuevas',
  'Lautaro Godoy',
  'Equipo MB',
];

const DIAS_SEMANA = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

export default function AgendaClient({
  visitasIniciales = [],
  proyectos = [],
}: {
  visitasIniciales: any[];
  proyectos: any[];
}) {
  const router = useRouter();

  // Controles superiores
  const [filtro, setFiltro] = useState<FiltroAgenda>('Todo');
  const [vista, setVista] = useState<VistaAgenda>('Mes');
  const [fechaCursor, setFechaCursor] = useState<Date>(() => new Date());

  // Modales de Visita y Tarea
  const [visitaResumen, setVisitaResumen] = useState<any | null>(null);
  const [visitaEditando, setVisitaEditando] = useState<any | null>(null);
  const [modalNuevaVisita, setModalNuevaVisita] = useState(false);
  const [modalNuevaTarea, setModalNuevaTarea] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Campos del modal Nueva Visita
  const [nuevaProyectoCodigo, setNuevaProyectoCodigo] = useState(proyectos[0]?.codigo || '');
  const [nuevaCategoria, setNuevaCategoria] = useState('Visita de obra');
  const [nuevaResponsable, setNuevaResponsable] = useState('Alejandro Fego');
  const [nuevaTitulo, setNuevaTitulo] = useState('');
  const [nuevaFecha, setNuevaFecha] = useState(() => new Date().toISOString().split('T')[0]);
  const [nuevaHorario, setNuevaHorario] = useState('10:00');
  const [nuevaEstado, setNuevaEstado] = useState('Programada');
  const [nuevaActa, setNuevaActa] = useState('');
  const [nuevaAlarmaActiva, setNuevaAlarmaActiva] = useState(false);
  const [nuevaAlarmaFecha, setNuevaAlarmaFecha] = useState(() => new Date().toISOString().split('T')[0]);
  const [nuevaAlarmaHorario, setNuevaAlarmaHorario] = useState('09:00');

  // Campos del modal Editar Visita
  const [editCategoria, setEditCategoria] = useState('Visita de obra');
  const [editResponsable, setEditResponsable] = useState('Alejandro Fego');
  const [editTitulo, setEditTitulo] = useState('');
  const [editFecha, setEditFecha] = useState('');
  const [editHorario, setEditHorario] = useState('10:00');
  const [editEstado, setEditEstado] = useState('Programada');
  const [editActa, setEditActa] = useState('');
  const [editAlarmaActiva, setEditAlarmaActiva] = useState(false);
  const [editAlarmaFecha, setEditAlarmaFecha] = useState('');
  const [editAlarmaHorario, setEditAlarmaHorario] = useState('09:00');

  const mostrarToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const formatearFecha = (fechaStr: string | null) => {
    if (!fechaStr) return '—';
    const partes = fechaStr.split('-');
    if (partes.length !== 3) return fechaStr;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  };

  const aClaveFecha = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const hoyClave = aClaveFecha(new Date());

  // Abrir automáticamente una visita si viene desde el recordatorio (?visitaId=...)
  useEffect(() => {
    const abrirPorId = (idBuscado: string | number | null) => {
      if (!idBuscado) return;
      const encontrada = visitasIniciales.find((v) => String(v.id) === String(idBuscado));
      if (encontrada) {
        if (encontrada.fecha) {
          const [y, m, d] = encontrada.fecha.split('-').map(Number);
          if (y && m && d) setFechaCursor(new Date(y, m - 1, d));
        }
        setVista('Mes');
        setVisitaResumen(encontrada);
        window.history.replaceState({}, '', '/agenda');
      }
    };

    const params = new URLSearchParams(window.location.search);
    abrirPorId(params.get('visitaId'));

    const onAbrirEvento = (e: Event) => {
      const custom = e as CustomEvent;
      abrirPorId(custom.detail);
    };

    window.addEventListener('abrir-visita-agenda', onAbrirEvento);
    return () => window.removeEventListener('abrir-visita-agenda', onAbrirEvento);
  }, [visitasIniciales]);

  // Navegación de fechas
  const irAnterior = () => {
    const nueva = new Date(fechaCursor);
    if (vista === 'Semana') {
      nueva.setDate(nueva.getDate() - 7);
    } else {
      nueva.setMonth(nueva.getMonth() - 1);
    }
    setFechaCursor(nueva);
  };

  const irSiguiente = () => {
    const nueva = new Date(fechaCursor);
    if (vista === 'Semana') {
      nueva.setDate(nueva.getDate() + 7);
    } else {
      nueva.setMonth(nueva.getMonth() + 1);
    }
    setFechaCursor(nueva);
  };

  const irHoy = () => setFechaCursor(new Date());

  const tituloMesAnio = useMemo(() => {
    const texto = fechaCursor.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    return texto.charAt(0).toUpperCase() + texto.slice(1).replace(' de ', ' ');
  }, [fechaCursor]);

  // Celdas del Mes (Lunes a Domingo)
  const celdasMes = useMemo(() => {
    const anio = fechaCursor.getFullYear();
    const mes = fechaCursor.getMonth();
    const primeroMes = new Date(anio, mes, 1);
    const diaSemana = (primeroMes.getDay() + 6) % 7;
    const inicioGrilla = new Date(anio, mes, 1 - diaSemana);

    const celdas = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(inicioGrilla);
      d.setDate(inicioGrilla.getDate() + i);
      celdas.push({
        fecha: d,
        clave: aClaveFecha(d),
        esMesActual: d.getMonth() === mes,
        esHoy: aClaveFecha(d) === hoyClave,
      });
    }
    return celdas;
  }, [fechaCursor, hoyClave]);

  // Celdas de la Semana actual del cursor
  const celdasSemana = useMemo(() => {
    const diaSemana = (fechaCursor.getDay() + 6) % 7;
    const lunes = new Date(fechaCursor);
    lunes.setDate(fechaCursor.getDate() - diaSemana);
    const dias = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(lunes);
      d.setDate(lunes.getDate() + i);
      dias.push({
        fecha: d,
        clave: aClaveFecha(d),
        esHoy: aClaveFecha(d) === hoyClave,
      });
    }
    return dias;
  }, [fechaCursor, hoyClave]);

  // Entregas de proyectos como eventos
  const entregasProyectos = useMemo(
    () => proyectos.filter((p) => Boolean(p.entrega_estimada)),
    [proyectos]
  );

  // KPIs del mes seleccionado
  const anioActual = fechaCursor.getFullYear();
  const mesActual = fechaCursor.getMonth();

  const visitasDelMes = visitasIniciales.filter((v) => {
    if (!v.fecha) return false;
    const [y, m] = v.fecha.split('-').map(Number);
    return y === anioActual && m - 1 === mesActual;
  });
  const visitasPendientes = visitasDelMes.filter((v) => v.estado === 'Programada').length;
  const visitasRealizadas = visitasDelMes.filter((v) => v.estado === 'Realizada').length;
  const pctVisitas = visitasDelMes.length > 0 ? Math.round((visitasRealizadas / visitasDelMes.length) * 100) : 0;

  const entregasDelMes = entregasProyectos.filter((p) => {
    const [y, m] = p.entrega_estimada.split('-').map(Number);
    return y === anioActual && m - 1 === mesActual;
  });
  const entregasPendientes = entregasDelMes.filter((p) => p.estado !== 'Finalizado').length;
  const entregasHechas = entregasDelMes.filter((p) => p.estado === 'Finalizado').length;

  // Abrir modal Nueva Visita
  const abrirModalNuevaVisita = () => {
    setNuevaProyectoCodigo(proyectos[0]?.codigo || '');
    setNuevaCategoria('Visita de obra');
    setNuevaResponsable('Alejandro Fego');
    setNuevaTitulo('');
    setNuevaFecha(hoyClave);
    setNuevaHorario('10:00');
    setNuevaEstado('Programada');
    setNuevaActa('');
    setNuevaAlarmaActiva(false);
    setNuevaAlarmaFecha(hoyClave);
    setNuevaAlarmaHorario('09:00');
    setModalNuevaVisita(true);
  };

  const crearNuevaVisita = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);

    const proy = proyectos.find((p) => p.codigo === nuevaProyectoCodigo);

    const { error } = await supabase.from('visitas').insert([
      {
        proyecto_codigo: proy?.codigo || nuevaProyectoCodigo || null,
        proyecto_nombre: proy?.nombre || null,
        proyecto_estado: proy?.estado || 'En Diseño',
        categoria: nuevaCategoria,
        responsable: nuevaResponsable,
        titulo: nuevaTitulo.trim(),
        fecha: nuevaFecha,
        horario: nuevaHorario,
        estado: nuevaEstado,
        acta: nuevaActa.trim() || null,
        alarma_activa: nuevaAlarmaActiva,
        alarma_fecha: nuevaAlarmaActiva ? nuevaAlarmaFecha : null,
        alarma_horario: nuevaAlarmaActiva ? nuevaAlarmaHorario : null,
      },
    ]);

    setCargando(false);

    if (!error) {
      setModalNuevaVisita(false);
      mostrarToast('Visita agendada correctamente');
      router.refresh();
    } else {
      alert('Error al agendar visita: ' + error.message);
    }
  };

  // Abrir modal Editar Visita desde "Más info de la visita ->"
  const abrirEdicionVisita = (v: any) => {
    setVisitaResumen(null);
    setVisitaEditando(v);
    setEditCategoria(v.categoria || 'Visita de obra');
    setEditResponsable(v.responsable || 'Alejandro Fego');
    setEditTitulo(v.titulo || '');
    setEditFecha(v.fecha || hoyClave);
    setEditHorario(v.horario || '10:00');
    setEditEstado(v.estado || 'Programada');
    setEditActa(v.acta || '');
    setEditAlarmaActiva(Boolean(v.alarma_activa));
    setEditAlarmaFecha(v.alarma_fecha || v.fecha || hoyClave);
    setEditAlarmaHorario(v.alarma_horario || '09:00');
  };

  const guardarCambiosVisita = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitaEditando) return;
    setCargando(true);

    const { error } = await supabase
      .from('visitas')
      .update({
        categoria: editCategoria,
        responsable: editResponsable,
        titulo: editTitulo.trim(),
        fecha: editFecha,
        horario: editHorario,
        estado: editEstado,
        acta: editActa.trim() || null,
        alarma_activa: editAlarmaActiva,
        alarma_fecha: editAlarmaActiva ? editAlarmaFecha : null,
        alarma_horario: editAlarmaActiva ? editAlarmaHorario : null,
      })
      .eq('id', visitaEditando.id);

    setCargando(false);

    if (!error) {
      setVisitaEditando(null);
      mostrarToast('Cambios guardados en la visita');
      router.refresh();
    } else {
      alert('Error al guardar cambios: ' + error.message);
    }
  };

  const eliminarVisita = async () => {
    if (!visitaEditando) return;
    setCargando(true);
    try {
      await moverAPapelera({
        tabla: 'visitas',
        modulo: 'Visitas y Agenda',
        titulo: visitaEditando.titulo || 'Visita sin título',
        subtitulo: `${visitaEditando.fecha || ''} ${visitaEditando.horario || ''}`.trim(),
        registro: visitaEditando,
      });
      setVisitaEditando(null);
      mostrarToast('Visita enviada a papelera');
      router.refresh();
    } catch (error: any) {
      alert('Error al mover visita a papelera: ' + error.message);
    } finally {
      setCargando(false);
    }
  };

  // Helper para obtener los eventos de un día según filtro activo
  const eventosDelDia = (clave: string) => {
    const items: { tipo: 'visita' | 'proyecto'; data: any }[] = [];

    if (filtro === 'Todo' || filtro === 'Visitas') {
      visitasIniciales
        .filter((v) => v.fecha === clave)
        .forEach((v) => items.push({ tipo: 'visita', data: v }));
    }

    if (filtro === 'Todo' || filtro === 'Proyectos') {
      entregasProyectos
        .filter((p) => p.entrega_estimada === clave)
        .forEach((p) => items.push({ tipo: 'proyecto', data: p }));
    }

    return items;
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white p-8 font-sans">
      {/* ENCABEZADO PRINCIPAL + BOTONES DE CREACIÓN */}
      <div className="flex flex-wrap justify-between items-start gap-4 mb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Visitas y Agenda
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Visitas de obra, reuniones con clientes, coordinación de proveedores y calendario unificado
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={abrirModalNuevaVisita}
            className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors shadow-[0_0_20px_rgba(234,179,8,0.2)] cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" /> Agendar visita
          </button>

          <button
            type="button"
            onClick={() => setModalNuevaTarea(true)}
            className="bg-[#1A1A1A] hover:bg-gray-800 border border-gray-800 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" /> Nueva tarea
          </button>
        </div>
      </div>

      {/* ACCIONES SUPERIORES DERECHA */}
      <div className="flex justify-end items-center gap-2.5 mb-5">
        <button
          type="button"
          onClick={abrirModalNuevaVisita}
          className="bg-[#181818] hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-2 cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5" /> Importar
        </button>
        <button
          type="button"
          className="bg-[#181818] hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-2 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" /> Exportar
        </button>
        <div className="w-px h-5 bg-gray-800 mx-1" />
        <button
          type="button"
          className="bg-[#181818] hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-2 cursor-pointer"
        >
          <Lock className="w-3.5 h-3.5" /> Restringir vista
        </button>
      </div>

      {/* CONTENEDOR PRINCIPAL DEL CALENDARIO */}
      <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-6 shadow-xl">
        {/* Cabecera y botones funcionales */}
        <div className="flex flex-wrap justify-between items-center gap-4 pb-5 border-b border-gray-800/80 mb-5">
          <h2 className="text-base font-bold text-white flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-[#EAB308]" />
            Calendario y Agenda General
          </h2>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filtro de tipo */}
            <div className="inline-flex bg-[#121212] border border-gray-800 rounded-xl p-1 gap-1">
              {(['Todo', 'Visitas', 'Tareas', 'Proyectos'] as FiltroAgenda[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFiltro(f)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    filtro === f
                      ? 'bg-[#EAB308] text-black font-bold shadow'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Selector de vista */}
            <div className="inline-flex bg-[#121212] border border-gray-800 rounded-xl p-1 gap-1">
              {(['Semana', 'Mes', 'Agenda'] as VistaAgenda[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setVista(v)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    vista === v
                      ? 'bg-[#EAB308] text-black font-bold shadow'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>

            {/* Navegación de fecha */}
            <div className="inline-flex items-center gap-3 bg-[#121212] border border-gray-800 rounded-xl px-3.5 py-1.5 text-xs">
              <button onClick={irAnterior} className="text-gray-400 hover:text-white cursor-pointer" title="Anterior">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={irHoy} className="text-[#EAB308] hover:text-[#CA9A04] font-bold cursor-pointer">
                Hoy
              </button>
              <span className="font-bold text-white min-w-[115px] text-center">{tituloMesAnio}</span>
              <button onClick={irSiguiente} className="text-gray-400 hover:text-white cursor-pointer" title="Siguiente">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 4 TARJETAS KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <div className="bg-[#121212] border border-gray-800 rounded-xl p-4">
            <div className="text-xs text-gray-400 mb-2">Visitas del mes</div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-2xl font-extrabold text-white">{visitasPendientes}</span>
              <span className="text-xs text-gray-400">pendientes</span>
            </div>
            <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden mb-2">
              <div className="h-full bg-[#EAB308]" style={{ width: `${pctVisitas}%` }} />
            </div>
            <div className="text-[11px] text-gray-500">
              {visitasRealizadas} realizadas de {visitasDelMes.length}
            </div>
          </div>

          <div className="bg-[#121212] border border-gray-800 rounded-xl p-4">
            <div className="text-xs text-gray-400 mb-2">Tareas del mes</div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-2xl font-extrabold text-white">0</span>
              <span className="text-xs text-gray-400">pendientes</span>
            </div>
            <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden mb-2">
              <div className="h-full bg-gray-500" style={{ width: '0%' }} />
            </div>
            <div className="text-[11px] text-gray-500">0 completadas de 0</div>
          </div>

          <div className="bg-[#121212] border border-gray-800 rounded-xl p-4">
            <div className="text-xs text-gray-400 mb-2">Entregas de proyecto</div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-2xl font-extrabold text-white">{entregasPendientes}</span>
              <span className="text-xs text-gray-400">pendientes</span>
            </div>
            <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden mb-2">
              <div className="h-full bg-white" style={{ width: entregasDelMes.length ? `${Math.round((entregasHechas / entregasDelMes.length) * 100)}%` : '0%' }} />
            </div>
            <div className="text-[11px] text-gray-500">
              {entregasHechas} entregadas de {entregasDelMes.length}
            </div>
          </div>

          <div className="bg-[#121212] border border-gray-800 rounded-xl p-4">
            <div className="text-xs text-gray-400 mb-2">Tareas atrasadas</div>
            <div className="text-2xl font-extrabold text-rose-500 mb-3">0</div>
            <div className="text-[11px] text-gray-500">Vencidas y sin completar</div>
          </div>
        </div>

        {/* REFERENCIAS */}
        <div className="flex flex-wrap items-center gap-5 text-[11px] text-gray-400 mb-4">
          <span className="uppercase tracking-wider font-semibold text-gray-500">REFERENCIA</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#EAB308]/80" /> Visita
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-gray-600" /> Tarea
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-white" /> Entrega de proyecto
          </span>
          <span className="text-sky-400">✓ Hecha</span>
          <span className="text-gray-400">○ Pendiente</span>
        </div>

        {/* VISTA MES */}
        {vista === 'Mes' && (
          <div>
            <div className="grid grid-cols-7 gap-2 mb-2">
              {DIAS_SEMANA.map((d) => (
                <div key={d} className="text-[11px] font-bold text-gray-400 px-2">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {celdasMes.map((celda) => {
                const eventos = eventosDelDia(celda.clave);
                return (
                  <div
                    key={celda.clave}
                    className={`min-h-[104px] rounded-xl p-2 border transition-colors ${
                      celda.esHoy
                        ? 'bg-[#161510] border-[#EAB308]'
                        : celda.esMesActual
                        ? 'bg-[#121212] border-gray-800/80'
                        : 'bg-[#0F0F0F] border-gray-900 opacity-45'
                    }`}
                  >
                    <div className={`text-xs font-bold mb-1.5 ${celda.esHoy ? 'text-[#EAB308]' : 'text-gray-400'}`}>
                      {celda.fecha.getDate()}
                    </div>

                    <div className="space-y-1">
                      {eventos.map((ev, idx) =>
                        ev.tipo === 'visita' ? (
                          <button
                            key={`v-${ev.data.id}-${idx}`}
                            onClick={() => setVisitaResumen(ev.data)}
                            className="w-full text-left bg-[#EAB308]/20 hover:bg-[#EAB308]/30 border border-[#EAB308]/40 text-[#FDE047] px-2 py-1 rounded-md text-[11px] font-semibold truncate block transition-colors cursor-pointer"
                            title={`${ev.data.horario} ${ev.data.titulo}`}
                          >
                            {ev.data.estado === 'Realizada' ? '✓ ' : ''}{ev.data.horario} {ev.data.titulo}
                          </button>
                        ) : (
                          <Link
                            key={`p-${ev.data.id}-${idx}`}
                            href={`/proyectos/${ev.data.codigo}`}
                            className="w-full text-left bg-white/10 hover:bg-white/20 border border-white/20 text-white px-2 py-1 rounded-md text-[11px] font-semibold truncate block transition-colors"
                          >
                            Entrega: {ev.data.nombre}
                          </Link>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VISTA SEMANA */}
        {vista === 'Semana' && (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {celdasSemana.map((celda, i) => {
              const eventos = eventosDelDia(celda.clave);
              return (
                <div
                  key={celda.clave}
                  className={`min-h-[320px] rounded-xl p-3 border ${
                    celda.esHoy ? 'bg-[#161510] border-[#EAB308]' : 'bg-[#121212] border-gray-800'
                  }`}
                >
                  <div className="flex justify-between items-center pb-2 mb-3 border-b border-gray-800">
                    <span className="text-[11px] font-bold text-gray-400">{DIAS_SEMANA[i]}</span>
                    <span className={`text-sm font-extrabold ${celda.esHoy ? 'text-[#EAB308]' : 'text-white'}`}>
                      {celda.fecha.getDate()}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {eventos.length === 0 ? (
                      <div className="text-[11px] text-gray-600 text-center py-6">Sin eventos</div>
                    ) : (
                      eventos.map((ev, idx) =>
                        ev.tipo === 'visita' ? (
                          <button
                            key={`sv-${ev.data.id}-${idx}`}
                            onClick={() => setVisitaResumen(ev.data)}
                            className="w-full text-left bg-[#EAB308]/20 hover:bg-[#EAB308]/30 border border-[#EAB308]/40 rounded-lg p-2 transition-colors cursor-pointer"
                          >
                            <div className="text-[10px] font-bold text-[#EAB308]">{ev.data.horario} hs</div>
                            <div className="text-xs font-bold text-white truncate">{ev.data.titulo}</div>
                            <div className="text-[10px] text-gray-300 truncate mt-0.5">{ev.data.proyecto_nombre}</div>
                          </button>
                        ) : (
                          <Link
                            key={`sp-${ev.data.id}-${idx}`}
                            href={`/proyectos/${ev.data.codigo}`}
                            className="block bg-white/10 border border-white/20 rounded-lg p-2 text-xs font-bold text-white"
                          >
                            Entrega: {ev.data.nombre}
                          </Link>
                        )
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* VISTA AGENDA */}
        {vista === 'Agenda' && (
          <div className="space-y-3">
            {visitasIniciales.length === 0 ? (
              <div className="bg-[#121212] border border-gray-800 rounded-xl p-10 text-center text-xs text-gray-400">
                No hay visitas ni eventos agendados todavía.
              </div>
            ) : (
              visitasIniciales.map((v) => (
                <div
                  key={v.id}
                  onClick={() => setVisitaResumen(v)}
                  className="bg-[#121212] border border-gray-800 hover:border-[#EAB308]/60 rounded-xl p-4 flex flex-wrap justify-between items-center gap-4 cursor-pointer transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-bold text-[#EAB308]">{formatearFecha(v.fecha)} · {v.horario} hs</span>
                      <span className="text-sm font-bold text-white">{v.titulo}</span>
                      {v.alarma_activa && <Bell className="w-3.5 h-3.5 text-[#EAB308]" />}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {v.proyecto_codigo} · {v.proyecto_nombre} · {v.responsable}
                    </div>
                  </div>
                  <span className="bg-cyan-950/60 border border-cyan-800/60 text-cyan-400 px-3 py-1 rounded-full text-xs font-semibold">
                    {v.estado}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* MODAL: AGENDAR NUEVA VISITA */}
      {modalNuevaVisita && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 pt-6 pb-4 flex justify-between items-start border-b border-gray-800/80">
              <div>
                <h2 className="text-lg font-bold text-white">Agendar Nueva Visita / Reunión</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Inspección de obra, reunión con cliente o coordinación de gremios
                </p>
              </div>
              <button onClick={() => setModalNuevaVisita(false)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={crearNuevaVisita} className="px-6 py-5 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Corresponde al Proyecto / Obra</label>
                <select
                  value={nuevaProyectoCodigo}
                  onChange={(e) => setNuevaProyectoCodigo(e.target.value)}
                  className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white"
                >
                  <option value="">General (Sin proyecto específico)</option>
                  {proyectos.map((p) => (
                    <option key={p.codigo} value={p.codigo}>
                      {p.codigo} · {p.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Categoría</label>
                  <select value={nuevaCategoria} onChange={(e) => setNuevaCategoria(e.target.value)} className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white">
                    {CATEGORIAS_VISITA.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Responsable / Participante</label>
                  <select value={nuevaResponsable} onChange={(e) => setNuevaResponsable(e.target.value)} className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white">
                    {INTEGRANTES.map((i) => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Motivo / Título de Visita *</label>
                <input
                  type="text"
                  required
                  value={nuevaTitulo}
                  onChange={(e) => setNuevaTitulo(e.target.value)}
                  placeholder="Ej. Visita de obra - Replanteo"
                  className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Fecha *</label>
                  <input type="date" required value={nuevaFecha} onChange={(e) => setNuevaFecha(e.target.value)} className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white [color-scheme:dark]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Horario</label>
                  <input type="time" value={nuevaHorario} onChange={(e) => setNuevaHorario(e.target.value)} className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white [color-scheme:dark]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Estado</label>
                  <select value={nuevaEstado} onChange={(e) => setNuevaEstado(e.target.value)} className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white">
                    {ESTADOS_VISITA.map((est) => <option key={est} value={est}>{est}</option>)}
                  </select>
                </div>
              </div>

              <div className="bg-[#151515] border border-gray-800 rounded-xl p-4 space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <Bell className={`w-4 h-4 ${nuevaAlarmaActiva ? 'text-[#EAB308]' : 'text-gray-400'}`} />
                    <div>
                      <div className="text-xs font-bold text-white">Alarma / Recordatorio</div>
                      <div className="text-[11px] text-gray-400">Seleccioná fecha y horario para recibir aviso</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={nuevaAlarmaActiva}
                    onChange={(e) => setNuevaAlarmaActiva(e.target.checked)}
                    className="w-4 h-4 accent-[#EAB308] cursor-pointer"
                  />
                </label>

                {nuevaAlarmaActiva && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-800/80">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">Fecha de la alarma</label>
                      <input type="date" required value={nuevaAlarmaFecha} onChange={(e) => setNuevaAlarmaFecha(e.target.value)} className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2 text-sm text-white [color-scheme:dark]" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">Horario de la alarma</label>
                      <input type="time" required value={nuevaAlarmaHorario} onChange={(e) => setNuevaAlarmaHorario(e.target.value)} className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2 text-sm text-white [color-scheme:dark]" />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Notas / Temario previo</label>
                <textarea rows={2} value={nuevaActa} onChange={(e) => setNuevaActa(e.target.value)} placeholder="Puntos a revisar en la visita..." className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 resize-none" />
              </div>

              <div className="flex justify-end items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalNuevaVisita(false)}
                  className="text-gray-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cargando}
                  className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-5 py-2.5 rounded-lg font-bold text-sm cursor-pointer disabled:opacity-50"
                >
                  {cargando ? 'Agendando...' : 'Agendar Visita'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NUEVA TAREA */}
      <ModalTarea
        abierto={modalNuevaTarea}
        onClose={() => setModalNuevaTarea(false)}
        onGuardado={(msg) => {
          mostrarToast(msg);
          router.refresh();
        }}
        proyectos={proyectos}
      />

      {/* MODAL 1: RESUMEN DE LA VISITA */}
      {visitaResumen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-[#161922] border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex justify-between items-start mb-5">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">VISITA</div>
                <h2 className="text-xl font-extrabold text-white mt-0.5">{visitaResumen.titulo}</h2>
              </div>
              <button
                onClick={() => setVisitaResumen(null)}
                className="w-8 h-8 rounded-lg bg-[#1F2430] hover:bg-gray-700 text-gray-300 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="divide-y divide-gray-800/80 text-sm mb-6">
              <div className="py-3 flex justify-between gap-4">
                <span className="text-gray-400 text-xs">Fecha</span>
                <span className="text-white font-semibold text-xs">
                  {formatearFecha(visitaResumen.fecha)} · {visitaResumen.horario} hs
                </span>
              </div>
              <div className="py-3 flex justify-between gap-4">
                <span className="text-gray-400 text-xs">Tipo</span>
                <span className="text-white font-semibold text-xs">{visitaResumen.categoria}</span>
              </div>
              <div className="py-3 flex justify-between gap-4">
                <span className="text-gray-400 text-xs">Estado</span>
                <span className="text-white font-semibold text-xs">{visitaResumen.estado}</span>
              </div>
              <div className="py-3 flex justify-between gap-4">
                <span className="text-gray-400 text-xs">Proyecto</span>
                <span className="text-white font-semibold text-xs">
                  {visitaResumen.proyecto_codigo} · {visitaResumen.proyecto_nombre}
                </span>
              </div>
              <div className="py-3 flex justify-between gap-4">
                <span className="text-gray-400 text-xs">Participantes</span>
                <span className="text-white font-semibold text-xs">{visitaResumen.responsable}</span>
              </div>
              {visitaResumen.alarma_activa && (
                <div className="py-3 flex justify-between gap-4">
                  <span className="text-gray-400 text-xs flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-[#EAB308]" /> Alarma
                  </span>
                  <span className="text-[#EAB308] font-semibold text-xs">
                    {formatearFecha(visitaResumen.alarma_fecha)} · {visitaResumen.alarma_horario} hs
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-end items-center gap-3">
              {visitaResumen.proyecto_codigo && (
                <Link
                  href={`/proyectos/${visitaResumen.proyecto_codigo}`}
                  className="bg-[#1F2430] hover:bg-gray-700 border border-gray-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors"
                >
                  Ver proyecto
                </Link>
              )}
              <button
                onClick={() => abrirEdicionVisita(visitaResumen)}
                className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                Más info de la visita <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EDITAR VISITA / REUNIÓN */}
      {visitaEditando && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 pt-6 pb-4 flex justify-between items-start">
              <div>
                <h2 className="text-lg font-bold text-white">Editar Visita / Reunión</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Inspección de obra, reunión con cliente, coordinación de gremios y acta
                </p>
              </div>
              <button onClick={() => setVisitaEditando(null)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={guardarCambiosVisita} className="px-6 pb-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Corresponde al Proyecto / Obra *</label>
                <div className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="border border-[#EAB308]/50 bg-[#EAB308]/10 text-[#EAB308] px-2 py-0.5 rounded text-xs font-bold">
                      {visitaEditando.proyecto_codigo}
                    </span>
                    <span className="text-sm font-bold text-white">{visitaEditando.proyecto_nombre}</span>
                    <span className="bg-cyan-950/60 border border-cyan-800/60 text-cyan-400 px-2.5 py-0.5 rounded-full text-[11px] font-medium">
                      {visitaEditando.proyecto_estado || 'En Diseño'}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Categoría</label>
                  <select value={editCategoria} onChange={(e) => setEditCategoria(e.target.value)} className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white">
                    {CATEGORIAS_VISITA.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Responsable / Participante</label>
                  <select value={editResponsable} onChange={(e) => setEditResponsable(e.target.value)} className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white">
                    {INTEGRANTES.map((i) => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Motivo / Título de Visita *</label>
                <input type="text" required value={editTitulo} onChange={(e) => setEditTitulo(e.target.value)} className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Fecha *</label>
                  <input type="date" required value={editFecha} onChange={(e) => setEditFecha(e.target.value)} className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white [color-scheme:dark]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Horario</label>
                  <input type="time" value={editHorario} onChange={(e) => setEditHorario(e.target.value)} className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white [color-scheme:dark]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Estado</label>
                  <select value={editEstado} onChange={(e) => setEditEstado(e.target.value)} className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white">
                    {ESTADOS_VISITA.map((est) => <option key={est} value={est}>{est}</option>)}
                  </select>
                </div>
              </div>

              {/* Alarma / Recordatorio */}
              <div className="bg-[#151515] border border-gray-800 rounded-xl p-4 space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <Bell className={`w-4 h-4 ${editAlarmaActiva ? 'text-[#EAB308]' : 'text-gray-400'}`} />
                    <div>
                      <div className="text-xs font-bold text-white">Alarma / Recordatorio</div>
                      <div className="text-[11px] text-gray-400">Seleccioná fecha y horario para recibir aviso</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={editAlarmaActiva}
                    onChange={(e) => setEditAlarmaActiva(e.target.checked)}
                    className="w-4 h-4 accent-[#EAB308] cursor-pointer"
                  />
                </label>

                {editAlarmaActiva && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-800/80">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">Fecha de la alarma</label>
                      <input type="date" required value={editAlarmaFecha} onChange={(e) => setEditAlarmaFecha(e.target.value)} className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2 text-sm text-white [color-scheme:dark]" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">Horario de la alarma</label>
                      <input type="time" required value={editAlarmaHorario} onChange={(e) => setEditAlarmaHorario(e.target.value)} className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2 text-sm text-white [color-scheme:dark]" />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Acta de Visita / Acuerdos de Obra</label>
                <textarea rows={3} value={editActa} onChange={(e) => setEditActa(e.target.value)} placeholder="Minuta técnica o acuerdos convenidos..." className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 resize-none" />
              </div>

              <div className="flex justify-between items-center pt-3">
                <button
                  type="button"
                  onClick={eliminarVisita}
                  disabled={cargando}
                  className="border border-transparent hover:border-red-500/40 hover:bg-red-500/15 text-red-500 hover:text-red-400 px-4 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" /> Enviar a papelera
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setVisitaEditando(null)}
                    className="border border-transparent hover:border-gray-500/40 hover:bg-gray-500/15 text-gray-300 hover:text-white px-4 py-2.5 rounded-lg font-medium text-sm cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={cargando}
                    className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-5 py-2.5 rounded-lg font-bold text-sm cursor-pointer disabled:opacity-50"
                  >
                    {cargando ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#161616] border border-gray-700/80 shadow-2xl rounded-xl px-5 py-3.5 flex items-center gap-3 z-50">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-semibold text-white">{toast}</span>
        </div>
      )}
    </div>
  );
}