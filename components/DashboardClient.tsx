"use client";

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ModalTarea from '@/components/ModalTarea';
import ModalPersonalizarEstudio, {
  AparienciaEstudio,
  PORTADA_DEFAULT,
} from '@/components/ModalPersonalizarEstudio';
import { usePreferencias } from '@/components/PreferenciasProvider';
import {
  Plus,
  Image as ImageIcon,
  EyeOff,
  Eye,
  CircleDollarSign,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Check,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

export default function DashboardClient({
  proyectos = [],
  tareas = [],
  movimientos = [],
  visitas = [],
  clientes = [],
  equipo = [],
}: {
  proyectos: any[];
  tareas: any[];
  movimientos: any[];
  visitas: any[];
  clientes: any[];
  equipo: any[];
}) {
  const router = useRouter();
  const { idioma, tr } = usePreferencias();

  // Banner y apariencia personalizable
  const [mostrarBanner, setMostrarBanner] = useState(true);
  const [nombreEstudio, setNombreEstudio] = useState('MB Arquitectura SA');
  const [titularEstudio, setTitularEstudio] = useState('Alejandro Fego');
  const [subtituloEstudio, setSubtituloEstudio] = useState('ARQUITECTO · DISEÑADOR · ARGENTINA');
  const [modalBanner, setModalBanner] = useState(false);
  const [apariencia, setApariencia] = useState<AparienciaEstudio>({
    portadaUrl: PORTADA_DEFAULT,
    logoUrl: '',
    fondoUrl: '',
    desenfoque: 14,
    oscurecimiento: 50,
    rendimiento: 'automatico',
  });

  // Moneda del Dashboard
  const [moneda, setMoneda] = useState<'USD' | 'ARS'>('ARS');

  // Notas rápidas (guardadas en localStorage)
  const [notaRapida, setNotaRapida] = useState('');

  // Agenda semanal
  const [offsetSemanas, setOffsetSemanas] = useState(0);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(
    () => new Date().toISOString().split('T')[0]
  );

  // Modal Tarea compartida
  const [modalTarea, setModalTarea] = useState(false);
  const [tareaEditando, setTareaEditando] = useState<any | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const cargarAjustesLocales = () => {
    try {
      const savedNote = localStorage.getItem('mb_notas_rapidas');
      if (savedNote) setNotaRapida(savedNote);

      const ajustesRaw = localStorage.getItem('mb_ajustes_estudio');
      const ajustes = ajustesRaw ? JSON.parse(ajustesRaw) : null;

      if (ajustes?.nombreEstudio) {
        setNombreEstudio(ajustes.nombreEstudio);
      } else {
        const savedNombre = localStorage.getItem('mb_estudio_nombre');
        if (savedNombre) setNombreEstudio(savedNombre);
      }

      if (ajustes?.titular) {
        setTitularEstudio(ajustes.titular);
      } else {
        const sesionRaw = localStorage.getItem('mb_sesion_usuario');
        if (sesionRaw) {
          const sesion = JSON.parse(sesionRaw);
          if (sesion?.nombre) setTitularEstudio(sesion.nombre);
        }
      }

      const savedSub = localStorage.getItem('mb_estudio_sub');
      if (savedSub) setSubtituloEstudio(savedSub);

      const savedApariencia = localStorage.getItem('mb_apariencia_estudio');
      if (savedApariencia) {
        setApariencia(JSON.parse(savedApariencia));
      }
    } catch {
      // Silencioso
    }
  };

  useEffect(() => {
    cargarAjustesLocales();
    window.addEventListener('mb_ajustes_actualizados', cargarAjustesLocales);
    return () => {
      window.removeEventListener('mb_ajustes_actualizados', cargarAjustesLocales);
    };
  }, []);

  const mostrarToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const actualizarNota = (texto: string) => {
    setNotaRapida(texto);
    try {
      localStorage.setItem('mb_notas_rapidas', texto);
    } catch {
      // Silencioso
    }
  };

  const cambiarPortadaProyecto = (proyectoId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      await supabase
        .from('proyectos')
        .update({ portada_url: String(reader.result || '') })
        .eq('id', proyectoId);
      mostrarToast('Portada del proyecto actualizada');
      router.refresh();
    };
    reader.readAsDataURL(file);
  };

  const formatearFechaCorta = (iso: string) => {
    if (!iso) return '—';
    const [y, m, d] = String(iso).split('T')[0].split('-');
    if (!y || !m || !d) return iso;
    return `${d}/${m}/${y}`;
  };

  const toggleCompletarTarea = async (t: any) => {
    const est = String(t.estado || '').toLowerCase();
    const nuevo = est === 'finalizado' || est === 'completada' ? 'Por Realizar' : 'Finalizado';
    await supabase.from('tareas').update({ estado: nuevo }).eq('id', t.id);
    mostrarToast(`Tarea marcada como ${nuevo}`);
    router.refresh();
  };

  const convertirNotaEnTarea = async () => {
    const texto = notaRapida.trim();
    if (!texto) {
      setTareaEditando(null);
      setModalTarea(true);
      return;
    }
    const primeraLinea = texto.split('\n')[0].replace(/^[•\-*]\s*/, '').slice(0, 120);
    const { error } = await supabase.from('tareas').insert([
      {
        titulo: primeraLinea,
        descripcion: texto,
        estado: 'Por Realizar',
        prioridad: 'Media',
        rubro: 'Proyecto y Diseño',
        responsable: equipo[0]?.nombre || titularEstudio,
      },
    ]);
    if (!error) {
      actualizarNota('');
      mostrarToast('Nota convertida en tarea');
      router.refresh();
    } else {
      alert('Error al convertir nota: ' + error.message);
    }
  };

  // Métricas de Proyectos
  const proyectosActivos = useMemo(
    () => proyectos.filter((p) => String(p.estado || '').toLowerCase() !== 'finalizado'),
    [proyectos]
  );

  const totalM2 = useMemo(() => {
    return proyectosActivos.reduce((acc, p) => {
      const num = parseFloat(String(p.superficie || '0').replace(/[^0-9.,]/g, '').replace(',', '.'));
      return acc + (isNaN(num) ? 0 : num);
    }, 0);
  }, [proyectosActivos]);

  const proyectosPorEstado = useMemo(() => {
    let obra = 0;
    let diseno = 0;
    let presupuesto = 0;
    for (const p of proyectosActivos) {
      const e = String(p.estado || '').toLowerCase();
      if (e.includes('obra')) obra++;
      else if (e.includes('presupuesto') || e.includes('pausa')) presupuesto++;
      else diseno++;
    }
    return { obra, diseno, presupuesto, total: proyectosActivos.length };
  }, [proyectosActivos]);

  // Métricas de Tareas
  const statsTareas = useMemo(() => {
    const hoyIso = new Date().toISOString().split('T')[0];
    let atrasadas = 0;
    let porRealizar = 0;
    let enCurso = 0;
    let completadas = 0;
    const listaPendientes: any[] = [];

    for (const t of tareas) {
      const est = String(t.estado || '').toLowerCase();
      if (est === 'finalizado' || est === 'completada') {
        completadas++;
      } else {
        listaPendientes.push(t);
        if (est === 'en curso') enCurso++;
        else porRealizar++;
        if (t.fecha_vencimiento && String(t.fecha_vencimiento).split('T')[0] < hoyIso) {
          atrasadas++;
        }
      }
    }

    return {
      atrasadas,
      porRealizar,
      enCurso,
      completadas,
      pendientes: listaPendientes.length,
      listaPendientes,
      total: tareas.length,
    };
  }, [tareas]);

  // Métricas Financieras (USD o ARS)
  const finanzasResumen = useMemo(() => {
    let ingresos = 0;
    let pendientes = 0;
    let gastos = 0;

    for (const m of movimientos) {
      const mon = String(m.moneda || 'USD').toUpperCase();
      if (mon !== moneda) continue;

      const imp = Number(m.importe ?? 0) || Number(m.monto ?? 0);
      const tipo = String(m.tipo || '').toLowerCase();
      const est = String(m.estado || '').toLowerCase();
      const esEg = tipo === 'egreso' || tipo === 'gasto' || tipo === 'compra';
      const esAbonado =
        est === 'abonado' || est === 'cobrado' || est === 'pagado' || est === 'finalizado';

      if (esEg) {
        gastos += imp;
      } else if (esAbonado) {
        ingresos += imp;
      } else {
        pendientes += imp;
      }
    }

    const maxVal = Math.max(1, ingresos, pendientes, gastos);
    return { ingresos, pendientes, gastos, maxVal };
  }, [movimientos, moneda]);

  // Agenda de la semana (Lunes a Domingo, localizada según idioma)
  const semanaActual = useMemo(() => {
    const hoy = new Date();
    const diaSemana = hoy.getDay();
    const diffLunes = diaSemana === 0 ? -6 : 1 - diaSemana;
    const lunes = new Date(
      hoy.getFullYear(),
      hoy.getMonth(),
      hoy.getDate() + diffLunes + offsetSemanas * 7
    );

    const nombresDias =
      idioma === 'EN'
        ? ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
        : idioma === 'PT'
        ? ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM']
        : ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

    const locale = idioma === 'EN' ? 'en-US' : idioma === 'PT' ? 'pt-BR' : 'es-AR';

    const dias = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      const cant = visitas.filter((v) => String(v.fecha || '').startsWith(iso)).length;
      return {
        label: nombresDias[i],
        numero: d.getDate(),
        iso,
        cant,
      };
    });

    const domingo = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + 6);
    const fmt = (d: Date) =>
      `${d.getDate()} ${d
        .toLocaleDateString(locale, { month: 'short' })
        .replace('.', '')
        .replace(/^\w/, (c) => c.toUpperCase())}`;

    return { dias, rango: `${fmt(lunes)} – ${fmt(domingo)}` };
  }, [offsetSemanas, visitas, idioma]);

  const visitasDelDia = useMemo(() => {
    return visitas.filter((v) => String(v.fecha || '').startsWith(fechaSeleccionada));
  }, [visitas, fechaSeleccionada]);

  const obtenerNombreCliente = (clienteId: any) => {
    const c = clientes.find((cl) => String(cl.id) === String(clienteId));
    return c?.nombre || '—';
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white p-8 font-sans space-y-6">
      {/* 1. BANNER SUPERIOR DEL ESTUDIO */}
      {mostrarBanner ? (
        <div
          className="relative rounded-2xl overflow-hidden border border-gray-800 h-44 flex items-end p-6 shadow-2xl bg-cover bg-center"
          style={{
            backgroundImage: apariencia.portadaUrl
              ? `url(${apariencia.portadaUrl})`
              : 'linear-gradient(135deg, #27272a 0%, #18181b 100%)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/30" />

          <div className="absolute top-3.5 right-3.5 flex items-center gap-2 z-10">
            <button
              type="button"
              onClick={() => setModalBanner(true)}
              className="bg-black/70 hover:bg-black border border-gray-700 text-white px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ImageIcon className="w-3.5 h-3.5 text-[#EAB308]" /> {tr('personalizar')}
            </button>
            <button
              type="button"
              onClick={() => setMostrarBanner(false)}
              className="bg-black/70 hover:bg-black border border-gray-700 text-gray-300 hover:text-white px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <EyeOff className="w-3.5 h-3.5" /> {tr('ocultar')}
            </button>
          </div>

          <div className="relative z-10 flex items-center gap-4">
            {apariencia.logoUrl ? (
              <img
                src={apariencia.logoUrl}
                alt="Logo"
                className="w-12 h-12 rounded-full object-cover bg-white shadow-lg border-2 border-[#EAB308]"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-white text-black font-black text-base flex items-center justify-center shadow-lg border-2 border-[#EAB308]">
                MB
              </div>
            )}
            <div>
              <div className="text-[10px] font-extrabold tracking-widest uppercase text-[#EAB308]">
                {subtituloEstudio}
              </div>
              <div className="text-2xl font-extrabold text-white tracking-tight">
                {nombreEstudio}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setMostrarBanner(true)}
            className="bg-[#1A1A1A] hover:bg-gray-800 border border-gray-800 text-gray-300 px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-[#EAB308]" /> {tr('mostrarPortada')}
          </button>
        </div>
      )}

      {/* 2. CABECERA PANEL DE CONTROL */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          {tr('panelControl')} · {titularEstudio}
        </h1>

        <div className="flex items-center gap-2.5">
          <Link
            href="/proyectos"
            className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-4 py-2.5 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 transition-colors shadow-[0_0_20px_rgba(234,179,8,0.2)]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" /> {tr('nuevoProyecto')}
          </Link>
          <button
            type="button"
            onClick={() => {
              setTareaEditando(null);
              setModalTarea(true);
            }}
            className="bg-[#1A1A1A] hover:bg-gray-800 border border-gray-800 text-white px-4 py-2.5 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> {tr('nuevaTarea')}
          </button>
        </div>
      </div>

      {/* 3. 4 TARJETAS KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/proyectos"
          className="bg-[#EAB308] hover:bg-[#CA9A04] text-black rounded-2xl p-5 shadow-xl transition-colors"
        >
          <div className="text-xs font-bold opacity-80">{tr('proyectosActivos')}</div>
          <div className="text-3xl font-black mt-1.5">{proyectosActivos.length}</div>
          <div className="text-xs font-semibold opacity-75 mt-1">
            {totalM2.toLocaleString('es-AR')} m²
          </div>
        </Link>

        <Link
          href="/tareas"
          className="bg-[#1A1A1A] hover:bg-[#202020] border border-gray-800 rounded-2xl p-5 shadow-xl transition-colors"
        >
          <div className="text-xs font-semibold text-gray-400">{tr('tareasPendientes')}</div>
          <div className="text-3xl font-extrabold text-white mt-1.5">{statsTareas.pendientes}</div>
          <div className="text-xs text-gray-400 mt-1">
            {statsTareas.atrasadas} {tr('atrasadas')}
          </div>
        </Link>

        <Link
          href="/finanzas"
          className="bg-[#1A1A1A] hover:bg-[#202020] border border-gray-800 rounded-2xl p-5 shadow-xl transition-colors"
        >
          <div className="text-xs font-semibold text-gray-400">{tr('cobrado')}</div>
          <div className="text-3xl font-extrabold text-white mt-1.5">
            {moneda} $
            {finanzasResumen.ingresos.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-gray-400 mt-1">{tr('honorarios')}</div>
        </Link>

        <Link
          href="/finanzas"
          className="bg-[#1A1A1A] hover:bg-[#202020] border border-gray-800 rounded-2xl p-5 shadow-xl transition-colors"
        >
          <div className="text-xs font-semibold text-gray-400">{tr('porCobrar')}</div>
          <div className="text-3xl font-extrabold text-white mt-1.5">
            {moneda} $
            {finanzasResumen.pendientes.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-gray-400 mt-1">{tr('pendiente')}</div>
        </Link>
      </div>

      {/* 4. FILA MEDIA: FINANZAS + ESTADO DE PROYECTOS Y ENTREGAS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* FINANZAS */}
        <div className="lg:col-span-7 bg-[#1A1A1A] border border-gray-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <CircleDollarSign className="w-4 h-4 text-[#EAB308]" />
                {tr('finanzas')} ({moneda})
              </h2>

              <div className="bg-[#121212] border border-gray-800 rounded-xl p-1 inline-flex items-center gap-1">
                {(['USD', 'ARS'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMoneda(m)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                      moneda === m
                        ? 'bg-[#EAB308] text-black'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Gráfico de barras */}
            <div className="bg-[#141414] border border-gray-800/80 rounded-xl p-5 mb-4">
              <div className="h-40 flex items-end justify-around gap-6 border-b border-gray-800 pb-3 relative">
                {[
                  { label: tr('ingresos'), val: finanzasResumen.ingresos, color: 'bg-emerald-500' },
                  { label: tr('pendientes'), val: finanzasResumen.pendientes, color: 'bg-[#EAB308]' },
                  { label: tr('gastos'), val: finanzasResumen.gastos, color: 'bg-rose-500' },
                ].map((bar) => {
                  const pct =
                    bar.val > 0 ? Math.max(8, Math.round((bar.val / finanzasResumen.maxVal) * 100)) : 2;
                  return (
                    <div key={bar.label} className="flex flex-col items-center gap-2 w-24 h-full justify-end">
                      <span className="text-xs font-bold text-gray-200">
                        {bar.val.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                      </span>
                      <div
                        className={`w-12 rounded-t-lg transition-all ${bar.color}`}
                        style={{ height: `${pct}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-around text-xs font-semibold text-gray-400 pt-2.5">
                <span>{tr('ingresos')}</span>
                <span>{tr('pendientes')}</span>
                <span>{tr('gastos')}</span>
              </div>
            </div>

            {/* Resumen numérico */}
            <div className="bg-[#141414] border border-gray-800/80 rounded-xl p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">{tr('ingresosCobrados')}</span>
                <span className="font-bold text-white">
                  {moneda} ${finanzasResumen.ingresos.toLocaleString('es-AR')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">{tr('pendientesCobro')}</span>
                <span className="font-bold text-white">
                  {moneda} ${finanzasResumen.pendientes.toLocaleString('es-AR')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">{tr('gastosPeriodo')}</span>
                <span className="font-bold text-white">
                  {moneda} ${finanzasResumen.gastos.toLocaleString('es-AR')}
                </span>
              </div>
            </div>
          </div>

          <Link
            href="/finanzas"
            className="mt-4 pt-3 border-t border-gray-800/80 flex justify-between items-center text-xs font-bold text-gray-300 hover:text-[#EAB308]"
          >
            <span>{tr('abrirFinanzas')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* ESTADO DE PROYECTOS Y ENTREGAS */}
        <div className="lg:col-span-5 bg-[#1A1A1A] border border-gray-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-white mb-5">{tr('estadoProyectos')}</h2>

            {/* Donut + Leyenda */}
            <div className="flex items-center gap-6 mb-6">
              <div className="relative w-28 h-28 flex-shrink-0">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke="#2a2a2a"
                    strokeWidth="4"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke="#64748b"
                    strokeWidth="4"
                    strokeDasharray="88 100"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-extrabold text-white">
                    {proyectosPorEstado.total}
                  </span>
                  <span className="text-[10px] text-gray-400">{tr('activos')}</span>
                </div>
              </div>

              <div className="flex-1 space-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="inline-flex items-center gap-2 text-gray-300">
                    <span className="w-2 h-2 rounded-full bg-[#EAB308]" /> {tr('ejecucionObra')}
                  </span>
                  <span className="font-bold text-white">{proyectosPorEstado.obra}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="inline-flex items-center gap-2 text-gray-300">
                    <span className="w-2 h-2 rounded-full bg-slate-400" /> {tr('enDiseno')}
                  </span>
                  <span className="font-bold text-white">{proyectosPorEstado.diseno}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="inline-flex items-center gap-2 text-gray-300">
                    <span className="w-2 h-2 rounded-full bg-gray-400" /> {tr('presupuesto')}
                  </span>
                  <span className="font-bold text-white">{proyectosPorEstado.presupuesto}</span>
                </div>
              </div>
            </div>

            {/* Seguimiento de tareas */}
            <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">
              <span>{tr('seguimientoTareas')}</span>
              <span>
                {statsTareas.total} {tr('totales')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-[#121212] border border-gray-800 rounded-xl px-3.5 py-2.5 flex justify-between items-center text-xs">
                <span className="text-gray-300">{tr('atrasada')}s</span>
                <span className="font-bold text-white">{statsTareas.atrasadas}</span>
              </div>
              <div className="bg-[#121212] border border-gray-800 rounded-xl px-3.5 py-2.5 flex justify-between items-center text-xs">
                <span className="text-gray-300">{tr('enCurso')}</span>
                <span className="font-bold text-white">{statsTareas.enCurso}</span>
              </div>
              <div className="bg-[#121212] border border-gray-800 rounded-xl px-3.5 py-2.5 flex justify-between items-center text-xs">
                <span className="text-gray-300">{tr('porRealizar')}</span>
                <span className="font-bold text-white">{statsTareas.porRealizar}</span>
              </div>
              <div className="bg-[#121212] border border-gray-800 rounded-xl px-3.5 py-2.5 flex justify-between items-center text-xs">
                <span className="text-gray-300">{tr('completadas')}</span>
                <span className="font-bold text-white">{statsTareas.completadas}</span>
              </div>
            </div>
          </div>

          <Link
            href="/proyectos"
            className="mt-4 pt-3 border-t border-gray-800/80 text-xs font-bold text-gray-300 hover:text-[#EAB308]"
          >
            {tr('abrirProyectos')}
          </Link>
        </div>
      </div>

      {/* 5. FILA INFERIOR (3 COLUMNAS): TAREAS + NOTAS + AGENDA SEMANAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* TAREAS PENDIENTES */}
        <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                {tr('tareasPendientes')}
                <span className="px-2 py-0.5 rounded-md bg-gray-800 text-xs text-gray-200">
                  {statsTareas.pendientes}
                </span>
              </h2>
              <Link href="/tareas" className="text-xs text-gray-300 hover:text-[#EAB308]">
                {tr('abrirTareas')}
              </Link>
            </div>

            <div className="space-y-3">
              {statsTareas.listaPendientes.length === 0 ? (
                <p className="text-xs text-gray-400 py-6 text-center">
                  {tr('sinTareasPendientes')}
                </p>
              ) : (
                statsTareas.listaPendientes.slice(0, 4).map((t) => {
                  const hoyIso = new Date().toISOString().split('T')[0];
                  const atrasada =
                    t.fecha_vencimiento && String(t.fecha_vencimiento).split('T')[0] < hoyIso;

                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        setTareaEditando(t);
                        setModalTarea(true);
                      }}
                      className="flex items-start justify-between gap-2 pb-3 border-b border-gray-800/70 last:border-0 cursor-pointer hover:opacity-90"
                    >
                      <div className="flex items-start gap-2.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCompletarTarea(t);
                          }}
                          className="mt-0.5 w-4 h-4 rounded border border-gray-600 hover:border-[#EAB308] flex items-center justify-center flex-shrink-0 cursor-pointer"
                        >
                          <Check className="w-2.5 h-2.5 opacity-0 hover:opacity-100 text-[#EAB308]" />
                        </button>
                        <div>
                          <div className="text-xs font-bold text-white leading-snug">
                            {t.titulo}
                          </div>
                          <div className="text-[11px] text-gray-400 mt-0.5">
                            {t.proyecto_nombre || 'General'} ·{' '}
                            <span className={atrasada ? 'text-rose-400 font-semibold' : ''}>
                              {formatearFechaCorta(t.fecha_vencimiento)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {atrasada && (
                          <span className="px-2 py-0.5 rounded bg-rose-950/80 border border-rose-800/60 text-rose-400 text-[10px] font-bold">
                            {tr('atrasada')}
                          </span>
                        )}
                        <span className="text-[10px] font-semibold text-gray-400">
                          {t.prioridad || 'Media'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setTareaEditando(null);
              setModalTarea(true);
            }}
            className="mt-4 pt-3 border-t border-gray-800/80 text-left text-xs font-bold text-gray-300 hover:text-[#EAB308] cursor-pointer"
          >
            + {tr('nuevaTarea')}
          </button>
        </div>

        {/* NOTAS RÁPIDAS Y RECORDATORIOS */}
        <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-white mb-3">{tr('notasRapidas')}</h2>
            <textarea
              rows={6}
              value={notaRapida}
              onChange={(e) => actualizarNota(e.target.value)}
              placeholder={tr('notasPlaceholder')}
              className="w-full bg-[#121212] border border-gray-800 rounded-xl p-3.5 text-xs text-gray-200 placeholder-gray-500 resize-none focus:outline-none focus:border-gray-700"
            />
          </div>

          <div className="mt-4 pt-3 border-t border-gray-800/80 flex justify-end">
            <button
              type="button"
              onClick={convertirNotaEnTarea}
              className="text-xs font-bold text-[#EAB308] hover:underline cursor-pointer"
            >
              {tr('convertirTarea')}
            </button>
          </div>
        </div>

        {/* AGENDA DE LA SEMANA */}
        <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start gap-2 mb-4">
              <div>
                <h2 className="text-sm font-bold text-white">{tr('agendaSemana')}</h2>
                <div className="text-[11px] text-gray-400 mt-0.5">{semanaActual.rango}</div>
              </div>

              <div className="inline-flex items-center gap-1 bg-[#121212] border border-gray-800 rounded-xl px-1.5 py-1 text-xs">
                <button
                  type="button"
                  onClick={() => setOffsetSemanas((s) => s - 1)}
                  className="p-1 text-gray-400 hover:text-white cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOffsetSemanas(0);
                    setFechaSeleccionada(new Date().toISOString().split('T')[0]);
                  }}
                  className="px-1.5 font-bold text-gray-200 hover:text-white cursor-pointer"
                >
                  {tr('hoy')}
                </button>
                <button
                  type="button"
                  onClick={() => setOffsetSemanas((s) => s + 1)}
                  className="p-1 text-gray-400 hover:text-white cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 7 días */}
            <div className="grid grid-cols-7 gap-1.5 mb-4">
              {semanaActual.dias.map((d) => {
                const seleccionado = fechaSeleccionada === d.iso;
                return (
                  <button
                    key={d.iso}
                    type="button"
                    onClick={() => setFechaSeleccionada(d.iso)}
                    className={`rounded-xl py-2 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer border ${
                      seleccionado
                        ? 'bg-[#EAB308] text-black border-[#EAB308] shadow'
                        : 'bg-[#121212] text-gray-300 border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <span className="text-[9px] font-bold">{d.label}</span>
                    <span className="text-xs font-extrabold">{d.numero}</span>
                    <span
                      className={`text-[10px] font-bold ${
                        seleccionado ? 'text-black/80' : 'text-gray-500'
                      }`}
                    >
                      {d.cant}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Visitas del día seleccionado */}
            <div className="bg-[#121212] border border-gray-800 rounded-xl p-3.5 min-h-[56px] flex flex-col justify-center">
              {visitasDelDia.length === 0 ? (
                <p className="text-xs text-gray-400 text-center">
                  {tr('sinVisitasDia')} {formatearFechaCorta(fechaSeleccionada)}.
                </p>
              ) : (
                <div className="space-y-2">
                  {visitasDelDia.map((v) => (
                    <div key={v.id} className="flex justify-between items-center text-xs">
                      <span className="font-bold text-white truncate">
                        {v.titulo || v.motivo || 'Visita'}
                      </span>
                      <span className="text-[#EAB308] font-semibold flex-shrink-0">
                        {v.hora || '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Link
            href="/agenda"
            className="mt-4 pt-3 border-t border-gray-800/80 text-xs font-bold text-[#EAB308] hover:underline"
          >
            {tr('abrirVisitas')}
          </Link>
        </div>
      </div>

      {/* 6. PROYECTOS EN CURSO */}
      <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-bold text-white">{tr('proyectosEnCurso')}</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-[#EAB308]/15 border border-[#EAB308]/40 text-[#EAB308] text-xs font-bold">
              {proyectosActivos.length} {tr('activos').toLowerCase()}
            </span>
          </div>

          <Link href="/proyectos" className="text-xs font-bold text-gray-300 hover:text-[#EAB308]">
            {tr('verTodosProyectos')} ({proyectos.length}) →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {proyectosActivos.map((p) => (
            <div
              key={p.id}
              className="bg-[#121212] border border-gray-800 hover:border-gray-700 rounded-2xl overflow-hidden shadow-lg flex flex-col justify-between transition-colors"
            >
              <div>
                <div
                  className="h-32 bg-cover bg-center relative"
                  style={{
                    backgroundImage: p.portada_url
                      ? `url(${p.portada_url})`
                      : 'linear-gradient(135deg, #27272a 0%, #18181b 100%)',
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/30" />

                  <label className="absolute top-2.5 right-2.5 bg-black/70 hover:bg-black border border-gray-700 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer">
                    <ImageIcon className="w-3 h-3 text-[#EAB308]" /> {tr('portada')}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => cambiarPortadaProyecto(p.id, e)}
                      className="hidden"
                    />
                  </label>

                  <span className="absolute bottom-2.5 left-2.5 bg-black/80 border border-[#EAB308]/50 text-[#EAB308] px-2 py-0.5 rounded text-[10px] font-extrabold">
                    {p.codigo}
                  </span>
                </div>

                <div className="p-4">
                  <span className="inline-block px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-700/50 text-cyan-300 text-[10px] font-semibold mb-2">
                    {p.estado || tr('enDiseno')}
                  </span>
                  <h3 className="text-sm font-extrabold text-white">{p.nombre}</h3>
                  <div className="text-xs text-gray-300 mt-1">
                    {obtenerNombreCliente(p.cliente_id)}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    {p.responsable || '—'}
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 border-t border-gray-800/80 flex justify-between items-center text-[11px]">
                <span className="text-gray-400 truncate">
                  {tr('etapa')}{' '}
                  <strong className="text-white">
                    {p.etapa_actual || 'Relevamiento y Concepto'}
                  </strong>
                </span>
                <Link
                  href={`/proyectos/${encodeURIComponent(p.codigo)}`}
                  className="w-6 h-6 rounded-full bg-[#1A1A1A] hover:bg-[#EAB308] text-gray-300 hover:text-black flex items-center justify-center transition-colors flex-shrink-0"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 7. PIE DE PÁGINA */}
      <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl px-5 py-3.5 flex flex-wrap justify-between items-center gap-3 text-xs text-gray-400">
        <span className="inline-flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#EAB308]" /> {tr('bovedaPrivada')}
        </span>
        <span>
          {tr('appCreadaPor')} <strong className="text-[#EAB308]">claridadyaccion.com</strong>
        </span>
      </div>

      {/* MODAL PERSONALIZAR PORTADA, LOGO Y FONDO */}
      <ModalPersonalizarEstudio
        abierto={modalBanner}
        onClose={() => setModalBanner(false)}
        nombreEstudio={nombreEstudio}
        subtituloEstudio={subtituloEstudio}
        valoresIniciales={apariencia}
        onGuardar={(nuevos) => {
          setApariencia(nuevos);
          try {
            localStorage.setItem('mb_apariencia_estudio', JSON.stringify(nuevos));
            document.documentElement.setAttribute(
              'data-con-fondo',
              nuevos.fondoUrl && nuevos.rendimiento !== 'liviano' ? 'true' : 'false'
            );
            window.dispatchEvent(new Event('mb_apariencia_updated'));
          } catch {
            // Silencioso
          }
          mostrarToast('Portada, logo y fondo actualizados');
        }}
      />

      {/* MODAL COMPARTIDO: NUEVA / EDITAR TAREA */}
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

      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#161616] border border-gray-700/80 shadow-2xl rounded-xl px-5 py-3.5 flex items-center gap-3 z-50">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-semibold text-white">{toast}</span>
        </div>
      )}
    </div>
  );
}