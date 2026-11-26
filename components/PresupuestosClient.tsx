"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { moverAPapelera } from '@/lib/papelera';
import {
  TONOS_ALARMA,
  reproducirSonidoAlarmaVisita,
  lanzarNotificacionSistema,
} from '@/components/ModalVisita';
import VisorArchivoModal from '@/components/VisorArchivoModal';
import {
  Plus,
  Search,
  List,
  Columns,
  Calendar as CalendarIcon,
  Flag,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Edit3,
  Trash2,
  X,
  CheckCircle2,
  User,
  Upload,
  Link2,
  FileText,
  Loader2,
  Eye,
  Bell,
  Volume2,
} from 'lucide-react';

export const ESTADOS_PRESUPUESTO = [
  'Pendiente',
  'En proceso',
  'Enviado',
  'Aceptado',
  'Rechazado',
] as const;

export const PRIORIDADES_PRESUPUESTO = ['Urgente', 'Alta', 'Normal', 'Baja'] as const;

export const TIPOLOGIAS_OBRA = [
  'Vivienda Unifamiliar',
  'Vivienda Multifamiliar',
  'Estación de Servicio',
  'Local Comercial',
  'Oficinas / Corporativo',
  'Industrial / Galpón',
  'Gastronomía / Hotel',
  'Remodelación / Reforma',
  'Interiorismo',
  'Urbanismo / Exterior',
  'Otro',
] as const;

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

function estiloEstado(estado: string) {
  switch (estado) {
    case 'Pendiente':
      return {
        badge: 'bg-amber-950/75 border-amber-700/60 text-amber-300',
        dot: 'bg-amber-400',
        bar: '#F59E0B',
      };
    case 'En proceso':
      return {
        badge: 'bg-cyan-950/75 border-cyan-700/60 text-cyan-300',
        dot: 'bg-cyan-400',
        bar: '#06B6D4',
      };
    case 'Enviado':
      return {
        badge: 'bg-indigo-950/75 border-indigo-700/60 text-indigo-300',
        dot: 'bg-indigo-400',
        bar: '#6366F1',
      };
    case 'Aceptado':
      return {
        badge: 'bg-emerald-950/75 border-emerald-700/60 text-emerald-300',
        dot: 'bg-emerald-400',
        bar: '#10B981',
      };
    case 'Rechazado':
      return {
        badge: 'bg-rose-950/75 border-rose-700/60 text-rose-300',
        dot: 'bg-rose-400',
        bar: '#F43F5E',
      };
    default:
      return {
        badge: 'bg-gray-800 border-gray-700 text-gray-200',
        dot: 'bg-gray-400',
        bar: '#9CA3AF',
      };
  }
}

function estiloPrioridad(prioridad: string) {
  switch (prioridad) {
    case 'Urgente':
      return { color: 'text-rose-400', fill: '#FB7185' };
    case 'Alta':
      return { color: 'text-amber-400', fill: '#FBBF24' };
    case 'Normal':
      return { color: 'text-blue-400', fill: '#60A5FA' };
    default:
      return { color: 'text-gray-400', fill: '#9CA3AF' };
  }
}

function obtenerIniciales(nombre: string) {
  return String(nombre || '?')
    .replace(/^Arq\.\s*/i, '')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatearMilesDecimales(valorCrudo: string): string {
  const limpio = valorCrudo.replace(/[^\d,]/g, '');
  if (!limpio) return '';
  const partes = limpio.split(',');
  const enteros = partes[0].replace(/^0+(?=\d)/, '');
  const conPuntos = enteros.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (partes.length > 1) return `${conPuntos || '0'},${partes[1].slice(0, 2)}`;
  return conPuntos;
}

function parsearNum(valor: string | number): number {
  if (typeof valor === 'number') return valor;
  const s = String(valor || '').trim();
  if (!s) return 0;
  return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
}

function formatearFechaCorta(iso?: string | null) {
  if (!iso) return '—';
  const [y, m, d] = String(iso).split('T')[0].split('-');
  if (!y || !m || !d) return String(iso);
  return `${d}/${m}/${y}`;
}

export default function PresupuestosClient({
  presupuestosIniciales = [],
  clientes = [],
  equipo = [],
}: {
  presupuestosIniciales: any[];
  clientes?: any[];
  equipo?: any[];
}) {
  const router = useRouter();
  const [montado, setMontado] = useState(false);
  const [presupuestos, setPresupuestos] = useState<any[]>(presupuestosIniciales);

  const [vista, setVista] = useState<'lista' | 'kanban' | 'cronograma'>('lista');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [filtroPrioridad, setFiltroPrioridad] = useState('Todas');
  const [filtroAsignado, setFiltroAsignado] = useState('Todos');

  const [escalaCrono, setEscalaCrono] = useState<
    'Semana' | 'Mes' | 'Trimestre' | 'Semestre' | 'Año'
  >('Semestre');
  const [offsetCrono, setOffsetCrono] = useState(0);

  const [dropAbierto, setDropAbierto] = useState<
    | null
    | 'filtroEstado'
    | 'filtroPrioridad'
    | 'filtroAsignado'
    | 'cliente'
    | 'tipologia'
    | 'moneda'
    | 'persona'
    | 'prioridad'
    | 'estado'
  >(null);

  const refBarraFiltros = useRef<HTMLDivElement>(null);
  const refModalForm = useRef<HTMLFormElement>(null);

  const [visorArchivo, setVisorArchivo] = useState<{ url: string; titulo: string } | null>(null);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<any | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [subiendoPdf, setSubiendoPdf] = useState(false);

  const [codigo, setCodigo] = useState('');
  const [titulo, setTitulo] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [tipologia, setTipologia] = useState<string>(TIPOLOGIAS_OBRA[0]);
  const [moneda, setMoneda] = useState<'USD' | 'ARS'>('USD');
  const [montoTexto, setMontoTexto] = useState('');
  const [asignadoNombre, setAsignadoNombre] = useState('');
  const [fechaLlegada, setFechaLlegada] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaLimite, setFechaLimite] = useState('');
  const [prioridad, setPrioridad] = useState<string>('Normal');
  const [estado, setEstado] = useState<string>('Pendiente');
  const [archivoUrl, setArchivoUrl] = useState('');
  const [archivoNombre, setArchivoNombre] = useState('');
  const [notas, setNotas] = useState('');

  const [alarmaActiva, setAlarmaActiva] = useState(false);
  const [alarmaFecha, setAlarmaFecha] = useState('');
  const [alarmaHora, setAlarmaHora] = useState('09:00');
  const [alarmaTono, setAlarmaTono] = useState<string>('Campana Suave');
  const [alarmaVolumen, setAlarmaVolumen] = useState<number>(80);
  const [alarmaSonando, setAlarmaSonando] = useState<any | null>(null);

  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setMontado(true);
  }, []);

  useEffect(() => {
    setPresupuestos(presupuestosIniciales);
  }, [presupuestosIniciales]);

  // Monitor en tiempo real de alarmas de Presupuestos
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

      for (const p of presupuestos) {
        if (!p.alarma_activa || !p.alarma_fecha || !p.alarma_hora) continue;
        const claveDisparo = `mb_alarma_pre_${p.id}_${p.alarma_fecha}_${p.alarma_hora}`;
        if (localStorage.getItem(claveDisparo)) continue;

        if (
          p.alarma_fecha < fechaActual ||
          (p.alarma_fecha === fechaActual && p.alarma_hora <= horaActual)
        ) {
          localStorage.setItem(claveDisparo, '1');
          setAlarmaSonando(p);
          break;
        }
      }
    };

    revisarAlarmas();
    const timer = setInterval(revisarAlarmas, 5000);
    return () => clearInterval(timer);
  }, [presupuestos]);

  // Bucle sonoro continuo + notificación de Windows por encima de cualquier ventana
  useEffect(() => {
    if (!alarmaSonando) return;

    const tono = alarmaSonando.alarma_tono || 'Campana Suave';
    const vol =
      typeof alarmaSonando.alarma_volumen === 'number' ? alarmaSonando.alarma_volumen : 80;

    reproducirSonidoAlarmaVisita(tono, vol);
    lanzarNotificacionSistema(
      '🔔 Recordatorio de Presupuesto',
      `${alarmaSonando.codigo} · ${alarmaSonando.titulo} (${alarmaSonando.alarma_hora} hs)`
    );

    const loopSonido = setInterval(() => {
      reproducirSonidoAlarmaVisita(tono, vol);
    }, 2200);

    return () => clearInterval(loopSonido);
  }, [alarmaSonando]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const dentroFiltros = refBarraFiltros.current?.contains(target);
      const dentroModal = refModalForm.current?.contains(target);
      if (!dentroFiltros && !dentroModal) {
        setDropAbierto(null);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const mostrarToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const generarCodigo = () => {
    const anio = new Date().getFullYear();
    const nums = presupuestos.map((p) => {
      const m = String(p.codigo || '').match(/(\d+)$/);
      return m ? parseInt(m[1], 10) : 0;
    });
    const sig = (nums.length > 0 ? Math.max(...nums) : 0) + 1;
    return `PRE-${anio}-${String(sig).padStart(2, '0')}`;
  };

  const abrirNuevo = () => {
    const hoy = new Date().toISOString().split('T')[0];
    setEditando(null);
    setDropAbierto(null);
    setCodigo(generarCodigo());
    setTitulo('');
    setClienteId('');
    setTipologia(TIPOLOGIAS_OBRA[0]);
    setMoneda('USD');
    setMontoTexto('');
    setAsignadoNombre(equipo[0]?.nombre || 'Alejandro Fego');
    setFechaLlegada(hoy);
    setFechaInicio(hoy);
    setFechaLimite('');
    setPrioridad('Normal');
    setEstado('Pendiente');
    setArchivoUrl('');
    setArchivoNombre('');
    setNotas('');
    setAlarmaActiva(false);
    setAlarmaFecha(hoy);
    setAlarmaHora('09:00');
    setAlarmaTono('Campana Suave');
    setAlarmaVolumen(80);
    setModalAbierto(true);
  };

  const abrirEditar = (p: any) => {
    setEditando(p);
    setDropAbierto(null);
    setCodigo(p.codigo || '');
    setTitulo(p.titulo || '');
    setClienteId(p.cliente_id ? String(p.cliente_id) : '');
    setTipologia(p.tipologia || TIPOLOGIAS_OBRA[0]);
    setMoneda(String(p.moneda || 'USD').toUpperCase() === 'ARS' ? 'ARS' : 'USD');
    const m = Number(p.monto_estimado || 0);
    setMontoTexto(
      m > 0
        ? m.toLocaleString('es-AR', {
            minimumFractionDigits: m % 1 === 0 ? 0 : 2,
            maximumFractionDigits: 2,
          })
        : ''
    );
    setAsignadoNombre(p.asignado_nombre || '');
    setFechaLlegada(p.fecha_llegada || '');
    setFechaInicio(p.fecha_inicio || '');
    setFechaLimite(p.fecha_limite || '');
    setPrioridad(p.prioridad || 'Normal');
    setEstado(p.estado || 'Pendiente');
    setArchivoUrl(p.archivo_url || '');
    setArchivoNombre(p.archivo_nombre || '');
    setNotas(p.notas || '');
    setAlarmaActiva(Boolean(p.alarma_activa));
    setAlarmaFecha(p.alarma_fecha || p.fecha_limite || '');
    setAlarmaHora(p.alarma_hora || '09:00');
    setAlarmaTono(p.alarma_tono || 'Campana Suave');
    setAlarmaVolumen(typeof p.alarma_volumen === 'number' ? p.alarma_volumen : 80);
    setModalAbierto(true);
  };

  const manejarSubidaArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendoPdf(true);
    try {
      const nombreLimpio = file.name.replace(/\s+/g, '_');
      const ruta = `presupuestos/${Date.now()}_${nombreLimpio}`;
      const { error } = await supabase.storage
        .from('documentos')
        .upload(ruta, file, { upsert: true });

      if (!error) {
        const { data } = supabase.storage.from('documentos').getPublicUrl(ruta);
        setArchivoUrl(data.publicUrl);
        if (!archivoNombre) setArchivoNombre(file.name);
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          setArchivoUrl(String(reader.result || ''));
          if (!archivoNombre) setArchivoNombre(file.name);
        };
        reader.readAsDataURL(file);
      }
    } finally {
      setSubiendoPdf(false);
    }
  };

  const guardarPresupuesto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardando) return;
    setGuardando(true);

    try {
      const cli = clientes.find((c) => String(c.id) === String(clienteId));
      const miembro = equipo.find((m) => m.nombre === asignadoNombre);

      const payload: Record<string, any> = {
        codigo: codigo.trim() || generarCodigo(),
        titulo: titulo.trim(),
        cliente_id: clienteId || null,
        cliente_nombre: cli ? cli.nombre : null,
        tipologia: tipologia || null,
        moneda,
        monto_estimado: parsearNum(montoTexto),
        asignado_nombre: asignadoNombre || null,
        asignado_foto: miembro?.foto_url || null,
        fecha_llegada: fechaLlegada || null,
        fecha_inicio: fechaInicio || null,
        fecha_limite: fechaLimite || null,
        prioridad,
        estado,
        archivo_url: archivoUrl.trim() || null,
        archivo_nombre: archivoNombre.trim() || null,
        notas: notas.trim() || null,
        alarma_activa: alarmaActiva,
        alarma_fecha: alarmaActiva ? alarmaFecha || null : null,
        alarma_hora: alarmaActiva ? alarmaHora || null : null,
        alarma_tono: alarmaTono,
        alarma_volumen: alarmaVolumen,
      };

      if (editando) {
        const { error } = await supabase
          .from('presupuestos')
          .update(payload)
          .eq('id', editando.id);
        if (error) {
          alert('Error al actualizar presupuesto: ' + error.message);
          return;
        }
        setPresupuestos((prev) =>
          prev.map((item) => (item.id === editando.id ? { ...item, ...payload } : item))
        );
        mostrarToast('Presupuesto actualizado');
      } else {
        const { data, error } = await supabase.from('presupuestos').insert([payload]).select();
        if (error) {
          alert('Error al crear presupuesto: ' + error.message);
          return;
        }
        if (data && data[0]) setPresupuestos((prev) => [data[0], ...prev]);
        mostrarToast('Presupuesto creado');
      }

      setModalAbierto(false);
      router.refresh();
    } catch (err: any) {
      alert('Error inesperado: ' + (err?.message || 'Sin conexión'));
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstadoRapido = async (item: any, nuevoEstado: string) => {
    setPresupuestos((prev) =>
      prev.map((p) => (p.id === item.id ? { ...p, estado: nuevoEstado } : p))
    );
    await supabase.from('presupuestos').update({ estado: nuevoEstado }).eq('id', item.id);
    mostrarToast(`Estado cambiado a ${nuevoEstado}`);
    router.refresh();
  };

  const eliminarPresupuesto = async (item: any) => {
    try {
      await moverAPapelera({
        tabla: 'presupuestos',
        modulo: 'Presupuestos',
        titulo: item.titulo || 'Presupuesto',
        subtitulo: item.codigo || '',
        registro: item,
      });
      setPresupuestos((prev) => prev.filter((p) => p.id !== item.id));
      mostrarToast('Presupuesto enviado a papelera');
      router.refresh();
    } catch (e: any) {
      alert('Error al eliminar: ' + e.message);
    }
  };

  const filtrados = useMemo(() => {
    return presupuestos.filter((p) => {
      const q = busqueda.trim().toLowerCase();
      if (q) {
        const txt = `${p.codigo || ''} ${p.titulo || ''} ${p.cliente_nombre || ''} ${
          p.asignado_nombre || ''
        }`.toLowerCase();
        if (!txt.includes(q)) return false;
      }
      if (filtroEstado !== 'Todos' && p.estado !== filtroEstado) return false;
      if (filtroPrioridad !== 'Todas' && p.prioridad !== filtroPrioridad) return false;
      if (filtroAsignado !== 'Todos' && p.asignado_nombre !== filtroAsignado) return false;
      return true;
    });
  }, [presupuestos, busqueda, filtroEstado, filtroPrioridad, filtroAsignado]);

  const cronoData = useMemo(() => {
    const hoy = new Date();
    const hoyDia = hoy.getDate();
    const hoyMs = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 12, 0, 0).getTime();

    if (escalaCrono === 'Semana') {
      const base = new Date(hoy);
      base.setDate(hoy.getDate() - hoy.getDay() + 1 + offsetCrono * 7);
      const bloques = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(base);
        d.setDate(base.getDate() + i);
        const titulo =
          i === 0
            ? `${MESES_LARGO[d.getMonth()]} De ${d.getFullYear()}`
            : d.toLocaleDateString('es-AR', { weekday: 'short' });
        return {
          key: d.toISOString(),
          titulo,
          subMarcas: [String(d.getDate())],
          startMs: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0).getTime(),
          endMs: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).getTime(),
        };
      });
      const startMs = bloques[0].startMs;
      const endMs = bloques[bloques.length - 1].endMs;
      const hoyPct = ((hoyMs - startMs) / Math.max(1, endMs - startMs)) * 100;
      return { bloques, startMs, endMs, hoyPct, hoyDia };
    }

    const cantMeses =
      escalaCrono === 'Mes'
        ? 1
        : escalaCrono === 'Trimestre'
        ? 3
        : escalaCrono === 'Semestre'
        ? 7
        : 12;

    const desplazamientoInicial =
      escalaCrono === 'Semestre' ? -3 : escalaCrono === 'Trimestre' ? -1 : 0;

    const bloques = Array.from({ length: cantMeses }, (_, i) => {
      const mDate = new Date(
        hoy.getFullYear(),
        hoy.getMonth() + desplazamientoInicial + offsetCrono + i,
        1
      );
      const y = mDate.getFullYear();
      const m = mDate.getMonth();
      const titulo = i === 0 ? `${MESES_LARGO[m]} De ${y}` : MESES_LARGO[m];
      return {
        key: `${y}-${m}`,
        titulo,
        subMarcas: ['2', '9', '16', '23', '30'],
        startMs: new Date(y, m, 1, 0, 0, 0).getTime(),
        endMs: new Date(y, m + 1, 0, 23, 59, 59).getTime(),
      };
    });

    const startMs = bloques[0].startMs;
    const endMs = bloques[bloques.length - 1].endMs;
    const hoyPct = ((hoyMs - startMs) / Math.max(1, endMs - startMs)) * 100;

    return { bloques, startMs, endMs, hoyPct, hoyDia };
  }, [escalaCrono, offsetCrono]);

  const personaSeleccionadaObj = useMemo(
    () => equipo.find((m) => m.nombre === asignadoNombre),
    [equipo, asignadoNombre]
  );

  const clienteSeleccionadoObj = useMemo(
    () => clientes.find((c) => String(c.id) === String(clienteId)),
    [clientes, clienteId]
  );

  return (
    <div className="min-h-screen text-white p-8 font-sans">
      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Presupuestos</h1>
          <p className="text-xs text-gray-400 mt-1">
            Seguimiento comercial de cotizaciones, responsables, prioridades y plazos de entrega
          </p>
        </div>

        <button
          type="button"
          onClick={abrirNuevo}
          className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-5 py-2.5 rounded-xl font-bold text-xs inline-flex items-center gap-2 cursor-pointer shadow-lg"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" /> Nuevo presupuesto
        </button>
      </div>

      <div className="flex flex-wrap justify-between items-center gap-4 mb-5">
        <div className="bg-[#242424] border border-white/10 rounded-xl p-1 inline-flex gap-1">
          {[
            { id: 'lista', label: 'Lista', icon: List },
            { id: 'kanban', label: 'Tablero Kanban', icon: Columns },
            { id: 'cronograma', label: 'Cronograma', icon: CalendarIcon },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setVista(t.id as any)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                  vista === t.id ? 'bg-[#EAB308] text-black' : 'text-gray-300 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            );
          })}
        </div>

        <span className="text-xs text-gray-400 font-semibold">
          {filtrados.length} {filtrados.length === 1 ? 'presupuesto' : 'presupuestos'}
        </span>
      </div>

      <div
        ref={refBarraFiltros}
        className="bg-[#242424] border border-white/10 rounded-2xl p-4 mb-6 flex flex-wrap items-center gap-3 relative z-30"
      >
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar presupuesto por código, título, cliente o responsable..."
            className="w-full bg-[#181818] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-gray-400"
          />
        </div>

        <div className={`relative ${dropAbierto === 'filtroEstado' ? 'z-[100]' : 'z-10'}`}>
          <button
            type="button"
            onClick={() =>
              setDropAbierto((prev) => (prev === 'filtroEstado' ? null : 'filtroEstado'))
            }
            className="bg-[#181818] border border-white/10 hover:border-white/25 rounded-xl px-3.5 py-2 text-xs font-semibold text-white inline-flex items-center gap-2 cursor-pointer"
          >
            <span>Estado: {filtroEstado}</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>
          {dropAbierto === 'filtroEstado' && (
            <div className="absolute right-0 mt-1.5 w-48 bg-[#1C1C1C] border border-gray-700 rounded-2xl shadow-2xl py-1.5 z-[110]">
              {(['Todos', ...ESTADOS_PRESUPUESTO] as const).map((est) => (
                <button
                  key={est}
                  type="button"
                  onClick={() => {
                    setFiltroEstado(est);
                    setDropAbierto(null);
                  }}
                  className="w-full px-4 py-2 text-left text-xs font-bold text-white hover:bg-white/5 cursor-pointer"
                >
                  {est === 'Todos' ? 'Estado: Todos' : est}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={`relative ${dropAbierto === 'filtroPrioridad' ? 'z-[100]' : 'z-10'}`}>
          <button
            type="button"
            onClick={() =>
              setDropAbierto((prev) => (prev === 'filtroPrioridad' ? null : 'filtroPrioridad'))
            }
            className="bg-[#181818] border border-white/10 hover:border-white/25 rounded-xl px-3.5 py-2 text-xs font-semibold text-white inline-flex items-center gap-2 cursor-pointer"
          >
            <span>Prioridad: {filtroPrioridad}</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>
          {dropAbierto === 'filtroPrioridad' && (
            <div className="absolute right-0 mt-1.5 w-48 bg-[#1C1C1C] border border-gray-700 rounded-2xl shadow-2xl py-1.5 z-[110]">
              {(['Todas', ...PRIORIDADES_PRESUPUESTO] as const).map((pr) => (
                <button
                  key={pr}
                  type="button"
                  onClick={() => {
                    setFiltroPrioridad(pr);
                    setDropAbierto(null);
                  }}
                  className="w-full px-4 py-2 text-left text-xs font-bold text-white hover:bg-white/5 cursor-pointer flex items-center gap-2"
                >
                  {pr !== 'Todas' && (
                    <Flag
                      className="w-3.5 h-3.5"
                      style={{
                        color: estiloPrioridad(pr).fill,
                        fill: estiloPrioridad(pr).fill,
                      }}
                    />
                  )}
                  <span>{pr === 'Todas' ? 'Prioridad: Todas' : pr}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={`relative ${dropAbierto === 'filtroAsignado' ? 'z-[100]' : 'z-10'}`}>
          <button
            type="button"
            onClick={() =>
              setDropAbierto((prev) => (prev === 'filtroAsignado' ? null : 'filtroAsignado'))
            }
            className="bg-[#181818] border border-white/10 hover:border-white/25 rounded-xl px-3.5 py-2 text-xs font-semibold text-white inline-flex items-center gap-2 cursor-pointer"
          >
            <span>Asignado: {filtroAsignado}</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>
          {dropAbierto === 'filtroAsignado' && (
            <div className="absolute right-0 mt-1.5 w-56 bg-[#1C1C1C] border border-gray-700 rounded-2xl shadow-2xl py-1.5 z-[110] max-h-60 overflow-y-auto">
              <button
                type="button"
                onClick={() => {
                  setFiltroAsignado('Todos');
                  setDropAbierto(null);
                }}
                className="w-full px-4 py-2 text-left text-xs font-bold text-white hover:bg-white/5 cursor-pointer"
              >
                Asignado: Todos
              </button>
              {equipo.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setFiltroAsignado(m.nombre);
                    setDropAbierto(null);
                  }}
                  className="w-full px-4 py-2 text-left text-xs font-bold text-white hover:bg-white/5 cursor-pointer"
                >
                  {m.nombre}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* VISTA 1: LISTA */}
      {vista === 'lista' && (
        <div className="bg-[#242424] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  <th className="py-3.5 px-4">PRESUPUESTO / CLIENTE</th>
                  <th className="py-3.5 px-4">PERSONA ASIGNADA</th>
                  <th className="py-3.5 px-4">LLEGADA</th>
                  <th className="py-3.5 px-4">INICIO</th>
                  <th className="py-3.5 px-4">FECHA LÍMITE</th>
                  <th className="py-3.5 px-4">PRIORIDAD</th>
                  <th className="py-3.5 px-4">ESTADO</th>
                  <th className="py-3.5 px-4 text-right">MONTO / PDF / ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-xs">
                {filtrados.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-gray-400">
                      No hay presupuestos cargados todavía. Tocá &quot;+ Nuevo presupuesto&quot; para
                      cargar el primero.
                    </td>
                  </tr>
                ) : (
                  filtrados.map((p) => {
                    const estStyle = estiloEstado(p.estado);
                    const prioStyle = estiloPrioridad(p.prioridad);
                    const miembro = equipo.find((m) => m.nombre === p.asignado_nombre);
                    const foto = miembro?.foto_url || p.asignado_foto;

                    return (
                      <tr
                        key={p.id}
                        onClick={() => abrirEditar(p)}
                        className="hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-extrabold text-white flex items-center gap-1.5">
                            <span className="text-[#EAB308]">{p.codigo}</span>
                            <span>{p.titulo}</span>
                            {p.alarma_activa && (
                              <span
                                title={`Alarma: ${formatearFechaCorta(p.alarma_fecha)} ${
                                  p.alarma_hora
                                }`}
                              >
                                <Bell className="w-3.5 h-3.5 text-[#EAB308]" />
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-400">
                            {p.cliente_nombre || 'Sin cliente'}{' '}
                            {p.tipologia ? `· ${p.tipologia}` : ''}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {p.asignado_nombre ? (
                            <div className="inline-flex items-center gap-2">
                              {foto ? (
                                <img
                                  src={foto}
                                  alt={p.asignado_nombre}
                                  className="w-7 h-7 rounded-full object-cover border border-white/15"
                                />
                              ) : (
                                <span className="w-7 h-7 rounded-full bg-gray-800 text-white font-extrabold text-[10px] flex items-center justify-center border border-white/15">
                                  {obtenerIniciales(p.asignado_nombre)}
                                </span>
                              )}
                              <span className="font-semibold text-gray-200">
                                {p.asignado_nombre}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400">Sin asignar</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-gray-300">
                          {formatearFechaCorta(p.fecha_llegada)}
                        </td>
                        <td className="py-3.5 px-4 text-gray-300">
                          {formatearFechaCorta(p.fecha_inicio)}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-white">
                          {formatearFechaCorta(p.fecha_limite)}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 font-bold ${prioStyle.color}`}
                          >
                            <Flag
                              className="w-3.5 h-3.5"
                              style={{ color: prioStyle.fill, fill: prioStyle.fill }}
                            />
                            {p.prioridad || 'Normal'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={p.estado || 'Pendiente'}
                            onChange={(e) => cambiarEstadoRapido(p, e.target.value)}
                            className={`px-2.5 py-1 rounded-full border text-[11px] font-bold cursor-pointer ${estStyle.badge}`}
                          >
                            {ESTADOS_PRESUPUESTO.map((est) => (
                              <option key={est} value={est} className="bg-[#181818] text-white">
                                {est}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <span className="font-extrabold text-white mr-1">
                              {p.moneda || 'USD'} $
                              {Number(p.monto_estimado || 0).toLocaleString('es-AR', {
                                maximumFractionDigits: 2,
                              })}
                            </span>

                            {p.archivo_url && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setVisorArchivo({
                                    url: p.archivo_url,
                                    titulo: p.archivo_nombre || `${p.codigo} · ${p.titulo}`,
                                  });
                                }}
                                className="px-2 py-1 rounded-lg bg-blue-500/15 border border-blue-500/40 text-blue-400 hover:bg-blue-500/25 font-bold inline-flex items-center gap-1 cursor-pointer"
                                title={p.archivo_nombre || 'Ver archivo adjunto'}
                              >
                                <FileText className="w-3.5 h-3.5" /> PDF
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                abrirEditar(p);
                              }}
                              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-300 cursor-pointer"
                              title="Editar"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                eliminarPresupuesto(p);
                              }}
                              className="p-1.5 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-400 hover:bg-rose-500/25 cursor-pointer"
                              title="Enviar a papelera"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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

      {/* VISTA 2: TABLERO KANBAN */}
      {vista === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {ESTADOS_PRESUPUESTO.map((estCol) => {
            const estStyle = estiloEstado(estCol);
            const itemsCol = filtrados.filter((p) => (p.estado || 'Pendiente') === estCol);

            return (
              <div
                key={estCol}
                className="bg-[#242424] border border-white/10 rounded-2xl p-3.5 flex flex-col min-h-[420px]"
              >
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                  <span
                    className={`px-2.5 py-1 rounded-full border text-[11px] font-extrabold inline-flex items-center gap-1.5 ${estStyle.badge}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${estStyle.dot}`} />
                    {estCol}
                  </span>
                  <span className="text-xs font-extrabold text-gray-400">{itemsCol.length}</span>
                </div>

                {itemsCol.length === 0 ? (
                  <div className="flex-1 border border-dashed border-white/10 rounded-xl flex items-center justify-center text-[11px] text-gray-400 p-4 text-center">
                    Sin presupuestos en {estCol}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {itemsCol.map((p) => {
                      const prioStyle = estiloPrioridad(p.prioridad);
                      const miembro = equipo.find((m) => m.nombre === p.asignado_nombre);
                      const foto = miembro?.foto_url || p.asignado_foto;

                      return (
                        <div
                          key={p.id}
                          onClick={() => abrirEditar(p)}
                          className="bg-[#181818] border border-white/10 hover:border-white/25 rounded-xl p-3.5 space-y-2.5 shadow cursor-pointer transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-extrabold text-[#EAB308]">
                              {p.codigo}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-bold ${prioStyle.color}`}
                            >
                              <Flag
                                className="w-3 h-3"
                                style={{ color: prioStyle.fill, fill: prioStyle.fill }}
                              />
                              {p.prioridad || 'Normal'}
                            </span>
                          </div>

                          <div>
                            <div className="text-xs font-extrabold text-white">{p.titulo}</div>
                            <div className="text-[11px] text-gray-400">
                              {p.cliente_nombre || 'Sin cliente'}{' '}
                              {p.tipologia ? `· ${p.tipologia}` : ''}
                            </div>
                          </div>

                          <div className="text-[11px] text-gray-300 space-y-1 pt-1 border-t border-white/10">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Límite:</span>
                              <span className="font-bold">
                                {formatearFechaCorta(p.fecha_limite)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Monto:</span>
                              <span className="font-extrabold text-white">
                                {p.moneda || 'USD'} $
                                {Number(p.monto_estimado || 0).toLocaleString('es-AR')}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-white/10">
                            <div className="inline-flex items-center gap-1.5 min-w-0">
                              {foto ? (
                                <img
                                  src={foto}
                                  alt={p.asignado_nombre}
                                  className="w-6 h-6 rounded-full object-cover"
                                />
                              ) : (
                                <span className="w-6 h-6 rounded-full bg-gray-800 text-white font-extrabold text-[9px] flex items-center justify-center">
                                  {obtenerIniciales(p.asignado_nombre || '?')}
                                </span>
                              )}
                              <span className="text-[11px] text-gray-300 truncate">
                                {p.asignado_nombre || 'Sin asignar'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              {p.archivo_url && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setVisorArchivo({
                                      url: p.archivo_url,
                                      titulo: p.archivo_nombre || p.titulo,
                                    });
                                  }}
                                  className="p-1 rounded hover:bg-blue-950/60 text-blue-400 cursor-pointer"
                                  title="Ver PDF"
                                >
                                  <FileText className="w-3 h-3" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  eliminarPresupuesto(p);
                                }}
                                className="p-1 rounded hover:bg-rose-950/60 text-rose-400 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
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
        <div className="bg-[#16181D] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          <div className="px-5 py-3.5 border-b border-white/10 flex flex-wrap justify-between items-center gap-3">
            <button
              type="button"
              onClick={() => setOffsetCrono(0)}
              className="bg-[#1E2028] hover:bg-white/10 border border-white/10 text-white px-3.5 py-2 rounded-xl text-xs font-extrabold inline-flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#D4EE36]" />
              <span>Cronograma</span>
            </button>

            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="/agenda"
                className="bg-[#1E2028] hover:bg-white/10 border border-white/10 text-white px-3.5 py-2 rounded-xl text-xs font-extrabold inline-flex items-center gap-2"
              >
                <CalendarIcon className="w-3.5 h-3.5 text-[#D4EE36]" />
                <span>Gestionar en el Calendario</span>
              </Link>

              <div className="bg-[#1E2028] border border-white/10 rounded-xl p-1 inline-flex items-center gap-0.5">
                {(['Semana', 'Mes', 'Trimestre', 'Semestre', 'Año'] as const).map((esc) => (
                  <button
                    key={esc}
                    type="button"
                    onClick={() => {
                      setEscalaCrono(esc);
                      setOffsetCrono(0);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-colors cursor-pointer ${
                      escalaCrono === esc
                        ? 'bg-[#D4EE36] text-black shadow'
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    {esc}
                  </button>
                ))}
              </div>

              <div className="bg-[#1E2028] border border-white/10 rounded-xl px-2 py-1.5 inline-flex items-center gap-2.5 text-xs font-extrabold text-white">
                <button
                  type="button"
                  onClick={() => setOffsetCrono((v) => v - 1)}
                  className="p-0.5 text-gray-400 hover:text-white cursor-pointer"
                  title="Período anterior"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setOffsetCrono(0)}
                  className="px-1.5 hover:text-[#D4EE36] cursor-pointer"
                >
                  Hoy
                </button>
                <button
                  type="button"
                  onClick={() => setOffsetCrono((v) => v + 1)}
                  className="p-0.5 text-gray-400 hover:text-white cursor-pointer"
                  title="Período siguiente"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[1060px] relative">
              <div className="grid grid-cols-12 border-b border-white/10 bg-[#1B1D24]">
                <div className="col-span-3 px-4 py-3 border-r border-white/10 flex items-end text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
                  Presupuesto / Responsable
                </div>

                <div className="col-span-9 relative">
                  <div
                    className="grid"
                    style={{
                      gridTemplateColumns: `repeat(${cronoData.bloques.length}, minmax(0, 1fr))`,
                    }}
                  >
                    {cronoData.bloques.map((b) => (
                      <div
                        key={b.key}
                        className="border-r border-white/10 last:border-r-0 px-3 pt-2.5 pb-2"
                      >
                        <div className="text-xs font-extrabold text-white truncate">
                          {b.titulo}
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-semibold text-gray-400 mt-2">
                          {b.subMarcas.map((dia, idx) => (
                            <span key={idx}>{dia}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {cronoData.hoyPct >= 0 && cronoData.hoyPct <= 100 && (
                    <div
                      style={{ left: `${cronoData.hoyPct}%` }}
                      className="absolute -bottom-2.5 -translate-x-1/2 z-20 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center shadow-lg"
                    >
                      {cronoData.hoyDia}
                    </div>
                  )}
                </div>
              </div>

              <div className="divide-y divide-white/10 relative">
                {filtrados.length === 0 ? (
                  <div className="py-12 text-center text-xs text-gray-400">
                    No hay presupuestos para mostrar en el cronograma.
                  </div>
                ) : (
                  filtrados.map((p) => {
                    const iniStr = p.fecha_inicio || p.fecha_llegada;
                    const finStr = p.fecha_limite || iniStr;
                    const estStyle = estiloEstado(p.estado);
                    const miembro = equipo.find((m) => m.nombre === p.asignado_nombre);
                    const foto = miembro?.foto_url || p.asignado_foto;

                    let leftPct = 0;
                    let widthPct = 0;
                    let visible = false;

                    if (iniStr) {
                      const s = new Date(iniStr + 'T00:00:00').getTime();
                      const e = finStr
                        ? new Date(finStr + 'T23:59:59').getTime()
                        : s + 86400000 * 5;
                      const span = Math.max(1, cronoData.endMs - cronoData.startMs);

                      if (e >= cronoData.startMs && s <= cronoData.endMs) {
                        visible = true;
                        const sClamp = Math.max(s, cronoData.startMs);
                        const eClamp = Math.min(e, cronoData.endMs);
                        leftPct = ((sClamp - cronoData.startMs) / span) * 100;
                        widthPct = Math.max(2.2, ((eClamp - sClamp) / span) * 100);
                      }
                    }

                    return (
                      <div
                        key={p.id}
                        onClick={() => abrirEditar(p)}
                        className="grid grid-cols-12 hover:bg-white/[0.03] transition-colors cursor-pointer"
                      >
                        <div className="col-span-3 px-4 py-3 border-r border-white/10 flex items-center justify-between gap-2 min-w-0">
                          <div className="min-w-0">
                            <div className="text-xs font-extrabold text-white truncate">
                              <span className="text-[#EAB308] mr-1.5">{p.codigo}</span>
                              {p.titulo}
                            </div>
                            <div className="text-[11px] text-gray-400 truncate mt-0.5">
                              {formatearFechaCorta(iniStr)} → {formatearFechaCorta(p.fecha_limite)}
                            </div>
                          </div>

                          {foto ? (
                            <img
                              src={foto}
                              alt={p.asignado_nombre}
                              title={p.asignado_nombre}
                              className="w-6 h-6 rounded-full object-cover flex-shrink-0 border border-white/15"
                            />
                          ) : (
                            <span
                              title={p.asignado_nombre || 'Sin asignar'}
                              className="w-6 h-6 rounded-full bg-gray-800 text-white font-extrabold text-[9px] flex items-center justify-center flex-shrink-0 border border-white/15"
                            >
                              {obtenerIniciales(p.asignado_nombre || '?')}
                            </span>
                          )}
                        </div>

                        <div className="col-span-9 relative flex items-center py-2.5">
                          <div
                            className="absolute inset-0 grid pointer-events-none"
                            style={{
                              gridTemplateColumns: `repeat(${cronoData.bloques.length}, minmax(0, 1fr))`,
                            }}
                          >
                            {cronoData.bloques.map((b) => (
                              <div
                                key={b.key}
                                className="border-r border-white/5 last:border-r-0 h-full"
                              />
                            ))}
                          </div>

                          {cronoData.hoyPct >= 0 && cronoData.hoyPct <= 100 && (
                            <div
                              style={{ left: `${cronoData.hoyPct}%` }}
                              className="absolute top-0 bottom-0 w-[1.5px] bg-rose-500/80 z-10 pointer-events-none"
                            />
                          )}

                          {visible && (
                            <div
                              style={{
                                left: `${leftPct}%`,
                                width: `${widthPct}%`,
                                backgroundColor: estStyle.bar,
                              }}
                              className="relative z-10 h-6 rounded-lg px-2.5 flex items-center justify-between text-[10px] font-extrabold text-black shadow-md overflow-hidden"
                            >
                              <span className="truncate">{p.titulo}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NUEVO / EDITAR PRESUPUESTO */}
      {modalAbierto &&
        montado &&
        createPortal(
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
            <div className="bg-[#161616] border border-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
              <div className="px-6 pt-5 pb-4 border-b border-gray-800 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-extrabold text-white">
                    {editando ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Asignación de responsable, fechas clave, prioridad, estado, alarma y archivo PDF
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

              <form
                ref={refModalForm}
                onSubmit={guardarPresupuesto}
                className="px-6 py-5 overflow-y-auto space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-200 mb-1.5">Código</label>
                    <input
                      type="text"
                      value={codigo}
                      onChange={(e) => setCodigo(e.target.value)}
                      className="w-full bg-[#1C1C1C] border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-200 mb-1.5">
                      Título / Obra a Presupuestar <span className="text-[#EAB308]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      placeholder="Ej. Shell Enerse"
                      className="w-full bg-[#1C1C1C] border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className={`relative ${dropAbierto === 'cliente' ? 'z-[200]' : 'z-20'}`}>
                    <label className="block text-xs font-bold text-gray-200 mb-1.5">Cliente</label>
                    <button
                      type="button"
                      onClick={() =>
                        setDropAbierto((prev) => (prev === 'cliente' ? null : 'cliente'))
                      }
                      className="w-full bg-[#1C1C1C] border border-gray-700 hover:border-gray-600 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <span className="truncate">
                        {clienteSeleccionadoObj ? clienteSeleccionadoObj.nombre : 'Sin cliente'}
                      </span>
                      <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </button>

                    {dropAbierto === 'cliente' && (
                      <div className="absolute left-0 right-0 mt-1.5 bg-[#1C1C1C] border border-gray-700 rounded-2xl shadow-2xl py-2 z-[210] max-h-56 overflow-y-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setClienteId('');
                            setDropAbierto(null);
                          }}
                          className="w-full px-4 py-2 text-left text-xs font-semibold text-gray-300 hover:bg-white/5 cursor-pointer"
                        >
                          Sin cliente
                        </button>
                        {clientes.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setClienteId(String(c.id));
                              setDropAbierto(null);
                            }}
                            className="w-full px-4 py-2 text-left text-xs font-bold text-white hover:bg-white/5 cursor-pointer"
                          >
                            {c.nombre}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className={`relative ${dropAbierto === 'tipologia' ? 'z-[200]' : 'z-20'}`}>
                    <label className="block text-xs font-bold text-gray-200 mb-1.5">
                      Tipología
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setDropAbierto((prev) => (prev === 'tipologia' ? null : 'tipologia'))
                      }
                      className="w-full bg-[#1C1C1C] border border-gray-700 hover:border-gray-600 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <span className="truncate">{tipologia}</span>
                      <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </button>

                    {dropAbierto === 'tipologia' && (
                      <div className="absolute left-0 right-0 mt-1.5 bg-[#1C1C1C] border border-gray-700 rounded-2xl shadow-2xl py-2 z-[210] max-h-60 overflow-y-auto">
                        {TIPOLOGIAS_OBRA.map((tip) => (
                          <button
                            key={tip}
                            type="button"
                            onClick={() => {
                              setTipologia(tip);
                              setDropAbierto(null);
                            }}
                            className={`w-full px-4 py-2 text-left text-xs font-bold hover:bg-white/5 cursor-pointer ${
                              tipologia === tip ? 'text-[#EAB308]' : 'text-white'
                            }`}
                          >
                            {tip}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className={`relative ${dropAbierto === 'moneda' ? 'z-[200]' : 'z-20'}`}>
                    <label className="block text-xs font-bold text-gray-200 mb-1.5">
                      Monto Estimado
                    </label>
                    <div className="flex gap-1.5">
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setDropAbierto((prev) => (prev === 'moneda' ? null : 'moneda'))
                          }
                          className="bg-[#1C1C1C] border border-gray-700 rounded-xl px-3 py-2.5 text-xs font-extrabold text-white inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>{moneda}</span>
                          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                        {dropAbierto === 'moneda' && (
                          <div className="absolute left-0 mt-1.5 w-24 bg-[#1C1C1C] border border-gray-700 rounded-2xl shadow-2xl py-1.5 z-[210]">
                            {(['USD', 'ARS'] as const).map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => {
                                  setMoneda(m);
                                  setDropAbierto(null);
                                }}
                                className="w-full px-4 py-2 text-left text-xs font-extrabold text-white hover:bg-white/5 cursor-pointer"
                              >
                                {m}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <input
                        type="text"
                        value={montoTexto}
                        onChange={(e) => setMontoTexto(formatearMilesDecimales(e.target.value))}
                        placeholder="Ej. 45.000,00"
                        className="w-full bg-[#1C1C1C] border border-gray-700 rounded-xl px-3 py-2.5 text-xs font-bold text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className={`relative ${dropAbierto === 'persona' ? 'z-[200]' : 'z-30'}`}>
                    <label className="block text-xs font-bold text-gray-200 mb-1.5">
                      Persona asignada
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setDropAbierto((prev) => (prev === 'persona' ? null : 'persona'))
                      }
                      className="w-full bg-[#1C1C1C] border border-gray-700 hover:border-gray-600 rounded-xl px-3.5 py-2 text-xs font-bold text-white flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <span className="inline-flex items-center gap-2 truncate">
                        {personaSeleccionadaObj?.foto_url ? (
                          <img
                            src={personaSeleccionadaObj.foto_url}
                            alt={asignadoNombre}
                            className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <span className="w-6 h-6 rounded-full bg-gray-800 text-white font-extrabold text-[10px] flex items-center justify-center flex-shrink-0">
                            {asignadoNombre ? (
                              obtenerIniciales(asignadoNombre)
                            ) : (
                              <User className="w-3 h-3" />
                            )}
                          </span>
                        )}
                        <span className="truncate">{asignadoNombre || 'Seleccionar...'}</span>
                      </span>
                      <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </button>

                    {dropAbierto === 'persona' && (
                      <div className="absolute left-0 right-0 mt-1.5 bg-[#1C1C1C] border border-gray-700 rounded-2xl shadow-2xl py-2 z-[210] max-h-56 overflow-y-auto">
                        {equipo.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setAsignadoNombre(m.nombre);
                              setDropAbierto(null);
                            }}
                            className="w-full px-3.5 py-2 text-left text-xs text-white hover:bg-white/5 flex items-center gap-2.5 cursor-pointer"
                          >
                            {m.foto_url ? (
                              <img
                                src={m.foto_url}
                                alt={m.nombre}
                                className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <span className="w-6 h-6 rounded-full bg-gray-800 text-white font-extrabold text-[10px] flex items-center justify-center flex-shrink-0">
                                {obtenerIniciales(m.nombre)}
                              </span>
                            )}
                            <span className="truncate font-bold">{m.nombre}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className={`relative ${dropAbierto === 'prioridad' ? 'z-[200]' : 'z-30'}`}>
                    <label className="block text-xs font-bold text-gray-200 mb-1.5">
                      Prioridad
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setDropAbierto((prev) => (prev === 'prioridad' ? null : 'prioridad'))
                      }
                      className="w-full bg-[#1C1C1C] border border-gray-700 hover:border-gray-600 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Flag
                          className="w-3.5 h-3.5"
                          style={{
                            color: estiloPrioridad(prioridad).fill,
                            fill: estiloPrioridad(prioridad).fill,
                          }}
                        />
                        {prioridad}
                      </span>
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </button>

                    {dropAbierto === 'prioridad' && (
                      <div className="absolute left-0 right-0 mt-1.5 bg-[#1C1C1C] border border-gray-700 rounded-2xl shadow-2xl py-2 z-[210]">
                        {PRIORIDADES_PRESUPUESTO.map((pr) => {
                          const st = estiloPrioridad(pr);
                          return (
                            <button
                              key={pr}
                              type="button"
                              onClick={() => {
                                setPrioridad(pr);
                                setDropAbierto(null);
                              }}
                              className="w-full px-4 py-2.5 text-left text-xs text-white hover:bg-white/5 flex items-center gap-2.5 cursor-pointer"
                            >
                              <Flag
                                className="w-3.5 h-3.5"
                                style={{ color: st.fill, fill: st.fill }}
                              />
                              <span className="font-bold">{pr}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className={`relative ${dropAbierto === 'estado' ? 'z-[200]' : 'z-30'}`}>
                    <label className="block text-xs font-bold text-gray-200 mb-1.5">Estado</label>
                    <button
                      type="button"
                      onClick={() =>
                        setDropAbierto((prev) => (prev === 'estado' ? null : 'estado'))
                      }
                      className={`w-full border rounded-xl px-3.5 py-2.5 text-xs font-extrabold flex items-center justify-between gap-2 cursor-pointer ${
                        estiloEstado(estado).badge
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${estiloEstado(estado).dot}`} />
                        {estado}
                      </span>
                      <ChevronDown className="w-4 h-4" />
                    </button>

                    {dropAbierto === 'estado' && (
                      <div className="absolute left-0 right-0 mt-1.5 bg-[#1C1C1C] border border-gray-700 rounded-2xl shadow-2xl py-2 z-[210]">
                        {ESTADOS_PRESUPUESTO.map((est) => {
                          const st = estiloEstado(est);
                          return (
                            <button
                              key={est}
                              type="button"
                              onClick={() => {
                                setEstado(est);
                                setDropAbierto(null);
                              }}
                              className="w-full px-4 py-2.5 text-left text-xs font-bold text-white hover:bg-white/5 flex items-center gap-2.5 cursor-pointer"
                            >
                              <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                              <span>{est}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
                  <div>
                    <label className="block text-xs font-bold text-gray-200 mb-1.5">
                      Fecha de llegada
                    </label>
                    <input
                      type="date"
                      value={fechaLlegada}
                      onChange={(e) => setFechaLlegada(e.target.value)}
                      className="w-full bg-[#1C1C1C] border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-200 mb-1.5">
                      Fecha inicio
                    </label>
                    <input
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      className="w-full bg-[#1C1C1C] border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-200 mb-1.5">
                      Fecha límite
                    </label>
                    <input
                      type="date"
                      value={fechaLimite}
                      onChange={(e) => setFechaLimite(e.target.value)}
                      className="w-full bg-[#1C1C1C] border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white [color-scheme:dark]"
                    />
                  </div>
                </div>

                {/* BLOQUE DE ALARMA PROGRAMADA CON TONO Y VOLUMEN */}
                <div className="bg-[#1C1C1C] border border-gray-800 rounded-2xl p-4 space-y-3 relative z-10">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <Bell className="w-3.5 h-3.5 text-[#EAB308]" />
                        <span>Alarma / Recordatorio Sonoro</span>
                        {alarmaActiva && (
                          <span className="bg-[#EAB308]/20 border border-[#EAB308]/50 text-[#EAB308] px-2 py-0.5 rounded text-[10px] font-extrabold">
                            ACTIVA
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Configurá fecha, hora, tono y volumen de la alerta sonora
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => reproducirSonidoAlarmaVisita(alarmaTono, alarmaVolumen)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#141414] border border-gray-700 hover:border-[#EAB308] text-[11px] font-bold text-gray-200 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Volume2 className="w-3 h-3 text-[#EAB308]" /> Probar sonido
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const nuevoEstado = !alarmaActiva;
                          setAlarmaActiva(nuevoEstado);
                          if (
                            nuevoEstado &&
                            typeof window !== 'undefined' &&
                            'Notification' in window &&
                            Notification.permission === 'default'
                          ) {
                            Notification.requestPermission();
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold cursor-pointer transition-colors ${
                          alarmaActiva
                            ? 'bg-[#EAB308] text-black'
                            : 'bg-gray-800 text-gray-300 hover:text-white'
                        }`}
                      >
                        {alarmaActiva ? 'Activada' : 'Activar alarma'}
                      </button>
                    </div>
                  </div>

                  {alarmaActiva && (
                    <div className="space-y-3 pt-2 border-t border-gray-800">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-300 mb-1">
                            Fecha de alarma
                          </label>
                          <input
                            type="date"
                            required={alarmaActiva}
                            value={alarmaFecha}
                            onChange={(e) => setAlarmaFecha(e.target.value)}
                            className="w-full bg-[#141414] border border-gray-700 rounded-xl px-3.5 py-2 text-xs text-white [color-scheme:dark]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-300 mb-1">
                            Hora de alarma
                          </label>
                          <input
                            type="time"
                            required={alarmaActiva}
                            value={alarmaHora}
                            onChange={(e) => setAlarmaHora(e.target.value)}
                            className="w-full bg-[#141414] border border-gray-700 rounded-xl px-3.5 py-2 text-xs text-white [color-scheme:dark]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-300 mb-1">
                            Tono de alarma
                          </label>
                          <select
                            value={alarmaTono}
                            onChange={(e) => {
                              const nuevoTono = e.target.value;
                              setAlarmaTono(nuevoTono);
                              reproducirSonidoAlarmaVisita(nuevoTono, alarmaVolumen);
                            }}
                            className="w-full bg-[#141414] border border-gray-700 rounded-xl px-3 py-2 text-xs font-bold text-white"
                          >
                            {TONOS_ALARMA.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] font-bold text-gray-300 mb-1">
                            <span>Volumen</span>
                            <span className="text-[#EAB308]">{alarmaVolumen}%</span>
                          </div>
                          <input
                            type="range"
                            min={10}
                            max={100}
                            step={5}
                            value={alarmaVolumen}
                            onChange={(e) => setAlarmaVolumen(Number(e.target.value))}
                            onMouseUp={() =>
                              reproducirSonidoAlarmaVisita(alarmaTono, alarmaVolumen)
                            }
                            className="w-full accent-[#EAB308] cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* CARGA DE PDF DEL PRESUPUESTO + BOTONES "VER" Y "ELIMINAR" */}
                <div className="bg-[#1C1C1C] border border-gray-800 rounded-2xl p-4 space-y-3 relative z-10">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-[#EAB308]" />
                      Documento del Presupuesto (PDF / Cómputo / Drive)
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Subí el PDF del presupuesto desde tu dispositivo o pegá abajo un enlace externo (Google Drive, Dropbox, OneDrive).
                    </p>
                  </div>

                  <label className="border-2 border-dashed border-gray-700 hover:border-[#EAB308] rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-[#151515]">
                    {subiendoPdf ? (
                      <Loader2 className="w-6 h-6 text-[#EAB308] animate-spin mb-1.5" />
                    ) : (
                      <Upload className="w-6 h-6 text-[#EAB308] mb-1.5" />
                    )}
                    <span className="text-xs font-extrabold text-[#EAB308]">
                      {subiendoPdf
                        ? 'Subiendo archivo...'
                        : 'Hacé clic aquí para adjuntar PDF del presupuesto'}
                    </span>
                    <span className="text-[11px] text-gray-400 mt-1">
                      {archivoUrl
                        ? `Archivo vinculado: ${archivoNombre || 'Documento adjunto ✓'}`
                        : 'Para archivos pesados o carpetas compartidas, pegá el enlace de Google Drive abajo.'}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                      onChange={manejarSubidaArchivo}
                      className="hidden"
                    />
                  </label>

                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="text-[11px] font-bold text-gray-300 flex items-center gap-1.5">
                        <Link2 className="w-3.5 h-3.5 text-[#EAB308]" />
                        O pegar enlace externo (Google Drive, Dropbox, OneDrive):
                      </label>

                      {archivoUrl && (
                        <div className="inline-flex items-center gap-2.5 text-[11px] font-bold">
                          <button
                            type="button"
                            onClick={() =>
                              setVisorArchivo({
                                url: archivoUrl,
                                titulo: archivoNombre || `${codigo} · ${titulo}`,
                              })
                            }
                            className="text-sky-400 hover:text-sky-300 inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" /> Ver
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setArchivoUrl('');
                              setArchivoNombre('');
                            }}
                            className="text-rose-400 hover:text-rose-300 inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" /> Eliminar
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={archivoUrl.startsWith('data:') ? '' : archivoUrl}
                        onChange={(e) => setArchivoUrl(e.target.value)}
                        placeholder={
                          archivoUrl.startsWith('data:')
                            ? 'Archivo cargado desde dispositivo ✓'
                            : 'https://drive.google.com/...'
                        }
                        className="md:col-span-2 bg-[#141414] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white"
                      />
                      <input
                        type="text"
                        value={archivoNombre}
                        onChange={(e) => setArchivoNombre(e.target.value)}
                        placeholder="Nombre visible"
                        className="bg-[#141414] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-200 mb-1.5">
                    Alcance y Notas
                  </label>
                  <textarea
                    rows={2}
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    className="w-full bg-[#1C1C1C] border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-gray-800">
                  <button
                    type="button"
                    onClick={() => setModalAbierto(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={guardando}
                    className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-5 py-2.5 rounded-xl text-xs font-extrabold cursor-pointer disabled:opacity-50"
                  >
                    {guardando ? 'Guardando...' : 'Guardar Presupuesto'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      <VisorArchivoModal
        abierto={Boolean(visorArchivo)}
        url={visorArchivo?.url || ''}
        titulo={visorArchivo?.titulo}
        onClose={() => setVisorArchivo(null)}
      />

      {/* ALARMA SONORA CONTINUA EMERGENTE */}
      {alarmaSonando &&
        montado &&
        createPortal(
          <div className="fixed top-6 right-6 bg-[#1C1C1C] border-2 border-[#EAB308] shadow-2xl rounded-2xl p-4 w-80 z-[10000] space-y-2.5 animate-pulse">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#EAB308]">
                🔔 ALARMA ACTIVA · PRESUPUESTO
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
              {alarmaSonando.codigo} · {alarmaSonando.titulo}
            </div>
            <div className="text-xs text-gray-300">
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
                    .from('presupuestos')
                    .update({ alarma_activa: false })
                    .eq('id', item.id);
                  setPresupuestos((prev) =>
                    prev.map((p) => (p.id === item.id ? { ...p, alarma_activa: false } : p))
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