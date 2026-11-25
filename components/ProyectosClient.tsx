"use client";

import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { moverAPapelera } from '@/lib/papelera';
import {
  Plus,
  Search,
  List,
  Columns,
  Calendar as CalendarIcon,
  LayoutGrid,
  MapPin,
  User,
  Edit3,
  Trash2,
  X,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

export const ETAPAS_OBRA = [
  'Relevamiento y Concepto',
  'Anteproyecto y Diseño',
  'Proyecto Ejecutivo y Detalles',
  'Presupuesto y Compras',
  'Dirección y Ejecución de Obra',
  'Entrega Final',
];

function formatearMilesDecimalesInput(valorCrudo: string): string {
  const limpio = valorCrudo.replace(/[^\d,]/g, '');
  if (!limpio) return '';
  const partes = limpio.split(',');
  const enteros = partes[0].replace(/^0+(?=\d)/, '');
  const conPuntos = enteros.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (partes.length > 1) {
    return `${conPuntos || '0'},${partes[1].slice(0, 2)}`;
  }
  return conPuntos;
}

function parsearNumeroArg(valorFormateado: string | number): number {
  if (typeof valorFormateado === 'number') return valorFormateado;
  const s = String(valorFormateado || '').trim();
  if (!s) return 0;
  if (s.includes(',')) {
    return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
  }
  const puntos = (s.match(/\./g) || []).length;
  if (puntos > 1) return parseFloat(s.replace(/\./g, '')) || 0;
  return parseFloat(s) || 0;
}

function numeroAInputArg(n: number | string | null | undefined): string {
  const num = Number(n || 0);
  if (!num) return '';
  return num.toLocaleString('es-AR', {
    minimumFractionDigits: num % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

function formatearFechaCorta(iso?: string | null): string {
  if (!iso) return '—';
  const [y, m, d] = String(iso).split('T')[0].split('-');
  if (!y || !m || !d) return String(iso);
  return `${d}/${m}/${y}`;
}

export default function ProyectosClient({
  proyectosIniciales = [],
  clientes = [],
  equipo = [],
}: {
  proyectosIniciales: any[];
  clientes?: any[];
  equipo?: any[];
}) {
  const router = useRouter();
  const [montado, setMontado] = useState(false);
  const [proyectos, setProyectos] = useState<any[]>(proyectosIniciales);

  const [vista, setVista] = useState<'lista' | 'kanban' | 'cronograma' | 'tarjetas'>('kanban');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [filtroEtapa, setFiltroEtapa] = useState('Todas');
  const [filtroResponsable, setFiltroResponsable] = useState('Todos');

  // Serie Índice CAC desde API CAMARCO
  const [serieCAC, setSerieCAC] = useState<{ periodo: string; etiqueta: string; valor: number }[]>([
    { periodo: 'OCT2026', etiqueta: 'Octubre 2026', valor: 23884.2 },
  ]);
  const [cargandoCAC, setCargandoCAC] = useState(false);

  // Modal Nuevo / Editar Proyecto
  const [modalAbierto, setModalAbierto] = useState(false);
  const [proyectoEditando, setProyectoEditando] = useState<any | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [tipologia, setTipologia] = useState('Vivienda Unifamiliar');
  const [clienteId, setClienteId] = useState('');
  const [responsable, setResponsable] = useState('');
  const [etapa, setEtapa] = useState(ETAPAS_OBRA[0]);
  const [estado, setEstado] = useState('En Curso');
  const [superficie, setSuperficie] = useState('');
  const [moneda, setMoneda] = useState<'USD' | 'ARS'>('USD');
  const [presupuestoTexto, setPresupuestoTexto] = useState('');
  const [certificaciones, setCertificaciones] = useState<'Quincenales' | 'Mensuales'>('Mensuales');
  const [redeterminacionTipo, setRedeterminacionTipo] = useState<'USD' | 'Índice CAC'>('USD');
  const [cacMesBase, setCacMesBase] = useState('OCT2026');
  const [cacValorBase, setCacValorBase] = useState('23.884,20');

  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFinPlan, setFechaFinPlan] = useState('');
  const [fechaInicioReal, setFechaInicioReal] = useState('');
  const [fechaFinReal, setFechaFinReal] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [driveUrl, setDriveUrl] = useState('');
  const [notas, setNotas] = useState('');

  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setMontado(true);
  }, []);

  useEffect(() => {
    setProyectos(proyectosIniciales);
  }, [proyectosIniciales]);

  const cargarSerieCAC = async () => {
    setCargandoCAC(true);
    try {
      const res = await fetch('/api/indice-cac');
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.serie) && json.serie.length > 0) {
          setSerieCAC(json.serie);
          if (!proyectoEditando) {
            setCacMesBase(json.serie[0].periodo);
            setCacValorBase(numeroAInputArg(json.serie[0].valor));
          }
        }
      }
    } catch {
      // Mantiene respaldo local
    } finally {
      setCargandoCAC(false);
    }
  };

  useEffect(() => {
    cargarSerieCAC();
  }, []);

  const mostrarToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const generarSiguienteCodigo = () => {
    const anio = new Date().getFullYear();
    const nums = proyectos
      .map((p) => {
        const m = String(p.codigo || '').match(/(\d+)$/);
        return m ? parseInt(m[1], 10) : 0;
      })
      .filter((n) => !Number.isNaN(n));
    const sig = (nums.length > 0 ? Math.max(...nums) : 0) + 1;
    return `OBR-${anio}-${String(sig).padStart(2, '0')}`;
  };

  const abrirModalNuevo = () => {
    setProyectoEditando(null);
    setCodigo(generarSiguienteCodigo());
    setNombre('');
    setTipologia('Vivienda Unifamiliar');
    setClienteId('');
    setResponsable(equipo[0]?.nombre || 'Alejandro Fego');
    setEtapa(ETAPAS_OBRA[0]);
    setEstado('En Curso');
    setSuperficie('');
    setMoneda('USD');
    setPresupuestoTexto('');
    setCertificaciones('Mensuales');
    setRedeterminacionTipo('USD');
    const ultimoCac = serieCAC[0] || { periodo: 'OCT2026', valor: 23884.2 };
    setCacMesBase(ultimoCac.periodo);
    setCacValorBase(numeroAInputArg(ultimoCac.valor));
    setFechaInicio(new Date().toISOString().split('T')[0]);
    setFechaFinPlan('');
    setFechaInicioReal('');
    setFechaFinReal('');
    setUbicacion('');
    setDriveUrl('');
    setNotas('');
    setModalAbierto(true);
  };

  const abrirModalEditar = (p: any) => {
    setProyectoEditando(p);
    setCodigo(p.codigo || '');
    setNombre(p.nombre || '');
    setTipologia(p.tipologia || '');
    setClienteId(p.cliente_id ? String(p.cliente_id) : '');
    setResponsable(p.responsable || '');
    const etapaNormalizada =
      p.etapa === 'Entrega y Post-Obra' || p.etapa_actual === 'Entrega y Post-Obra'
        ? 'Entrega Final'
        : p.etapa_actual || p.etapa || ETAPAS_OBRA[0];
    setEtapa(etapaNormalizada);
    setEstado(
      etapaNormalizada === 'Entrega Final'
        ? 'Finalizado'
        : p.estado === 'Finalizado'
        ? 'En Curso'
        : p.estado || 'En Curso'
    );
    setSuperficie(p.superficie ? String(p.superficie) : '');
    const mon = (String(p.moneda || 'USD').toUpperCase() === 'ARS' ? 'ARS' : 'USD') as 'USD' | 'ARS';
    setMoneda(mon);
    setPresupuestoTexto(numeroAInputArg(p.presupuesto));
    setCertificaciones(p.certificaciones === 'Quincenales' ? 'Quincenales' : 'Mensuales');
    setRedeterminacionTipo(
      p.redeterminacion_tipo === 'Índice CAC' ? 'Índice CAC' : mon === 'ARS' ? 'Índice CAC' : 'USD'
    );
    const mes = p.cac_mes_base || serieCAC[0]?.periodo || 'OCT2026';
    setCacMesBase(mes);
    const valGuardado = Number(p.cac_valor_base || 0);
    const valSerie = serieCAC.find((s) => s.periodo === mes)?.valor || 23884.2;
    setCacValorBase(numeroAInputArg(valGuardado > 0 ? valGuardado : valSerie));
    setFechaInicio(p.fecha_inicio || '');
    setFechaFinPlan(p.fecha_fin_plan || p.entrega_estimada || '');
    setFechaInicioReal(p.fecha_inicio_real || '');
    setFechaFinReal(p.fecha_fin_real || '');
    setUbicacion(p.ubicacion || '');
    setDriveUrl(p.drive_url || '');
    setNotas(p.notas || '');
    setModalAbierto(true);
  };

  const cambiarMesCac = (nuevoPeriodo: string) => {
    setCacMesBase(nuevoPeriodo);
    const item = serieCAC.find((s) => s.periodo === nuevoPeriodo);
    if (item) {
      setCacValorBase(numeroAInputArg(item.valor));
    }
  };

  const guardarProyecto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardando) return;
    setGuardando(true);

    try {
      const clienteObj = clientes.find((c) => String(c.id) === String(clienteId));
      const presNum = parsearNumeroArg(presupuestoTexto);
      const supNum = parsearNumeroArg(superficie);
      const cacNum = parsearNumeroArg(cacValorBase);

      const estadoFinal =
        etapa === 'Entrega Final'
          ? 'Finalizado'
          : estado === 'Pausado'
          ? 'Pausado'
          : 'En Curso';

      const payload: Record<string, any> = {
        codigo: codigo.trim() || generarSiguienteCodigo(),
        nombre: nombre.trim(),
        tipologia: tipologia.trim() || null,
        cliente_id: clienteId || null,
        cliente_nombre: clienteObj ? clienteObj.nombre : null,
        responsable: responsable.trim() || null,
        etapa,
        etapa_actual: etapa,
        estado: estadoFinal,
        superficie: supNum,
        moneda,
        presupuesto: presNum,
        certificaciones,
        redeterminacion_tipo: redeterminacionTipo,
        cac_mes_base: redeterminacionTipo === 'Índice CAC' ? cacMesBase : null,
        cac_valor_base: redeterminacionTipo === 'Índice CAC' ? cacNum : 0,
        fecha_inicio: fechaInicio || null,
        entrega_estimada: fechaFinPlan || null,
        fecha_fin_plan: fechaFinPlan || null,
        fecha_inicio_real: fechaInicioReal || null,
        fecha_fin_real: fechaFinReal || null,
        ubicacion: ubicacion.trim() || null,
        drive_url: driveUrl.trim() || null,
        notas: notas.trim() || null,
      };

      if (proyectoEditando) {
        const { error } = await supabase
          .from('proyectos')
          .update(payload)
          .eq('codigo', proyectoEditando.codigo);

        if (error) {
          alert('Error al guardar proyecto: ' + error.message);
          return;
        }
        setProyectos((prev) =>
          prev.map((item) =>
            item.codigo === proyectoEditando.codigo ? { ...item, ...payload } : item
          )
        );
        mostrarToast('Proyecto actualizado');
      } else {
        const { data, error } = await supabase.from('proyectos').insert([payload]).select();
        if (error) {
          alert('Error al crear proyecto: ' + error.message);
          return;
        }
        if (data && data[0]) {
          setProyectos((prev) => [data[0], ...prev]);
        }
        mostrarToast('Proyecto creado correctamente');
      }

      setModalAbierto(false);
      router.refresh();
    } catch (err: any) {
      alert('Error inesperado: ' + (err?.message || 'Sin conexión'));
    } finally {
      setGuardando(false);
    }
  };

  const moverEtapaKanban = async (proy: any, direccion: -1 | 1) => {
    const etapaActualNorm =
      proy.etapa === 'Entrega y Post-Obra' || proy.etapa_actual === 'Entrega y Post-Obra'
        ? 'Entrega Final'
        : proy.etapa_actual || proy.etapa || ETAPAS_OBRA[0];
    const idx = Math.max(0, ETAPAS_OBRA.indexOf(etapaActualNorm));
    const nuevoIdx = Math.min(ETAPAS_OBRA.length - 1, Math.max(0, idx + direccion));
    if (nuevoIdx === idx) return;

    const nuevaEtapa = ETAPAS_OBRA[nuevoIdx];
    const nuevoEstado =
      nuevaEtapa === 'Entrega Final'
        ? 'Finalizado'
        : proy.estado === 'Pausado'
        ? 'Pausado'
        : 'En Curso';

    setProyectos((prev) =>
      prev.map((item) =>
        item.codigo === proy.codigo
          ? { ...item, etapa: nuevaEtapa, etapa_actual: nuevaEtapa, estado: nuevoEstado }
          : item
      )
    );

    await supabase
      .from('proyectos')
      .update({ etapa: nuevaEtapa, etapa_actual: nuevaEtapa, estado: nuevoEstado })
      .eq('codigo', proy.codigo);

    mostrarToast(`Movido a ${nuevaEtapa} (${nuevoEstado})`);
    router.refresh();
  };

  const actualizarFechaCronograma = async (
    proy: any,
    campo: 'fecha_inicio' | 'fecha_fin_plan' | 'fecha_inicio_real' | 'fecha_fin_real',
    valor: string
  ) => {
    const extra: Record<string, any> = { [campo]: valor || null };
    if (campo === 'fecha_fin_plan') {
      extra.entrega_estimada = valor || null;
    }

    setProyectos((prev) =>
      prev.map((item) => (item.codigo === proy.codigo ? { ...item, ...extra } : item))
    );

    await supabase.from('proyectos').update(extra).eq('codigo', proy.codigo);
    mostrarToast('Fecha de cronograma actualizada');
    router.refresh();
  };

  const eliminarProyecto = async (proy: any) => {
    try {
      await moverAPapelera({
        tabla: 'proyectos',
        modulo: 'Proyectos',
        titulo: proy.nombre || 'Proyecto',
        subtitulo: proy.codigo || '',
        registro: proy,
      });
      setProyectos((prev) => prev.filter((item) => item.codigo !== proy.codigo));
      mostrarToast('Proyecto enviado a papelera');
      router.refresh();
    } catch (e: any) {
      alert('Error al mover a papelera: ' + e.message);
    }
  };

  const proyectosFiltrados = useMemo(() => {
    return proyectos.filter((p) => {
      const q = busqueda.trim().toLowerCase();
      const etapaNorm =
        p.etapa === 'Entrega y Post-Obra' || p.etapa_actual === 'Entrega y Post-Obra'
          ? 'Entrega Final'
          : p.etapa_actual || p.etapa || ETAPAS_OBRA[0];
      const estadoNorm =
        etapaNorm === 'Entrega Final'
          ? 'Finalizado'
          : p.estado === 'Finalizado'
          ? 'En Curso'
          : p.estado || 'En Curso';

      if (q) {
        const texto = `${p.codigo || ''} ${p.nombre || ''} ${p.cliente_nombre || ''} ${
          p.ubicacion || ''
        }`.toLowerCase();
        if (!texto.includes(q)) return false;
      }
      if (filtroEstado !== 'Todos' && estadoNorm !== filtroEstado) return false;
      if (filtroEtapa !== 'Todas' && etapaNorm !== filtroEtapa) return false;
      if (filtroResponsable !== 'Todos' && p.responsable !== filtroResponsable) return false;
      return true;
    });
  }, [proyectos, busqueda, filtroEstado, filtroEtapa, filtroResponsable]);

  // Cálculo de ventana temporal para el Cronograma Comparativo (Planificado vs Real)
  const rangoCronograma = useMemo(() => {
    const fechas: number[] = [Date.now()];
    proyectosFiltrados.forEach((p) => {
      [p.fecha_inicio, p.fecha_fin_plan || p.entrega_estimada, p.fecha_inicio_real, p.fecha_fin_real].forEach(
        (f) => {
          if (f) {
            const t = new Date(f + 'T00:00:00').getTime();
            if (!Number.isNaN(t)) fechas.push(t);
          }
        }
      );
    });
    const minT = Math.min(...fechas);
    const maxT = Math.max(...fechas);
    const inicio = new Date(minT);
    inicio.setDate(1);
    inicio.setMonth(inicio.getMonth() - 1);

    const fin = new Date(maxT);
    fin.setDate(1);
    fin.setMonth(fin.getMonth() + 3);

    const meses: { key: string; label: string; startMs: number; endMs: number }[] = [];
    const cursor = new Date(inicio);
    while (cursor <= fin && meses.length < 24) {
      const y = cursor.getFullYear();
      const m = cursor.getMonth();
      const s = new Date(y, m, 1).getTime();
      const e = new Date(y, m + 1, 1).getTime();
      const nombreMes = cursor.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
      meses.push({
        key: `${y}-${m}`,
        label: nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1),
        startMs: s,
        endMs: e,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    const totalStart = meses[0]?.startMs || Date.now();
    const totalEnd = meses[meses.length - 1]?.endMs || Date.now() + 86400000 * 180;
    return { meses, totalStart, totalEnd };
  }, [proyectosFiltrados]);

  const calcularPosicionBarra = (ini?: string | null, fin?: string | null) => {
    if (!ini) return null;
    const s = new Date(ini + 'T00:00:00').getTime();
    if (Number.isNaN(s)) return null;
    const eRaw = fin ? new Date(fin + 'T23:59:59').getTime() : s + 86400000 * 15;
    const e = Math.max(s + 86400000 * 3, Number.isNaN(eRaw) ? s + 86400000 * 15 : eRaw);

    const span = Math.max(1, rangoCronograma.totalEnd - rangoCronograma.totalStart);
    const leftPct = Math.max(0, Math.min(98, ((s - rangoCronograma.totalStart) / span) * 100));
    const rightPct = Math.max(leftPct + 2, Math.min(100, ((e - rangoCronograma.totalStart) / span) * 100));
    return {
      left: `${leftPct}%`,
      width: `${Math.max(2, rightPct - leftPct)}%`,
    };
  };

  return (
    <div className="min-h-screen text-white p-8 font-sans">
      {/* ENCABEZADO */}
      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Proyectos y Obras</h1>
          <p className="text-xs text-gray-400 mt-1">
            Gestión integral para estudios de arquitectura, diseño de interiores, exteriores y dirección de obra
          </p>
        </div>

        <button
          type="button"
          onClick={abrirModalNuevo}
          className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-5 py-2.5 rounded-xl font-bold text-xs inline-flex items-center gap-2 cursor-pointer shadow-lg transition-all"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" /> Nuevo proyecto
        </button>
      </div>

      {/* BARRA DE VISTAS */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-5">
        <div className="bg-[#242424] border border-white/10 rounded-xl p-1 inline-flex flex-wrap gap-1">
          {[
            { id: 'lista', label: 'Lista', icon: List },
            { id: 'kanban', label: 'Tablero Kanban', icon: Columns },
            { id: 'cronograma', label: 'Cronograma', icon: CalendarIcon },
            { id: 'tarjetas', label: 'Tarjetas', icon: LayoutGrid },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setVista(t.id as any)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                  vista === t.id
                    ? 'bg-[#EAB308] text-black'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            );
          })}
        </div>

        <span className="text-xs text-gray-400 font-semibold">
          {proyectosFiltrados.length}{' '}
          {proyectosFiltrados.length === 1 ? 'proyecto' : 'proyectos'}
        </span>
      </div>

      {/* FILTROS */}
      <div className="bg-[#242424] border border-white/10 rounded-2xl p-4 mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar proyecto por código (OBR-2026), nombre, cliente o ubicación..."
            className="w-full bg-[#181818] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-gray-400"
          />
        </div>

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="bg-[#181818] border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-white cursor-pointer"
        >
          <option value="Todos">Estado: Todos</option>
          <option value="En Curso">En Curso</option>
          <option value="Pausado">Pausado</option>
          <option value="Finalizado">Finalizado</option>
        </select>

        <select
          value={filtroEtapa}
          onChange={(e) => setFiltroEtapa(e.target.value)}
          className="bg-[#181818] border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-white cursor-pointer"
        >
          <option value="Todas">Etapa: Todas</option>
          {ETAPAS_OBRA.map((et) => (
            <option key={et} value={et}>
              {et}
            </option>
          ))}
        </select>

        <select
          value={filtroResponsable}
          onChange={(e) => setFiltroResponsable(e.target.value)}
          className="bg-[#181818] border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-white cursor-pointer"
        >
          <option value="Todos">Responsable: Todos</option>
          {equipo.map((m) => (
            <option key={m.id} value={m.nombre}>
              {m.nombre}
            </option>
          ))}
        </select>
      </div>

      {/* VISTA 1: TABLERO KANBAN (6 ETAPAS) */}
      {vista === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {ETAPAS_OBRA.map((etapaCol, idx) => {
            const itemsCol = proyectosFiltrados.filter((p) => {
              const et =
                p.etapa === 'Entrega y Post-Obra' || p.etapa_actual === 'Entrega y Post-Obra'
                  ? 'Entrega Final'
                  : p.etapa_actual || p.etapa || ETAPAS_OBRA[0];
              return et === etapaCol;
            });
            const m2Totales = itemsCol.reduce((acc, p) => acc + Number(p.superficie || 0), 0);

            return (
              <div
                key={etapaCol}
                className="bg-[#242424] border border-white/10 rounded-2xl p-3.5 flex flex-col min-h-[420px]"
              >
                <div className="mb-3 pb-2.5 border-b border-white/10">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-white">
                      {etapaCol}
                    </span>
                    <span className="bg-gray-800 text-gray-200 px-2 py-0.5 rounded-full text-[10px] font-extrabold">
                      {itemsCol.length}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>
                      Etapa {idx + 1} de {ETAPAS_OBRA.length}
                    </span>
                    <span>{m2Totales} m² totales</span>
                  </div>
                </div>

                {itemsCol.length === 0 ? (
                  <div className="flex-1 border border-dashed border-white/10 rounded-xl flex items-center justify-center text-[11px] text-gray-400 p-4 text-center">
                    Sin obras en esta etapa
                  </div>
                ) : (
                  <div className="space-y-3">
                    {itemsCol.map((p) => {
                      const estadoMostrar =
                        etapaCol === 'Entrega Final'
                          ? 'Finalizado'
                          : p.estado === 'Finalizado'
                          ? 'En Curso'
                          : p.estado || 'En Curso';
                      const mon = String(p.moneda || 'USD').toUpperCase();

                      return (
                        <div
                          key={p.codigo}
                          className="bg-[#181818] border border-white/10 hover:border-[#EAB308]/60 rounded-xl overflow-hidden shadow-md transition-all"
                        >
                          <Link href={`/proyectos/${p.codigo}`} className="block">
                            {p.portada_url && (
                              <div
                                className="h-24 bg-cover bg-center"
                                style={{ backgroundImage: `url(${p.portada_url})` }}
                              />
                            )}
                            <div className="p-3 space-y-2">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-[#EAB308]/15 text-[#EAB308]">
                                  {p.codigo}
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                    estadoMostrar === 'Finalizado'
                                      ? 'bg-emerald-950/70 border-emerald-700/50 text-emerald-400'
                                      : estadoMostrar === 'Pausado'
                                      ? 'bg-amber-950/70 border-amber-700/50 text-[#EAB308]'
                                      : 'bg-cyan-950/70 border-cyan-700/50 text-cyan-300'
                                  }`}
                                >
                                  {estadoMostrar}
                                </span>
                              </div>

                              <div>
                                <div className="text-xs font-extrabold text-white">{p.nombre}</div>
                                <div className="text-[11px] text-gray-400">{p.tipologia}</div>
                              </div>

                              <div className="text-[11px] text-gray-300 space-y-0.5">
                                <div className="flex items-center gap-1 truncate">
                                  <User className="w-3 h-3 text-[#EAB308] flex-shrink-0" />
                                  <span>
                                    Comitente:{' '}
                                    <strong>{p.cliente_nombre || 'Sin cliente'}</strong>
                                  </span>
                                </div>
                                {p.ubicacion && (
                                  <div className="flex items-center gap-1 truncate text-gray-400">
                                    <MapPin className="w-3 h-3 text-[#EAB308] flex-shrink-0" />
                                    <span className="truncate">{p.ubicacion}</span>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center justify-between pt-1.5 border-t border-white/10 text-[11px]">
                                <span className="text-gray-400">{p.superficie || 0} m²</span>
                                <span className="font-extrabold text-white">
                                  {mon} $
                                  {Number(p.presupuesto || 0).toLocaleString('es-AR', {
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                              </div>
                            </div>
                          </Link>

                          <div className="px-3 py-2 bg-black/20 border-t border-white/10 flex items-center justify-between gap-1">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moverEtapaKanban(p, -1)}
                              className="px-2 py-1 rounded bg-[#242424] border border-white/10 text-[10px] font-bold text-gray-300 hover:text-white disabled:opacity-35 cursor-pointer"
                            >
                              ‹ Ant.
                            </button>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => abrirModalEditar(p)}
                                className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white cursor-pointer"
                                title="Editar proyecto"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => eliminarProyecto(p)}
                                className="p-1 rounded hover:bg-rose-950/60 text-gray-400 hover:text-rose-400 cursor-pointer"
                                title="Enviar a papelera"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                            <button
                              type="button"
                              disabled={idx === ETAPAS_OBRA.length - 1}
                              onClick={() => moverEtapaKanban(p, 1)}
                              className="px-2 py-1 rounded bg-[#242424] border border-white/10 text-[10px] font-bold text-gray-300 hover:text-white disabled:opacity-35 cursor-pointer"
                            >
                              Sig. ›
                            </button>
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

      {/* VISTA 2: CRONOGRAMA COMPARATIVO DE OBRAS EN CURSO (PLANIFICADO VS. REAL CON FECHAS EDITABLES) */}
      {vista === 'cronograma' && (
        <div className="bg-[#242424] border border-white/10 rounded-2xl p-5 shadow-xl overflow-hidden">
          <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
            <div>
              <h2 className="text-sm font-extrabold text-white">
                Cronograma de Obras · Planificado vs. Real
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Editá las fechas directamente en la tabla izquierda para actualizar las barras comparativas del cronograma
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-[11px] font-bold">
              <span className="inline-flex items-center gap-1.5 text-gray-300">
                <span
                  className="w-3.5 h-2.5 rounded-sm inline-block opacity-35 border border-dashed"
                  style={{
                    backgroundColor: 'var(--accent)',
                    borderColor: 'var(--accent)',
                  }}
                />
                Planificado
              </span>
              <span className="inline-flex items-center gap-1.5 text-gray-300">
                <span
                  className="w-3.5 h-2.5 rounded-sm inline-block"
                  style={{ backgroundColor: 'var(--accent)' }}
                />
                Ejecución Real
              </span>
            </div>
          </div>

          <div className="overflow-x-auto border border-white/10 rounded-xl">
            <table className="w-full text-left border-collapse min-w-[1180px]">
              <thead>
                <tr className="bg-[#181818] border-b border-white/10 text-[10px] font-extrabold uppercase tracking-wider text-gray-300">
                  <th className="py-3 px-3 w-48">OBRA / PROYECTO</th>
                  <th className="py-3 px-2 w-32">INICIO PLAN</th>
                  <th className="py-3 px-2 w-32">FIN PLAN</th>
                  <th className="py-3 px-2 w-32">INICIO REAL</th>
                  <th className="py-3 px-2 w-32">FIN REAL</th>
                  <th className="py-3 px-2 w-20 text-center">% AVANCE</th>
                  <th className="py-2 px-2">
                    <div className="grid grid-flow-col auto-cols-fr text-center border-l border-white/10">
                      {rangoCronograma.meses.map((m) => (
                        <div
                          key={m.key}
                          className="px-1 py-1 border-r border-white/10 text-[10px] font-bold text-gray-400"
                        >
                          {m.label}
                        </div>
                      ))}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-xs">
                {proyectosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400">
                      No hay obras para mostrar en el cronograma.
                    </td>
                  </tr>
                ) : (
                  proyectosFiltrados.map((p) => {
                    const etapaNorm =
                      p.etapa === 'Entrega y Post-Obra' || p.etapa_actual === 'Entrega y Post-Obra'
                        ? 'Entrega Final'
                        : p.etapa_actual || p.etapa || ETAPAS_OBRA[0];
                    const idxEtapa = Math.max(0, ETAPAS_OBRA.indexOf(etapaNorm));
                    const pctAvance =
                      etapaNorm === 'Entrega Final'
                        ? 100
                        : Math.round(((idxEtapa + 1) / ETAPAS_OBRA.length) * 100);

                    const finPlan = p.fecha_fin_plan || p.entrega_estimada || '';
                    const barraPlan = calcularPosicionBarra(p.fecha_inicio, finPlan);
                    const barraReal = calcularPosicionBarra(
                      p.fecha_inicio_real || p.fecha_inicio,
                      p.fecha_fin_real || (p.fecha_inicio_real ? new Date().toISOString().split('T')[0] : '')
                    );

                    return (
                      <tr key={p.codigo} className="hover:bg-white/5">
                        <td className="py-2.5 px-3">
                          <Link
                            href={`/proyectos/${p.codigo}`}
                            className="font-extrabold text-white hover:underline block truncate max-w-[180px]"
                          >
                            {p.nombre}
                          </Link>
                          <span className="text-[10px] text-gray-400">{p.codigo}</span>
                        </td>

                        <td className="py-2 px-1.5">
                          <input
                            type="date"
                            value={p.fecha_inicio || ''}
                            onChange={(e) =>
                              actualizarFechaCronograma(p, 'fecha_inicio', e.target.value)
                            }
                            className="w-full bg-[#181818] border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white"
                          />
                        </td>

                        <td className="py-2 px-1.5">
                          <input
                            type="date"
                            value={finPlan}
                            onChange={(e) =>
                              actualizarFechaCronograma(p, 'fecha_fin_plan', e.target.value)
                            }
                            className="w-full bg-[#181818] border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white"
                          />
                        </td>

                        <td className="py-2 px-1.5">
                          <input
                            type="date"
                            value={p.fecha_inicio_real || ''}
                            onChange={(e) =>
                              actualizarFechaCronograma(p, 'fecha_inicio_real', e.target.value)
                            }
                            className="w-full bg-[#181818] border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white"
                          />
                        </td>

                        <td className="py-2 px-1.5">
                          <input
                            type="date"
                            value={p.fecha_fin_real || ''}
                            onChange={(e) =>
                              actualizarFechaCronograma(p, 'fecha_fin_real', e.target.value)
                            }
                            className="w-full bg-[#181818] border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white"
                          />
                        </td>

                        <td className="py-2 px-2 text-center font-extrabold text-xs">
                          {pctAvance}%
                        </td>

                        <td className="py-2 px-2">
                          <div className="relative h-9 bg-[#181818] rounded-lg border border-white/10 overflow-hidden">
                            {/* Grilla vertical de meses */}
                            <div className="absolute inset-0 grid grid-flow-col auto-cols-fr pointer-events-none">
                              {rangoCronograma.meses.map((m) => (
                                <div key={m.key} className="border-r border-white/10 h-full" />
                              ))}
                            </div>

                            {/* Barra Planificada (superior translúcida) */}
                            {barraPlan && (
                              <div
                                title={`Planificado: ${formatearFechaCorta(
                                  p.fecha_inicio
                                )} → ${formatearFechaCorta(finPlan)}`}
                                style={{
                                  left: barraPlan.left,
                                  width: barraPlan.width,
                                  backgroundColor: 'var(--accent)',
                                }}
                                className="absolute top-1 h-3 rounded-sm opacity-35"
                              />
                            )}

                            {/* Barra Real (inferior sólida en color de paleta) */}
                            {barraReal && (
                              <div
                                title={`Real: ${formatearFechaCorta(
                                  p.fecha_inicio_real || p.fecha_inicio
                                )} → ${formatearFechaCorta(p.fecha_fin_real || 'En curso')}`}
                                style={{
                                  left: barraReal.left,
                                  width: barraReal.width,
                                  backgroundColor: 'var(--accent)',
                                }}
                                className="absolute bottom-1 h-3.5 rounded-sm shadow"
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VISTA 3: LISTA */}
      {vista === 'lista' && (
        <div className="bg-[#242424] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  <th className="py-3.5 px-4">CÓDIGO / OBRA</th>
                  <th className="py-3.5 px-4">COMITENTE</th>
                  <th className="py-3.5 px-4">ETAPA</th>
                  <th className="py-3.5 px-4">CERTIF. / REDET.</th>
                  <th className="py-3.5 px-4">PRESUPUESTO</th>
                  <th className="py-3.5 px-4">ESTADO</th>
                  <th className="py-3.5 px-4 text-right">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-xs">
                {proyectosFiltrados.map((p) => {
                  const etapaNorm =
                    p.etapa === 'Entrega y Post-Obra' || p.etapa_actual === 'Entrega y Post-Obra'
                      ? 'Entrega Final'
                      : p.etapa_actual || p.etapa || ETAPAS_OBRA[0];
                  const estadoNorm =
                    etapaNorm === 'Entrega Final'
                      ? 'Finalizado'
                      : p.estado === 'Finalizado'
                      ? 'En Curso'
                      : p.estado || 'En Curso';
                  const mon = String(p.moneda || 'USD').toUpperCase();

                  return (
                    <tr key={p.codigo} className="hover:bg-white/5">
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/proyectos/${p.codigo}`}
                          className="font-extrabold text-white hover:underline"
                        >
                          {p.codigo} · {p.nombre}
                        </Link>
                        <div className="text-[11px] text-gray-400">{p.tipologia}</div>
                      </td>
                      <td className="py-3.5 px-4 text-gray-300">
                        {p.cliente_nombre || 'Sin cliente'}
                      </td>
                      <td className="py-3.5 px-4 text-gray-300">{etapaNorm}</td>
                      <td className="py-3.5 px-4 text-gray-300">
                        <div>{p.certificaciones || 'Mensuales'}</div>
                        <div className="text-[10px] text-gray-400">
                          {p.redeterminacion_tipo === 'Índice CAC'
                            ? `CAC (${p.cac_mes_base || 'OCT2026'})`
                            : 'USD'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-white">
                        {mon} $
                        {Number(p.presupuesto || 0).toLocaleString('es-AR', {
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${
                            estadoNorm === 'Finalizado'
                              ? 'bg-emerald-950/70 border-emerald-700/50 text-emerald-400'
                              : 'bg-cyan-950/70 border-cyan-700/50 text-cyan-300'
                          }`}
                        >
                          {estadoNorm}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => abrirModalEditar(p)}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-gray-300 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => eliminarProyecto(p)}
                          className="p-1.5 rounded-lg hover:bg-rose-950/60 text-rose-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VISTA 4: TARJETAS */}
      {vista === 'tarjetas' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {proyectosFiltrados.map((p) => {
            const etapaNorm =
              p.etapa === 'Entrega y Post-Obra' || p.etapa_actual === 'Entrega y Post-Obra'
                ? 'Entrega Final'
                : p.etapa_actual || p.etapa || ETAPAS_OBRA[0];
            const estadoNorm =
              etapaNorm === 'Entrega Final'
                ? 'Finalizado'
                : p.estado === 'Finalizado'
                ? 'En Curso'
                : p.estado || 'En Curso';
            const mon = String(p.moneda || 'USD').toUpperCase();

            return (
              <div
                key={p.codigo}
                className="bg-[#242424] border border-white/10 rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between"
              >
                <Link href={`/proyectos/${p.codigo}`}>
                  <div
                    className="h-36 bg-cover bg-center bg-gray-800"
                    style={
                      p.portada_url ? { backgroundImage: `url(${p.portada_url})` } : undefined
                    }
                  />
                  <div className="p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-[#EAB308]">{p.codigo}</span>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-950/70 text-cyan-300">
                        {estadoNorm}
                      </span>
                    </div>
                    <h3 className="text-base font-extrabold text-white">{p.nombre}</h3>
                    <p className="text-xs text-gray-400">
                      {p.tipologia} · {p.cliente_nombre || 'Sin cliente'}
                    </p>
                    <div className="pt-2 flex justify-between text-xs font-bold border-t border-white/10">
                      <span>{etapaNorm}</span>
                      <span>
                        {mon} ${Number(p.presupuesto || 0).toLocaleString('es-AR')}
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL NUEVO / EDITAR PROYECTO (CON FORMATO AUTOMÁTICO, CERTIFICACIONES Y REDETERMINACIÓN CAC) */}
      {modalAbierto &&
        montado &&
        createPortal(
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
            <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
              <div className="px-6 pt-5 pb-4 border-b border-gray-800 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {proyectoEditando ? 'Editar Proyecto / Obra' : 'Nuevo Proyecto / Obra'}
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Configuración de comitente, presupuesto, certificaciones y redeterminación
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="text-gray-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={guardarProyecto} className="px-6 py-5 overflow-y-auto space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Código *
                    </label>
                    <input
                      type="text"
                      required
                      value={codigo}
                      onChange={(e) => setCodigo(e.target.value)}
                      className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white font-bold"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Nombre del Proyecto / Obra *
                    </label>
                    <input
                      type="text"
                      required
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Ej. YPF Ezeiza · Remodelación"
                      className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Comitente / Cliente
                    </label>
                    <select
                      value={clienteId}
                      onChange={(e) => setClienteId(e.target.value)}
                      className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white"
                    >
                      <option value="">Sin cliente</option>
                      {clientes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Tipología
                    </label>
                    <input
                      type="text"
                      value={tipologia}
                      onChange={(e) => setTipologia(e.target.value)}
                      className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Superficie (m²)
                    </label>
                    <input
                      type="text"
                      value={superficie}
                      onChange={(e) => setSuperficie(formatearMilesDecimalesInput(e.target.value))}
                      placeholder="Ej. 191"
                      className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                {/* BLOQUE PRESUPUESTO + CERTIFICACIONES + REDETERMINACIONES */}
                <div className="bg-[#141414] border border-gray-800 rounded-xl p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">
                        Moneda e Importe *
                      </label>
                      <div className="flex gap-1.5">
                        <select
                          value={moneda}
                          onChange={(e) => {
                            const m = e.target.value as 'USD' | 'ARS';
                            setMoneda(m);
                            if (m === 'ARS') setRedeterminacionTipo('Índice CAC');
                            else setRedeterminacionTipo('USD');
                          }}
                          className="bg-[#121212] border border-gray-700 rounded-lg px-2.5 py-2 text-xs font-extrabold text-white"
                        >
                          <option value="USD">USD</option>
                          <option value="ARS">ARS</option>
                        </select>
                        <input
                          type="text"
                          value={presupuestoTexto}
                          onChange={(e) =>
                            setPresupuestoTexto(formatearMilesDecimalesInput(e.target.value))
                          }
                          placeholder="Ej. 75.000,00"
                          className="w-full bg-[#121212] border border-gray-700 rounded-lg px-3 py-2 text-xs font-bold text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">
                        Certificaciones
                      </label>
                      <select
                        value={certificaciones}
                        onChange={(e) =>
                          setCertificaciones(e.target.value as 'Quincenales' | 'Mensuales')
                        }
                        className="w-full bg-[#121212] border border-gray-700 rounded-lg px-3 py-2 text-xs font-semibold text-white"
                      >
                        <option value="Quincenales">Quincenales</option>
                        <option value="Mensuales">Mensuales</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">
                        Redeterminaciones
                      </label>
                      <select
                        value={redeterminacionTipo}
                        onChange={(e) =>
                          setRedeterminacionTipo(e.target.value as 'USD' | 'Índice CAC')
                        }
                        className="w-full bg-[#121212] border border-gray-700 rounded-lg px-3 py-2 text-xs font-semibold text-white"
                      >
                        <option value="USD">USD</option>
                        <option value="Índice CAC">Índice CAC</option>
                      </select>
                    </div>
                  </div>

                  {redeterminacionTipo === 'Índice CAC' && (
                    <div className="pt-2 border-t border-gray-800 grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1">
                          Mes y Año Base (Índice General CAMARCO)
                        </label>
                        <select
                          value={cacMesBase}
                          onChange={(e) => cambiarMesCac(e.target.value)}
                          className="w-full bg-[#121212] border border-gray-700 rounded-lg px-3 py-2 text-xs font-bold text-white"
                        >
                          {serieCAC.map((item) => (
                            <option key={item.periodo} value={item.periodo}>
                              {item.periodo} · {item.etiqueta} (
                              {numeroAInputArg(item.valor)})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-xs font-semibold text-gray-300">
                            Costo Construcción CAC ({cacMesBase})
                          </label>
                          <button
                            type="button"
                            onClick={cargarSerieCAC}
                            className="text-[11px] font-bold text-[#EAB308] inline-flex items-center gap-1 cursor-pointer"
                          >
                            <RefreshCw
                              className={`w-3 h-3 ${cargandoCAC ? 'animate-spin' : ''}`}
                            />
                            Actualizar CAMARCO
                          </button>
                        </div>
                        <input
                          type="text"
                          value={cacValorBase}
                          onChange={(e) =>
                            setCacValorBase(formatearMilesDecimalesInput(e.target.value))
                          }
                          className="w-full bg-[#121212] border border-gray-700 rounded-lg px-3 py-2 text-xs font-extrabold text-[#EAB308]"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Responsable
                    </label>
                    <select
                      value={responsable}
                      onChange={(e) => setResponsable(e.target.value)}
                      className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white"
                    >
                      {equipo.map((m) => (
                        <option key={m.id} value={m.nombre}>
                          {m.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Etapa</label>
                    <select
                      value={etapa}
                      onChange={(e) => {
                        const nueva = e.target.value;
                        setEtapa(nueva);
                        setEstado(nueva === 'Entrega Final' ? 'Finalizado' : 'En Curso');
                      }}
                      className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white"
                    >
                      {ETAPAS_OBRA.map((et) => (
                        <option key={et} value={et}>
                          {et}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Estado</label>
                    <select
                      value={etapa === 'Entrega Final' ? 'Finalizado' : estado}
                      onChange={(e) => setEstado(e.target.value)}
                      disabled={etapa === 'Entrega Final'}
                      className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white disabled:opacity-70"
                    >
                      <option value="En Curso">En Curso</option>
                      <option value="Pausado">Pausado</option>
                      <option value="Finalizado">Finalizado</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Inicio Planificado
                    </label>
                    <input
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      className="w-full bg-[#121212] border border-gray-800 rounded-lg px-2.5 py-2 text-xs text-white [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Fin Planificado
                    </label>
                    <input
                      type="date"
                      value={fechaFinPlan}
                      onChange={(e) => setFechaFinPlan(e.target.value)}
                      className="w-full bg-[#121212] border border-gray-800 rounded-lg px-2.5 py-2 text-xs text-white [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Inicio Real
                    </label>
                    <input
                      type="date"
                      value={fechaInicioReal}
                      onChange={(e) => setFechaInicioReal(e.target.value)}
                      className="w-full bg-[#121212] border border-gray-800 rounded-lg px-2.5 py-2 text-xs text-white [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Fin Real
                    </label>
                    <input
                      type="date"
                      value={fechaFinReal}
                      onChange={(e) => setFechaFinReal(e.target.value)}
                      className="w-full bg-[#121212] border border-gray-800 rounded-lg px-2.5 py-2 text-xs text-white [color-scheme:dark]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Ubicación / Google Maps
                    </label>
                    <input
                      type="text"
                      value={ubicacion}
                      onChange={(e) => setUbicacion(e.target.value)}
                      className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Carpeta Google Drive
                    </label>
                    <input
                      type="text"
                      value={driveUrl}
                      onChange={(e) => setDriveUrl(e.target.value)}
                      className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Notas del Proyecto
                  </label>
                  <textarea
                    rows={2}
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-800">
                  <button
                    type="button"
                    onClick={() => setModalAbierto(false)}
                    className="px-4 py-2 rounded-lg text-xs text-gray-300 hover:text-white cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={guardando}
                    className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-5 py-2 rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
                  >
                    {guardando ? 'Guardando...' : 'Guardar Proyecto'}
                  </button>
                </div>
              </form>
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