"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { moverAPapelera } from '@/lib/papelera';
import VisorArchivoModal from '@/components/VisorArchivoModal';
import {
  Plus,
  Search,
  List,
  Columns,
  Calendar as CalendarIcon,
  Flag,
  ChevronDown,
  Edit3,
  Trash2,
  X,
  CheckCircle2,
  User,
  Upload,
  Link2,
  FileText,
  Loader2,
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
  if (s.includes(',')) return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
  const puntos = (s.match(/\./g) || []).length;
  if (puntos > 1) return parseFloat(s.replace(/\./g, '')) || 0;
  return parseFloat(s) || 0;
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

  // Visor PDF integrado
  const [visorArchivo, setVisorArchivo] = useState<{ url: string; titulo: string } | null>(null);

  // Modal Nuevo / Editar Presupuesto
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

  // Dropdowns personalizados en modal
  const [dropPersonaAbierto, setDropPersonaAbierto] = useState(false);
  const [dropPrioridadAbierto, setDropPrioridadAbierto] = useState(false);
  const refPersona = useRef<HTMLDivElement>(null);
  const refPrioridad = useRef<HTMLDivElement>(null);

  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setMontado(true);
  }, []);

  useEffect(() => {
    setPresupuestos(presupuestosIniciales);
  }, [presupuestosIniciales]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (refPersona.current && !refPersona.current.contains(e.target as Node)) {
        setDropPersonaAbierto(false);
      }
      if (refPrioridad.current && !refPrioridad.current.contains(e.target as Node)) {
        setDropPrioridadAbierto(false);
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
    setModalAbierto(true);
  };

  const abrirEditar = (p: any) => {
    setEditando(p);
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

  // Rango temporal para vista Cronograma
  const rangoCrono = useMemo(() => {
    const fechas: number[] = [Date.now()];
    filtrados.forEach((p) => {
      [p.fecha_llegada, p.fecha_inicio, p.fecha_limite].forEach((f) => {
        if (f) {
          const t = new Date(f + 'T00:00:00').getTime();
          if (!Number.isNaN(t)) fechas.push(t);
        }
      });
    });
    const minD = new Date(Math.min(...fechas));
    minD.setDate(1);
    const maxD = new Date(Math.max(...fechas));
    maxD.setDate(1);
    maxD.setMonth(maxD.getMonth() + 2);

    const meses: { key: string; label: string; start: number; end: number }[] = [];
    const cur = new Date(minD);
    while (cur <= maxD && meses.length < 18) {
      const y = cur.getFullYear();
      const m = cur.getMonth();
      meses.push({
        key: `${y}-${m}`,
        label: cur.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' }),
        start: new Date(y, m, 1).getTime(),
        end: new Date(y, m + 1, 1).getTime(),
      });
      cur.setMonth(cur.getMonth() + 1);
    }
    return {
      meses,
      startMs: meses[0]?.start || Date.now(),
      endMs: meses[meses.length - 1]?.end || Date.now() + 86400000 * 90,
    };
  }, [filtrados]);

  const personaSeleccionadaObj = useMemo(
    () => equipo.find((m) => m.nombre === asignadoNombre),
    [equipo, asignadoNombre]
  );

  return (
    <div className="min-h-screen text-white p-8 font-sans">
      {/* ENCABEZADO */}
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

      {/* SELECTOR DE VISTAS */}
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

      {/* BARRA DE FILTROS */}
      <div className="bg-[#242424] border border-white/10 rounded-2xl p-4 mb-6 flex flex-wrap items-center gap-3">
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

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="bg-[#181818] border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-white cursor-pointer"
        >
          <option value="Todos">Estado: Todos</option>
          {ESTADOS_PRESUPUESTO.map((est) => (
            <option key={est} value={est}>
              {est}
            </option>
          ))}
        </select>

        <select
          value={filtroPrioridad}
          onChange={(e) => setFiltroPrioridad(e.target.value)}
          className="bg-[#181818] border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-white cursor-pointer"
        >
          <option value="Todas">Prioridad: Todas</option>
          {PRIORIDADES_PRESUPUESTO.map((pr) => (
            <option key={pr} value={pr}>
              {pr}
            </option>
          ))}
        </select>

        <select
          value={filtroAsignado}
          onChange={(e) => setFiltroAsignado(e.target.value)}
          className="bg-[#181818] border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-white cursor-pointer"
        >
          <option value="Todos">Asignado: Todos</option>
          {equipo.map((m) => (
            <option key={m.id} value={m.nombre}>
              {m.nombre}
            </option>
          ))}
        </select>
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
                      <tr key={p.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-extrabold text-white">
                            <span className="text-[#EAB308] mr-1.5">{p.codigo}</span>
                            {p.titulo}
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

                        <td className="py-3.5 px-4">
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
                                onClick={() =>
                                  setVisorArchivo({
                                    url: p.archivo_url,
                                    titulo: p.archivo_nombre || `${p.codigo} · ${p.titulo}`,
                                  })
                                }
                                className="px-2 py-1 rounded-lg bg-blue-500/15 border border-blue-500/40 text-blue-400 hover:bg-blue-500/25 font-bold inline-flex items-center gap-1 cursor-pointer"
                                title={p.archivo_nombre || 'Ver archivo adjunto'}
                              >
                                <FileText className="w-3.5 h-3.5" /> PDF
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => abrirEditar(p)}
                              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-300 cursor-pointer"
                              title="Editar"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => eliminarPresupuesto(p)}
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

      {/* VISTA 2: TABLERO KANBAN POR ESTADO */}
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
                          className="bg-[#181818] border border-white/10 hover:border-white/25 rounded-xl p-3.5 space-y-2.5 shadow"
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
                                  onClick={() =>
                                    setVisorArchivo({
                                      url: p.archivo_url,
                                      titulo: p.archivo_nombre || p.titulo,
                                    })
                                  }
                                  className="p-1 rounded hover:bg-blue-950/60 text-blue-400 cursor-pointer"
                                  title="Ver PDF"
                                >
                                  <FileText className="w-3 h-3" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => abrirEditar(p)}
                                className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white cursor-pointer"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => eliminarPresupuesto(p)}
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
        <div className="bg-[#242424] border border-white/10 rounded-2xl p-5 shadow-xl overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[960px]">
            <thead>
              <tr className="bg-[#181818] border-b border-white/10 text-[10px] font-extrabold uppercase tracking-wider text-gray-300">
                <th className="py-3 px-3 w-56">PRESUPUESTO</th>
                <th className="py-3 px-2 w-28">INICIO</th>
                <th className="py-3 px-2 w-28">LÍMITE</th>
                <th className="py-3 px-2 w-32">ESTADO</th>
                <th className="py-2 px-2">
                  <div className="grid grid-flow-col auto-cols-fr text-center border-l border-white/10">
                    {rangoCrono.meses.map((m) => (
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
              {filtrados.map((p) => {
                const iniStr = p.fecha_inicio || p.fecha_llegada;
                const finStr = p.fecha_limite || iniStr;
                const estStyle = estiloEstado(p.estado);

                let leftPct = 0;
                let widthPct = 0;
                if (iniStr) {
                  const s = new Date(iniStr + 'T00:00:00').getTime();
                  const e = finStr ? new Date(finStr + 'T23:59:59').getTime() : s + 86400000 * 7;
                  const span = Math.max(1, rangoCrono.endMs - rangoCrono.startMs);
                  leftPct = Math.max(0, Math.min(96, ((s - rangoCrono.startMs) / span) * 100));
                  const rightPct = Math.max(
                    leftPct + 3,
                    Math.min(100, ((e - rangoCrono.startMs) / span) * 100)
                  );
                  widthPct = Math.max(3, rightPct - leftPct);
                }

                return (
                  <tr key={p.id} className="hover:bg-white/5">
                    <td className="py-3 px-3">
                      <div className="font-extrabold text-white truncate max-w-[200px]">
                        {p.titulo}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {p.codigo} · {p.asignado_nombre || 'Sin asignar'}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-[11px] text-gray-300">
                      {formatearFechaCorta(iniStr)}
                    </td>
                    <td className="py-3 px-2 text-[11px] font-bold text-white">
                      {formatearFechaCorta(p.fecha_limite)}
                    </td>
                    <td className="py-3 px-2">
                      <span
                        className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${estStyle.badge}`}
                      >
                        {p.estado}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <div className="relative h-7 bg-[#181818] rounded-lg border border-white/10 overflow-hidden">
                        {iniStr && (
                          <div
                            style={{
                              left: `${leftPct}%`,
                              width: `${widthPct}%`,
                              backgroundColor: estStyle.bar,
                            }}
                            className="absolute top-1.5 bottom-1.5 rounded-md shadow"
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL NUEVO / EDITAR PRESUPUESTO */}
      {modalAbierto &&
        montado &&
        createPortal(
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
            <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
              <div className="px-6 pt-5 pb-4 border-b border-gray-800 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {editando ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Asignación de responsable, fechas clave, prioridad, estado y archivo PDF
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

              <form onSubmit={guardarPresupuesto} className="px-6 py-5 overflow-y-auto space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Código</label>
                    <input
                      type="text"
                      value={codigo}
                      onChange={(e) => setCodigo(e.target.value)}
                      className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white font-bold"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Título / Obra a Presupuestar *
                    </label>
                    <input
                      type="text"
                      required
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      placeholder="Ej. Shell Enerse"
                      className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Cliente</label>
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

                  {/* DESPLEGABLE DE TIPOLOGÍA COMO EN PROYECTO */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Tipología
                    </label>
                    <select
                      value={tipologia}
                      onChange={(e) => setTipologia(e.target.value)}
                      className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white"
                    >
                      {TIPOLOGIAS_OBRA.map((tip) => (
                        <option key={tip} value={tip}>
                          {tip}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Monto Estimado
                    </label>
                    <div className="flex gap-1.5">
                      <select
                        value={moneda}
                        onChange={(e) => setMoneda(e.target.value as 'USD' | 'ARS')}
                        className="bg-[#121212] border border-gray-800 rounded-lg px-2 py-2 text-xs font-bold text-white"
                      >
                        <option value="USD">USD</option>
                        <option value="ARS">ARS</option>
                      </select>
                      <input
                        type="text"
                        value={montoTexto}
                        onChange={(e) => setMontoTexto(formatearMilesDecimales(e.target.value))}
                        placeholder="Ej. 45.000,00"
                        className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs font-bold text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* PERSONA ASIGNADA + PRIORIDAD + ESTADO */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div ref={refPersona} className="relative">
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Persona asignada
                    </label>
                    <button
                      type="button"
                      onClick={() => setDropPersonaAbierto((v) => !v)}
                      className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-white flex items-center justify-between gap-2 cursor-pointer"
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
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    </button>

                    {dropPersonaAbierto && (
                      <div className="absolute left-0 right-0 mt-1 bg-[#181818] border border-gray-700 rounded-xl shadow-2xl py-1.5 z-50 max-h-52 overflow-y-auto">
                        {equipo.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setAsignadoNombre(m.nombre);
                              setDropPersonaAbierto(false);
                            }}
                            className="w-full px-3 py-2 text-left text-xs text-white hover:bg-white/10 flex items-center gap-2.5 cursor-pointer"
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
                            <span className="truncate font-semibold">{m.nombre}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div ref={refPrioridad} className="relative">
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Prioridad
                    </label>
                    <button
                      type="button"
                      onClick={() => setDropPrioridadAbierto((v) => !v)}
                      className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <span className="inline-flex items-center gap-2 font-semibold">
                        <Flag
                          className="w-3.5 h-3.5"
                          style={{
                            color: estiloPrioridad(prioridad).fill,
                            fill: estiloPrioridad(prioridad).fill,
                          }}
                        />
                        {prioridad}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                    </button>

                    {dropPrioridadAbierto && (
                      <div className="absolute left-0 right-0 mt-1 bg-[#181818] border border-gray-700 rounded-xl shadow-2xl py-1.5 z-50">
                        <div className="px-3 py-1 text-[10px] font-bold text-gray-400">
                          Prioridad
                        </div>
                        {PRIORIDADES_PRESUPUESTO.map((pr) => {
                          const st = estiloPrioridad(pr);
                          return (
                            <button
                              key={pr}
                              type="button"
                              onClick={() => {
                                setPrioridad(pr);
                                setDropPrioridadAbierto(false);
                              }}
                              className="w-full px-3 py-2 text-left text-xs text-white hover:bg-white/10 flex items-center gap-2.5 cursor-pointer"
                            >
                              <Flag
                                className="w-3.5 h-3.5"
                                style={{ color: st.fill, fill: st.fill }}
                              />
                              <span className="font-semibold">{pr}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Estado</label>
                    <select
                      value={estado}
                      onChange={(e) => setEstado(e.target.value)}
                      className={`w-full border rounded-lg px-3 py-2 text-xs font-extrabold cursor-pointer ${
                        estiloEstado(estado).badge
                      }`}
                    >
                      {ESTADOS_PRESUPUESTO.map((est) => (
                        <option key={est} value={est} className="bg-[#181818] text-white">
                          {est}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* FECHAS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Fecha de llegada
                    </label>
                    <input
                      type="date"
                      value={fechaLlegada}
                      onChange={(e) => setFechaLlegada(e.target.value)}
                      className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Fecha inicio
                    </label>
                    <input
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Fecha límite
                    </label>
                    <input
                      type="date"
                      value={fechaLimite}
                      onChange={(e) => setFechaLimite(e.target.value)}
                      className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white [color-scheme:dark]"
                    />
                  </div>
                </div>

                {/* CARGA DE PDF DEL PRESUPUESTO + ENLACE EXTERNO (ESTILO BITÁCORA) */}
                <div className="bg-[#141414] border border-gray-800 rounded-xl p-4 space-y-3">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-[#EAB308]" />
                      Documento del Presupuesto (PDF / Cómputo / Drive)
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Subí el PDF del presupuesto desde tu dispositivo o pegá abajo un enlace externo (Google Drive, Dropbox, OneDrive).
                    </p>
                  </div>

                  <label className="border-2 border-dashed border-gray-700 hover:border-[#EAB308] rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-[#121212]">
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
                    <label className="text-[11px] font-bold text-gray-300 flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5 text-[#EAB308]" />
                      O pegar enlace externo (Google Drive, Dropbox, OneDrive):
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={archivoUrl}
                        onChange={(e) => setArchivoUrl(e.target.value)}
                        placeholder="https://drive.google.com/..."
                        className="md:col-span-2 bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white"
                      />
                      <input
                        type="text"
                        value={archivoNombre}
                        onChange={(e) => setArchivoNombre(e.target.value)}
                        placeholder="Nombre visible"
                        className="bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Alcance y Notas
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
                    {guardando ? 'Guardando...' : 'Guardar Presupuesto'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* VISOR PDF INTEGRADO */}
      <VisorArchivoModal
        abierto={Boolean(visorArchivo)}
        url={visorArchivo?.url || ''}
        titulo={visorArchivo?.titulo}
        onClose={() => setVisorArchivo(null)}
      />

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