"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ModalTarea from '@/components/ModalTarea';
import {
  Plus,
  Search,
  Upload,
  Download,
  Lock,
  List,
  Columns,
  Calendar,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Check,
  CheckCircle2,
  Folder,
  Tag,
  RefreshCw,
} from 'lucide-react';

const COLUMNAS_KANBAN = [
  { id: 'Por Realizar', label: 'POR REALIZAR', dot: 'bg-cyan-400', badge: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/50' },
  { id: 'En Curso', label: 'EN CURSO', dot: 'bg-[#EAB308]', badge: 'text-[#EAB308] border-[#EAB308]/40 bg-amber-950/50' },
  { id: 'En Revisión', label: 'EN REVISIÓN', dot: 'bg-purple-400', badge: 'text-purple-400 border-purple-500/40 bg-purple-950/50' },
  { id: 'Finalizado', label: 'COMPLETADAS', dot: 'bg-emerald-400', badge: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/50' },
];

export default function TareasClient({
  tareasIniciales = [],
  proyectos = [],
  equipo = [],
  proyectoFijoCodigo = '',
  compacto = false,
}: {
  tareasIniciales: any[];
  proyectos?: any[];
  equipo?: any[];
  proyectoFijoCodigo?: string;
  compacto?: boolean;
}) {
  const router = useRouter();

  const [vista, setVista] = useState<'lista' | 'kanban' | 'cronograma'>('lista');

  const [filtroPill, setFiltroPill] = useState<
    'pendientes' | 'por_realizar' | 'en_curso' | 'atrasadas' | 'completadas'
  >('pendientes');
  const [busqueda, setBusqueda] = useState('');
  const [filtroProyecto, setFiltroProyecto] = useState(proyectoFijoCodigo || 'Todos');
  const [filtroResponsable, setFiltroResponsable] = useState('Todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState('Todos');
  const [vistaRestringida, setVistaRestringida] = useState(false);

  const [pagina, setPagina] = useState(1);
  const [filasPorPagina, setFilasPorPagina] = useState(10);

  const [escalaCrono, setEscalaCrono] = useState<'Semana' | 'Mes' | 'Trimestre' | 'Semestre' | 'Año'>('Semestre');
  const [offsetMeses, setOffsetMeses] = useState(0);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [tareaEditando, setTareaEditando] = useState<any | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const mostrarToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const formatearFechaCorta = (iso: string) => {
    if (!iso) return '—';
    const [y, m, d] = String(iso).split('T')[0].split('-');
    if (!y || !m || !d) return iso;
    return `${d}/${m}/${y}`;
  };

  const normalizarEstado = (est: string) => {
    const e = String(est || '').toLowerCase().trim();
    if (e === 'finalizado' || e === 'completada' || e === 'completadas') return 'Finalizado';
    if (e === 'en curso') return 'En Curso';
    if (e === 'en revisión' || e === 'en revision') return 'En Revisión';
    return 'Por Realizar';
  };

  const esAtrasada = (t: any) => {
    const est = normalizarEstado(t.estado);
    if (est === 'Finalizado') return false;
    const hoyIso = new Date().toISOString().split('T')[0];
    return Boolean(t.fecha_vencimiento && String(t.fecha_vencimiento).split('T')[0] < hoyIso);
  };

  const cambiarEstadoTarea = async (tareaId: number, nuevoEstado: string) => {
    await supabase.from('tareas').update({ estado: nuevoEstado }).eq('id', tareaId);
    mostrarToast(`Tarea movida a ${nuevoEstado}`);
    router.refresh();
  };

  const moverTareaKanban = async (t: any, direccion: -1 | 1) => {
    const actual = normalizarEstado(t.estado);
    const idx = COLUMNAS_KANBAN.findIndex((c) => c.id === actual);
    const nuevoIdx = idx + direccion;
    if (nuevoIdx < 0 || nuevoIdx >= COLUMNAS_KANBAN.length) return;
    await cambiarEstadoTarea(t.id, COLUMNAS_KANBAN[nuevoIdx].id);
  };

  const toggleCompletar = async (t: any) => {
    const actual = normalizarEstado(t.estado);
    const nuevo = actual === 'Finalizado' ? 'Por Realizar' : 'Finalizado';
    await cambiarEstadoTarea(t.id, nuevo);
  };

  const tareasBase = useMemo(() => {
    if (!proyectoFijoCodigo) return tareasIniciales;
    return tareasIniciales.filter((t) => t.proyecto_codigo === proyectoFijoCodigo);
  }, [tareasIniciales, proyectoFijoCodigo]);

  const stats = useMemo(() => {
    let pendientes = 0;
    let porRealizar = 0;
    let enCurso = 0;
    let atrasadas = 0;
    let completadas = 0;

    for (const t of tareasBase) {
      const est = normalizarEstado(t.estado);
      if (est === 'Finalizado') {
        completadas++;
      } else {
        pendientes++;
        if (est === 'En Curso') enCurso++;
        else if (est === 'Por Realizar') porRealizar++;
        if (esAtrasada(t)) atrasadas++;
      }
    }
    return { pendientes, porRealizar, enCurso, atrasadas, completadas };
  }, [tareasBase]);

  const tareasFiltradas = useMemo(() => {
    const hoy = new Date();
    const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
    const anioActual = String(hoy.getFullYear());

    return tareasBase.filter((t) => {
      const est = normalizarEstado(t.estado);

      if (vista !== 'kanban') {
        if (filtroPill === 'pendientes' && est === 'Finalizado') return false;
        if (filtroPill === 'por_realizar' && est !== 'Por Realizar') return false;
        if (filtroPill === 'en_curso' && est !== 'En Curso') return false;
        if (filtroPill === 'atrasadas' && !esAtrasada(t)) return false;
        if (filtroPill === 'completadas' && est !== 'Finalizado') return false;
      } else {
        if (filtroPill === 'por_realizar' && est !== 'Por Realizar') return false;
        if (filtroPill === 'en_curso' && est !== 'En Curso') return false;
        if (filtroPill === 'atrasadas' && !esAtrasada(t)) return false;
        if (filtroPill === 'completadas' && est !== 'Finalizado') return false;
      }

      const q = busqueda.toLowerCase().trim();
      const coincideBusq =
        !q ||
        (t.titulo || '').toLowerCase().includes(q) ||
        (t.proyecto_codigo || '').toLowerCase().includes(q) ||
        (t.proyecto_nombre || '').toLowerCase().includes(q) ||
        (t.responsable || '').toLowerCase().includes(q) ||
        (t.rubro || '').toLowerCase().includes(q) ||
        (t.descripcion || '').toLowerCase().includes(q);

      const proyectoActivo = proyectoFijoCodigo || filtroProyecto;
      const coincideProy =
        proyectoActivo === 'Todos' || t.proyecto_codigo === proyectoActivo;

      const coincideResp =
        filtroResponsable === 'Todos' || t.responsable === filtroResponsable;

      let coincidePeriodo = true;
      const fechaRef = t.fecha_vencimiento || t.fecha_inicio || '';
      if (filtroPeriodo === 'Este mes' && fechaRef) {
        coincidePeriodo = String(fechaRef).startsWith(mesActual);
      } else if (filtroPeriodo === 'Este año' && fechaRef) {
        coincidePeriodo = String(fechaRef).startsWith(anioActual);
      }

      return coincideBusq && coincideProy && coincideResp && coincidePeriodo;
    });
  }, [
    tareasBase,
    proyectoFijoCodigo,
    vista,
    filtroPill,
    busqueda,
    filtroProyecto,
    filtroResponsable,
    filtroPeriodo,
  ]);

  const totalPaginas = Math.max(1, Math.ceil(tareasFiltradas.length / filasPorPagina));
  const inicio = (pagina - 1) * filasPorPagina;
  const tareasPaginadas = tareasFiltradas.slice(inicio, inicio + filasPorPagina);

  const exportarCsv = () => {
    const encabezados = ['Titulo', 'Rubro', 'Proyecto', 'Responsable', 'Inicio', 'Vence', 'Prioridad', 'Estado'];
    const filas = tareasFiltradas.map((t) => [
      `"${String(t.titulo || '').replace(/"/g, '""')}"`,
      `"${String(t.rubro || '').replace(/"/g, '""')}"`,
      `"${t.proyecto_codigo ? `${t.proyecto_codigo} · ${t.proyecto_nombre}` : 'General'}"`,
      `"${String(t.responsable || 'Sin asignar').replace(/"/g, '""')}"`,
      t.fecha_inicio || '',
      t.fecha_vencimiento || '',
      t.prioridad || 'Media',
      normalizarEstado(t.estado),
    ]);
    const csv = [encabezados.join(','), ...filas.map((f) => f.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tareas_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const datosCronograma = useMemo(() => {
    const hoy = new Date();
    const cantidadMeses =
      escalaCrono === 'Semana'
        ? 1
        : escalaCrono === 'Mes'
        ? 2
        : escalaCrono === 'Trimestre'
        ? 3
        : escalaCrono === 'Año'
        ? 12
        : 7;

    const fechaBase = new Date(hoy.getFullYear(), hoy.getMonth() - Math.floor(cantidadMeses / 2) + offsetMeses, 1);
    const fechaFin = new Date(fechaBase.getFullYear(), fechaBase.getMonth() + cantidadMeses, 0);

    const meses: { label: string; dias: number[] }[] = [];
    for (let i = 0; i < cantidadMeses; i++) {
      const d = new Date(fechaBase.getFullYear(), fechaBase.getMonth() + i, 1);
      const nombreMes = d.toLocaleDateString('es-AR', { month: 'long' });
      const label = i === 0 ? `${nombreMes} de ${d.getFullYear()}` : nombreMes;
      meses.push({ label, dias: [2, 9, 16, 23, 30] });
    }

    const totalMs = Math.max(1, fechaFin.getTime() - fechaBase.getTime());
    const pctHoy = Math.min(
      100,
      Math.max(0, ((hoy.getTime() - fechaBase.getTime()) / totalMs) * 100)
    );

    const calcularPosicion = (inicioIso?: string, finIso?: string) => {
      const fIni = inicioIso ? new Date(`${String(inicioIso).split('T')[0]}T12:00:00`) : new Date(hoy.getTime() - 7 * 86400000);
      const fFin = finIso ? new Date(`${String(finIso).split('T')[0]}T12:00:00`) : new Date(fIni.getTime() + 14 * 86400000);
      const left = ((fIni.getTime() - fechaBase.getTime()) / totalMs) * 100;
      const width = Math.max(8, ((fFin.getTime() - fIni.getTime()) / totalMs) * 100);
      return {
        left: Math.min(82, Math.max(2, left)),
        width: Math.min(35, Math.max(14, width)),
      };
    };

    return { meses, pctHoy, diaHoy: hoy.getDate(), calcularPosicion };
  }, [escalaCrono, offsetMeses]);

  return (
    <div className={compacto ? 'text-white font-sans' : 'min-h-screen bg-[#121212] text-white p-8 font-sans'}>
      {/* CABECERA */}
      {!compacto ? (
        <div className="flex flex-wrap justify-between items-start gap-4 mb-5">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Tareas y Entregables
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Planos, cómputos, pedidos de cotización y controles técnicos organizados por estado y fecha
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setTareaEditando(null);
              setModalAbierto(true);
            }}
            className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors shadow-[0_0_20px_rgba(234,179,8,0.2)] cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" /> Nueva tarea
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <div>
            <h2 className="text-base font-bold text-white">
              Planificación de Tareas y Cronograma ({tareasBase.length})
            </h2>
            <p className="text-xs text-gray-400">
              Alterná entre Lista, Tablero Kanban o línea de tiempo del proyecto
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setTareaEditando(null);
              setModalAbierto(true);
            }}
            className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-4 py-2 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Nueva tarea
          </button>
        </div>
      )}

      {/* BARRA DE CAMBIO DE VISTA (Lista / Tablero Kanban / Cronograma) + ACCIONES */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-5">
        <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-1 inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => setVista('lista')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-2 transition-all cursor-pointer ${
              vista === 'lista'
                ? 'bg-[#EAB308] text-black shadow'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <List className="w-3.5 h-3.5" /> Lista
          </button>

          <button
            type="button"
            onClick={() => setVista('kanban')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-2 transition-all cursor-pointer ${
              vista === 'kanban'
                ? 'bg-[#EAB308] text-black shadow'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <Columns className="w-3.5 h-3.5" /> Tablero Kanban
          </button>

          <button
            type="button"
            onClick={() => setVista('cronograma')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-2 transition-all cursor-pointer ${
              vista === 'cronograma'
                ? 'bg-[#EAB308] text-black shadow'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" /> Cronograma
          </button>
        </div>

        <div className="flex items-center gap-2">
          {!compacto && (
            <button
              type="button"
              onClick={() => {
                setTareaEditando(null);
                setModalAbierto(true);
              }}
              className="bg-[#1A1A1A] hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white px-3.5 py-2 rounded-xl text-xs font-medium inline-flex items-center gap-2 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" /> Importar
            </button>
          )}
          <button
            type="button"
            onClick={exportarCsv}
            className="bg-[#1A1A1A] hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white px-3.5 py-2 rounded-xl text-xs font-medium inline-flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Exportar
          </button>
          {!compacto && (
            <>
              <div className="w-px h-5 bg-gray-800" />
              <button
                type="button"
                onClick={() => setVistaRestringida(!vistaRestringida)}
                className={`border px-3.5 py-2 rounded-xl text-xs font-medium inline-flex items-center gap-2 cursor-pointer ${
                  vistaRestringida
                    ? 'bg-[#EAB308]/15 border-[#EAB308]/40 text-[#EAB308]'
                    : 'bg-[#1A1A1A] hover:bg-gray-800 border-gray-800 text-gray-300 hover:text-white'
                }`}
              >
                <Lock className="w-3.5 h-3.5" /> Restringir vista
              </button>
            </>
          )}
        </div>
      </div>

      {/* PILLS DE ESTADO */}
      <div className="flex flex-wrap items-center gap-2.5 mb-5">
        {[
          { id: 'pendientes', label: 'Pendientes', count: stats.pendientes, dot: null },
          { id: 'por_realizar', label: 'Por realizar', count: stats.porRealizar, dot: 'bg-gray-400' },
          { id: 'en_curso', label: 'En curso', count: stats.enCurso, dot: 'bg-gray-400' },
          { id: 'atrasadas', label: 'Atrasadas', count: stats.atrasadas, dot: 'bg-rose-500' },
          { id: 'completadas', label: 'Completadas', count: stats.completadas, dot: 'bg-gray-400' },
        ].map((pill) => {
          const activa = filtroPill === pill.id;
          return (
            <button
              key={pill.id}
              type="button"
              onClick={() => {
                setFiltroPill(pill.id as any);
                setPagina(1);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-all cursor-pointer border ${
                activa
                  ? 'bg-[#EAB308] text-black border-[#EAB308] shadow'
                  : 'bg-[#1A1A1A] text-gray-200 border-gray-800 hover:border-gray-700'
              }`}
            >
              {pill.dot && !activa && <span className={`w-1.5 h-1.5 rounded-full ${pill.dot}`} />}
              <span>{pill.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  activa
                    ? 'bg-black/20 text-black'
                    : pill.id === 'atrasadas'
                    ? 'bg-rose-950 text-rose-400'
                    : 'bg-gray-800 text-gray-300'
                }`}
              >
                {pill.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* BARRA DE BÚSQUEDA Y FILTROS */}
      <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-4 mb-6 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setPagina(1);
              }}
              placeholder="Buscar tarea por título, rubro, responsable o nota..."
              className="w-full bg-[#121212] border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500"
            />
          </div>

          {!proyectoFijoCodigo && (
            <select
              value={filtroProyecto}
              onChange={(e) => {
                setFiltroProyecto(e.target.value);
                setPagina(1);
              }}
              className="bg-[#121212] border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs font-medium text-gray-200"
            >
              <option value="Todos">Proyecto / Obra: Todos</option>
              {proyectos.map((p) => (
                <option key={p.codigo} value={p.codigo}>
                  {p.codigo} · {p.nombre}
                </option>
              ))}
            </select>
          )}

          <select
            value={filtroResponsable}
            onChange={(e) => {
              setFiltroResponsable(e.target.value);
              setPagina(1);
            }}
            className="bg-[#121212] border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs font-medium text-gray-200"
          >
            <option value="Todos">Responsable: Todos</option>
            {equipo.map((m) => (
              <option key={m.id} value={m.nombre}>
                {m.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#EAB308]" />
            <select
              value={filtroPeriodo}
              onChange={(e) => {
                setFiltroPeriodo(e.target.value);
                setPagina(1);
              }}
              className="bg-[#121212] border border-gray-800 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-200"
            >
              <option value="Todos">Período: Todos</option>
              <option value="Este mes">Período: Este mes</option>
              <option value="Este año">Período: Este año</option>
            </select>
          </div>

          <span className="text-xs text-gray-400">
            Mostrando {tareasFiltradas.length} {tareasFiltradas.length === 1 ? 'tarea' : 'tareas'}
          </span>
        </div>
      </div>

      {/* VISTA 1: LISTA */}
      {vista === 'lista' && (
        <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-5 shadow-xl">
          <h2 className="text-sm font-bold text-white mb-4">
            Tareas ({tareasFiltradas.length})
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  <th className="py-3 px-3">TAREA</th>
                  {!proyectoFijoCodigo && <th className="py-3 px-3">PROYECTO</th>}
                  <th className="py-3 px-3">RESPONSABLE</th>
                  <th className="py-3 px-3">VENCE</th>
                  <th className="py-3 px-3">PRIORIDAD</th>
                  <th className="py-3 px-3">ESTADO</th>
                  <th className="py-3 px-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/70 text-sm">
                {tareasPaginadas.length === 0 ? (
                  <tr>
                    <td colSpan={proyectoFijoCodigo ? 6 : 7} className="py-10 text-center text-gray-400 text-xs">
                      No se encontraron tareas para el filtro seleccionado.
                    </td>
                  </tr>
                ) : (
                  tareasPaginadas.map((t) => {
                    const est = normalizarEstado(t.estado);
                    const completada = est === 'Finalizado';
                    const atrasada = esAtrasada(t);

                    return (
                      <tr
                        key={t.id}
                        onClick={() => {
                          setTareaEditando(t);
                          setModalAbierto(true);
                        }}
                        className="hover:bg-[#202020] transition-colors cursor-pointer"
                      >
                        <td className="py-4 px-3">
                          <div className="flex items-start gap-3">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleCompletar(t);
                              }}
                              className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 cursor-pointer ${
                                completada
                                  ? 'bg-emerald-500 border-emerald-500 text-black'
                                  : 'border-gray-600 hover:border-[#EAB308]'
                              }`}
                            >
                              {completada && <Check className="w-3 h-3 stroke-[3]" />}
                            </button>
                            <div>
                              <div
                                className={`text-xs font-bold ${
                                  completada ? 'line-through text-gray-400' : 'text-white'
                                }`}
                              >
                                {t.titulo}
                              </div>
                              {t.rubro && (
                                <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded bg-purple-950/70 border border-purple-700/50 text-purple-300 text-[10px] font-bold">
                                  <Tag className="w-2.5 h-2.5" /> {t.rubro}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {!proyectoFijoCodigo && (
                          <td className="py-4 px-3 text-xs font-semibold text-gray-200">
                            {t.proyecto_codigo
                              ? `${t.proyecto_codigo} · ${t.proyecto_nombre || ''}`
                              : 'General'}
                          </td>
                        )}

                        <td className="py-4 px-3 text-xs text-gray-300">
                          {t.responsable || 'Sin asignar'}
                        </td>

                        <td
                          className={`py-4 px-3 text-xs font-bold ${
                            atrasada ? 'text-rose-400' : 'text-gray-300'
                          }`}
                        >
                          {formatearFechaCorta(t.fecha_vencimiento)}
                        </td>

                        <td
                          className={`py-4 px-3 text-xs font-bold ${
                            t.prioridad === 'Alta' ? 'text-white' : 'text-gray-400'
                          }`}
                        >
                          {t.prioridad || 'Media'}
                        </td>

                        <td className="py-4 px-3 text-xs">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${
                              atrasada
                                ? 'bg-rose-950/70 border-rose-800/60 text-rose-400'
                                : completada
                                ? 'bg-emerald-950/70 border-emerald-700/50 text-emerald-400'
                                : 'bg-blue-950/70 border-blue-800/60 text-blue-300'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                atrasada
                                  ? 'bg-rose-400'
                                  : completada
                                  ? 'bg-emerald-400'
                                  : 'bg-blue-400'
                              }`}
                            />
                            {atrasada ? 'Atrasada' : est}
                          </span>
                        </td>

                        <td className="py-4 px-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTareaEditando(t);
                              setModalAbierto(true);
                            }}
                            className="px-3.5 py-1.5 rounded-xl border border-gray-700 hover:bg-gray-800 text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            Más info <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-800/80 flex flex-wrap justify-between items-center gap-4 text-xs text-gray-400">
            <div className="flex items-center gap-3">
              <span>
                Mostrando{' '}
                <strong className="text-white">
                  {tareasFiltradas.length === 0 ? 0 : inicio + 1}–
                  {Math.min(inicio + filasPorPagina, tareasFiltradas.length)}
                </strong>{' '}
                de <strong className="text-white">{tareasFiltradas.length}</strong>
              </span>
              <span>·</span>
              <div className="flex items-center gap-2">
                <span>Filas por página:</span>
                <select
                  value={filasPorPagina}
                  onChange={(e) => {
                    setFilasPorPagina(Number(e.target.value));
                    setPagina(1);
                  }}
                  className="bg-[#121212] border border-gray-800 rounded-lg px-2 py-1 text-white"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={pagina === 1}
                className="px-3 py-1.5 rounded-lg bg-[#121212] border border-gray-800 hover:bg-gray-800 disabled:opacity-40 cursor-pointer"
              >
                ‹ Anterior
              </button>
              <span className="px-3.5 py-1.5 rounded-lg bg-[#EAB308] text-black font-bold">
                Página {pagina}
              </span>
              <button
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                disabled={pagina === totalPaginas}
                className="px-3 py-1.5 rounded-lg bg-[#121212] border border-gray-800 hover:bg-gray-800 disabled:opacity-40 cursor-pointer"
              >
                Siguiente ›
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VISTA 2: TABLERO KANBAN */}
      {vista === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {COLUMNAS_KANBAN.map((col, colIdx) => {
            const itemsCol = tareasFiltradas.filter((t) => normalizarEstado(t.estado) === col.id);

            return (
              <div
                key={col.id}
                className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-4 shadow-xl flex flex-col min-h-[300px]"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-extrabold tracking-wider text-gray-200 inline-flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                    {col.label}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${col.badge}`}>
                    {itemsCol.length}
                  </span>
                </div>

                {itemsCol.length === 0 ? (
                  <div className="flex-1 border border-dashed border-gray-800 rounded-xl flex items-center justify-center text-xs text-gray-500 p-6">
                    Sin tareas
                  </div>
                ) : (
                  <div className="space-y-3">
                    {itemsCol.map((t) => {
                      const atrasada = esAtrasada(t);
                      return (
                        <div
                          key={t.id}
                          onClick={() => {
                            setTareaEditando(t);
                            setModalAbierto(true);
                          }}
                          className="bg-[#121212] border border-gray-800 hover:border-gray-700 rounded-xl p-3.5 space-y-2.5 cursor-pointer transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="text-xs font-bold text-white leading-snug">
                              {t.titulo}
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold flex-shrink-0 border ${
                                t.prioridad === 'Alta'
                                  ? 'bg-amber-950/80 border-amber-700/60 text-[#EAB308]'
                                  : 'bg-cyan-950/70 border-cyan-800/60 text-cyan-300'
                              }`}
                            >
                              {t.prioridad || 'Media'}
                            </span>
                          </div>

                          {t.rubro && (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-950/70 border border-purple-700/50 text-purple-300 text-[10px] font-bold">
                                <Tag className="w-2.5 h-2.5" /> {t.rubro}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center justify-between gap-2 pt-1 text-[11px]">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {t.proyecto_codigo && (
                                <span className="font-extrabold text-[#EAB308]">
                                  {t.proyecto_codigo}
                                </span>
                              )}
                              {atrasada && (
                                <span className="px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-800/60 text-rose-400 text-[10px] font-bold">
                                  Atrasada
                                </span>
                              )}
                              {t.fecha_vencimiento && (
                                <span className={atrasada ? 'text-rose-400 font-semibold' : 'text-gray-400'}>
                                  {formatearFechaCorta(t.fecha_vencimiento)}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                type="button"
                                disabled={colIdx === 0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moverTareaKanban(t, -1);
                                }}
                                className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-white disabled:opacity-25 cursor-pointer"
                                title="Mover a columna anterior"
                              >
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={colIdx === COLUMNAS_KANBAN.length - 1}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moverTareaKanban(t, 1);
                                }}
                                className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-white disabled:opacity-25 cursor-pointer"
                                title="Mover a columna siguiente"
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* VISTA 3: CRONOGRAMA */}
      {vista === 'cronograma' && (
        <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-5 py-4 border-b border-gray-800 flex flex-wrap justify-between items-center gap-3">
            <div className="inline-flex items-center gap-2 bg-[#121212] border border-gray-800 px-3.5 py-2 rounded-xl text-xs font-bold text-white">
              <RefreshCw className="w-3.5 h-3.5 text-[#EAB308]" /> Cronograma
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="/agenda"
                className="bg-[#121212] hover:bg-gray-800 border border-gray-800 text-gray-200 px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-2"
              >
                <Calendar className="w-3.5 h-3.5 text-[#EAB308]" /> Gestionar en el Calendario
              </Link>

              <div className="bg-[#121212] border border-gray-800 rounded-xl p-1 inline-flex items-center">
                {(['Semana', 'Mes', 'Trimestre', 'Semestre', 'Año'] as const).map((esc) => (
                  <button
                    key={esc}
                    type="button"
                    onClick={() => setEscalaCrono(esc)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                      escalaCrono === esc
                        ? 'bg-[#EAB308] text-black'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {esc}
                  </button>
                ))}
              </div>

              <div className="inline-flex items-center gap-1 bg-[#121212] border border-gray-800 rounded-xl px-2 py-1 text-xs">
                <button
                  type="button"
                  onClick={() => setOffsetMeses((o) => o - 1)}
                  className="p-1 hover:text-white text-gray-400 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setOffsetMeses(0)}
                  className="px-2 font-bold text-gray-200 hover:text-white cursor-pointer"
                >
                  Hoy
                </button>
                <button
                  type="button"
                  onClick={() => setOffsetMeses((o) => o + 1)}
                  className="p-1 hover:text-white text-gray-400 cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[900px] relative">
              <div
                className="grid border-b border-gray-800 bg-[#161616]"
                style={{ gridTemplateColumns: `repeat(${datosCronograma.meses.length}, minmax(0, 1fr))` }}
              >
                {datosCronograma.meses.map((m, i) => (
                  <div key={i} className="px-3 py-2 text-xs font-bold text-gray-300 capitalize border-r border-gray-800/60">
                    {m.label}
                  </div>
                ))}
              </div>

              <div
                className="grid border-b border-gray-800 bg-[#121212]"
                style={{ gridTemplateColumns: `repeat(${datosCronograma.meses.length}, minmax(0, 1fr))` }}
              >
                {datosCronograma.meses.map((m, i) => (
                  <div key={i} className="flex justify-between px-3 py-2 text-[11px] text-gray-500 border-r border-gray-800/60">
                    {m.dias.map((d) => (
                      <span key={d}>{d}</span>
                    ))}
                  </div>
                ))}
              </div>

              <div className="relative min-h-[280px] p-4 space-y-3 bg-[#141414]">
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-10 pointer-events-none"
                  style={{ left: `${datosCronograma.pctHoy}%` }}
                >
                  <div className="w-6 h-6 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center -ml-[11px] -mt-3 shadow">
                    {datosCronograma.diaHoy}
                  </div>
                </div>

                {tareasFiltradas.map((t) => {
                  const pos = datosCronograma.calcularPosicion(t.fecha_inicio, t.fecha_vencimiento);
                  const atrasada = esAtrasada(t);
                  const est = normalizarEstado(t.estado);

                  return (
                    <div key={t.id} className="relative h-11 flex items-center">
                      <div
                        onClick={() => {
                          setTareaEditando(t);
                          setModalAbierto(true);
                        }}
                        style={{ left: `${pos.left}%` }}
                        className="absolute flex items-center gap-2.5 cursor-pointer group z-20"
                      >
                        <div className="bg-[#1F1F1F] group-hover:bg-[#262626] border border-gray-700 rounded-xl px-3.5 py-2 flex items-center gap-2 shadow-lg">
                          <Folder className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-xs font-bold text-white whitespace-nowrap">
                            {t.titulo}
                          </span>
                        </div>

                        <span className="text-[11px] text-gray-400 font-semibold whitespace-nowrap">
                          {est === 'Finalizado' ? '100 %' : est === 'En Curso' ? '50 %' : '0 %'}
                        </span>

                        <span className="px-2.5 py-1 rounded-full bg-[#EAB308]/15 border border-[#EAB308]/40 text-[#EAB308] text-[10px] font-bold whitespace-nowrap">
                          ● {est}
                        </span>

                        {atrasada && (
                          <span className="text-[11px] font-bold text-rose-400 whitespace-nowrap">
                            ● Atrasada · Fecha vencida
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                <div className="pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setTareaEditando(null);
                      setModalAbierto(true);
                    }}
                    className="text-xs font-bold text-gray-400 hover:text-white inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> + Nuevo ítem
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL COMPARTIDO */}
      <ModalTarea
        abierto={modalAbierto}
        onClose={() => {
          setModalAbierto(false);
          setTareaEditando(null);
        }}
        onGuardado={(msg) => {
          mostrarToast(msg);
          router.refresh();
        }}
        tareaEditando={tareaEditando}
        proyectos={proyectos}
        equipo={equipo}
        proyectoFijoCodigo={proyectoFijoCodigo}
      />

      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#161616] border border-gray-700/80 shadow-2xl rounded-xl px-5 py-3.5 flex items-center gap-3 z-50">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-semibold text-white">{toast}</span>
        </div>
      )}
    </div>
  );
}