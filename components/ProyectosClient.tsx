"use client";

import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { moverAPapelera } from '@/lib/papelera';
import {
  Plus,
  List,
  Columns3,
  CalendarDays,
  LayoutGrid,
  Upload,
  Download,
  Lock,
  Search,
  Calendar,
  Pencil,
  ArrowRight,
  X,
  Image as ImageIcon,
  User,
  UserCheck,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Check,
  Folder,
  CheckCircle2,
  Trash2,
  ExternalLink,
} from 'lucide-react';

type Vista = 'lista' | 'kanban' | 'cronograma' | 'tarjetas';
type EscalaTiempo = 'Semana' | 'Mes' | 'Trimestre' | 'Semestre' | 'Año';

const ETAPAS = [
  { nombre: 'Relevamiento y Concepto', progreso: 15 },
  { nombre: 'Anteproyecto y Diseño', progreso: 30 },
  { nombre: 'Proyecto Ejecutivo y Detalles', progreso: 50 },
  { nombre: 'Presupuesto y Compras', progreso: 70 },
  { nombre: 'Dirección y Ejecución de Obra', progreso: 85 },
  { nombre: 'Entrega y Post-Obra', progreso: 100 },
];

const TIPOLOGIAS = [
  'Vivienda Unifamiliar',
  'Vivienda Multifamiliar',
  'Estación de Servicio',
  'Local Comercial',
  'Oficinas / Corporativo',
  'Diseño de Interiores',
  'Paisajismo / Exteriores',
  'Reforma / Ampliación',
  'Industrial / Galpón',
];

const ESTADOS = ['En Diseño', 'En Curso', 'Pausado', 'Finalizado'];

const INTEGRANTES = [
  { nombre: 'Alejandro Fego', especialidad: 'Dirección de Proyecto y Diseño' },
  { nombre: 'Arq. Joana Cuevas', especialidad: 'Arquitecto Proyectista' },
  { nombre: 'Lautaro Godoy', especialidad: 'Arquitecto Proyectista' },
  { nombre: 'Equipo MB', especialidad: 'Estudio de Arquitectura' },
];

export default function ProyectosClient({
  proyectosIniciales = [],
  clientes = [],
}: {
  proyectosIniciales: any[];
  clientes: any[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [montado, setMontado] = useState(false);

  // Vistas y filtros
  const [vista, setVista] = useState<Vista>('tarjetas');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [filtroEtapa, setFiltroEtapa] = useState('Todas');
  const [filtroResponsable, setFiltroResponsable] = useState('Todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState('todos');
  const [escalaCronograma, setEscalaCronograma] = useState<EscalaTiempo>('Semestre');

  // Paginación
  const [pagina, setPagina] = useState(1);
  const [filasPorPagina, setFilasPorPagina] = useState(10);

  // Modal Nuevo / Editar Proyecto
  const [modalAbierto, setModalAbierto] = useState(false);
  const [proyectoEditando, setProyectoEditando] = useState<any | null>(null);
  const [mostrarPortada, setMostrarPortada] = useState(false);
  const [mostrarMasDatos, setMostrarMasDatos] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Desplegable personalizado de Cliente
  const [dropdownClienteAbierto, setDropdownClienteAbierto] = useState(false);
  const [busquedaCliente, setBusquedaCliente] = useState('');

  // Desplegable personalizado de Responsable
  const [dropdownResponsableAbierto, setDropdownResponsableAbierto] = useState(false);
  const [busquedaResponsable, setBusquedaResponsable] = useState('');

  // Campos del formulario
  const hoy = new Date().toISOString().split('T')[0];
  const [nombre, setNombre] = useState('');
  const [portadaUrl, setPortadaUrl] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [responsable, setResponsable] = useState('Alejandro Fego');
  const [tipologia, setTipologia] = useState('Vivienda Unifamiliar');
  const [etapa, setEtapa] = useState('Relevamiento y Concepto');
  const [estado, setEstado] = useState('En Diseño');
  const [moneda, setMoneda] = useState('ARS');
  const [presupuesto, setPresupuesto] = useState('');
  const [entregaEstimada, setEntregaEstimada] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [driveUrl, setDriveUrl] = useState('');
  const [codigo, setCodigo] = useState('');
  const [superficie, setSuperficie] = useState('');
  const [fechaInicio, setFechaInicio] = useState(hoy);
  const [proximaVisita, setProximaVisita] = useState('');
  const [notas, setNotas] = useState('');

  useEffect(() => {
    setMontado(true);
  }, []);

  const mostrarToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Cliente actualmente seleccionado y lista filtrada
  const clienteActual = useMemo(
    () => clientes.find((c) => String(c.id) === String(clienteId)) || null,
    [clientes, clienteId]
  );

  const clientesFiltrados = useMemo(() => {
    const q = busquedaCliente.toLowerCase().trim();
    if (!q) return clientes;
    return clientes.filter(
      (c) =>
        (c.codigo || '').toLowerCase().includes(q) ||
        (c.nombre || '').toLowerCase().includes(q) ||
        (c.tipo || '').toLowerCase().includes(q)
    );
  }, [clientes, busquedaCliente]);

  // Integrantes filtrados para el desplegable de Responsable
  const integrantesFiltrados = useMemo(() => {
    const q = busquedaResponsable.toLowerCase().trim();
    if (!q) return INTEGRANTES;
    return INTEGRANTES.filter(
      (i) =>
        i.nombre.toLowerCase().includes(q) ||
        i.especialidad.toLowerCase().includes(q)
    );
  }, [busquedaResponsable]);

  const obtenerEnlaceMaps = (texto: string) => {
    const limpio = texto.trim();
    if (/^https?:\/\//i.test(limpio)) return limpio;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(limpio)}`;
  };

  const manejarCambioPresupuesto = (valor: string) => {
    const limpio = valor.replace(/[^0-9,]/g, '');
    const partes = limpio.split(',');
    const parteEntera = partes[0]
      .replace(/^0+(?=\d)/, '')
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    if (partes.length > 1) {
      setPresupuesto(`${parteEntera || '0'},${partes[1].slice(0, 2)}`);
    } else {
      setPresupuesto(parteEntera);
    }
  };

  const formatearMonto = (valor: number) => {
    return Number(valor || 0).toLocaleString('es-AR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  const formatearFecha = (fechaStr: string | null) => {
    if (!fechaStr) return '—';
    const partes = fechaStr.split('-');
    if (partes.length !== 3) return fechaStr;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  };

  const obtenerProgresoEtapa = (nombreEtapa: string) => {
    const encontrada = ETAPAS.find((e) => e.nombre === nombreEtapa);
    return encontrada ? encontrada.progreso : 15;
  };

  const generarSiguienteCodigo = () => {
    const anio = new Date().getFullYear();
    const num = String(proyectosIniciales.length + 1).padStart(2, '0');
    return `OBR-${anio}-${num}`;
  };

  const abrirModalNuevo = () => {
    setProyectoEditando(null);
    setNombre('');
    setPortadaUrl('');
    setClienteId('');
    setResponsable('Alejandro Fego');
    setTipologia('Vivienda Unifamiliar');
    setEtapa('Relevamiento y Concepto');
    setEstado('En Diseño');
    setMoneda('ARS');
    setPresupuesto('');
    setEntregaEstimada('');
    setUbicacion('');
    setDriveUrl('');
    setCodigo('');
    setSuperficie('');
    setFechaInicio(new Date().toISOString().split('T')[0]);
    setProximaVisita('');
    setNotas('');
    setMostrarPortada(false);
    setMostrarMasDatos(false);
    setDropdownClienteAbierto(false);
    setBusquedaCliente('');
    setDropdownResponsableAbierto(false);
    setBusquedaResponsable('');
    setModalAbierto(true);
  };

  const abrirModalEditar = (proy: any, enfocarPortada = false) => {
    setProyectoEditando(proy);
    setNombre(proy.nombre || '');
    setPortadaUrl(proy.portada_url || '');
    setClienteId(proy.cliente_id ? String(proy.cliente_id) : '');
    setResponsable(proy.responsable || 'Alejandro Fego');
    setTipologia(proy.tipologia || 'Vivienda Unifamiliar');
    setEtapa(proy.etapa || 'Relevamiento y Concepto');
    setEstado(proy.estado || 'En Diseño');
    setMoneda(proy.moneda || 'ARS');
    setPresupuesto(proy.presupuesto ? formatearMonto(proy.presupuesto) : '');
    setEntregaEstimada(proy.entrega_estimada || '');
    setUbicacion(proy.ubicacion || '');
    setDriveUrl(proy.drive_url || '');
    setCodigo(proy.codigo || '');
    setSuperficie(proy.superficie ? String(proy.superficie) : '');
    setFechaInicio(proy.fecha_inicio || hoy);
    setProximaVisita(proy.proxima_visita || '');
    setNotas(proy.notas || '');
    setMostrarPortada(enfocarPortada || Boolean(proy.portada_url));
    setMostrarMasDatos(false);
    setDropdownClienteAbierto(false);
    setBusquedaCliente('');
    setDropdownResponsableAbierto(false);
    setBusquedaResponsable('');
    setModalAbierto(true);
  };

  const manejarSubidaArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    const lector = new FileReader();
    lector.onloadend = () => {
      if (typeof lector.result === 'string') {
        setPortadaUrl(lector.result);
      }
    };
    lector.readAsDataURL(archivo);
  };

  const guardarProyecto = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);

    const clienteSeleccionado = clientes.find((c) => String(c.id) === String(clienteId));
    const presupuestoNum = parseFloat(presupuesto.replace(/\./g, '').replace(',', '.')) || 0;
    const superficieNum = parseFloat(superficie.replace(',', '.')) || 0;
    const codigoFinal = codigo.trim() || (proyectoEditando ? proyectoEditando.codigo : generarSiguienteCodigo());

    const datos = {
      codigo: codigoFinal,
      nombre: nombre.trim(),
      portada_url: portadaUrl.trim() || null,
      cliente_id: clienteId || null,
      cliente_nombre: clienteSeleccionado ? clienteSeleccionado.nombre : null,
      responsable,
      tipologia,
      etapa,
      estado,
      moneda,
      presupuesto: presupuestoNum,
      fecha_inicio: fechaInicio || null,
      entrega_estimada: entregaEstimada || null,
      ubicacion: ubicacion.trim() || null,
      drive_url: driveUrl.trim() || null,
      superficie: superficieNum,
      proxima_visita: proximaVisita || null,
      notas: notas.trim() || null,
    };

    let error;
    if (proyectoEditando) {
      const res = await supabase.from('proyectos').update(datos).eq('id', proyectoEditando.id);
      error = res.error;
    } else {
      const res = await supabase.from('proyectos').insert([datos]);
      error = res.error;
    }

    setCargando(false);

    if (!error) {
      setModalAbierto(false);
      mostrarToast(proyectoEditando ? 'Proyecto actualizado' : 'Proyecto creado correctamente');
      router.refresh();
    } else {
      alert('Error al guardar el proyecto: ' + error.message);
    }
  };

  // Enviar proyecto a papelera
  const eliminarProyecto = async () => {
    if (!proyectoEditando) return;
    setCargando(true);
    try {
      await moverAPapelera({
        tabla: 'proyectos',
        modulo: 'Proyectos',
        titulo: proyectoEditando.nombre || 'Proyecto sin nombre',
        subtitulo: `${proyectoEditando.codigo || ''} ${
          proyectoEditando.cliente_nombre ? `· ${proyectoEditando.cliente_nombre}` : ''
        }`.trim(),
        registro: proyectoEditando,
      });
      setModalAbierto(false);
      mostrarToast('Proyecto enviado a papelera');
      router.refresh();
    } catch (error: any) {
      alert('Error al mover a papelera: ' + error.message);
    } finally {
      setCargando(false);
    }
  };

  const moverEtapaKanban = async (proy: any, direccion: -1 | 1) => {
    const idxActual = ETAPAS.findIndex((e) => e.nombre === proy.etapa);
    const nuevoIdx = idxActual + direccion;
    if (nuevoIdx < 0 || nuevoIdx >= ETAPAS.length) return;

    const nuevaEtapa = ETAPAS[nuevoIdx].nombre;
    const { error } = await supabase
      .from('proyectos')
      .update({ etapa: nuevaEtapa })
      .eq('id', proy.id);

    if (!error) {
      mostrarToast(`Movido a ${nuevaEtapa}`);
      router.refresh();
    } else {
      alert('Error al mover etapa: ' + error.message);
    }
  };

  const proyectosFiltrados = useMemo(() => {
    return proyectosIniciales.filter((p) => {
      const q = busqueda.toLowerCase().trim();
      const coincideBusqueda =
        !q ||
        (p.codigo || '').toLowerCase().includes(q) ||
        (p.nombre || '').toLowerCase().includes(q) ||
        (p.cliente_nombre || '').toLowerCase().includes(q) ||
        (p.ubicacion || '').toLowerCase().includes(q);

      const coincideEstado = filtroEstado === 'Todos' || p.estado === filtroEstado;
      const coincideEtapa = filtroEtapa === 'Todas' || p.etapa === filtroEtapa;
      const coincideResp = filtroResponsable === 'Todos' || p.responsable === filtroResponsable;

      return coincideBusqueda && coincideEstado && coincideEtapa && coincideResp;
    });
  }, [proyectosIniciales, busqueda, filtroEstado, filtroEtapa, filtroResponsable]);

  const totalPaginas = Math.max(1, Math.ceil(proyectosFiltrados.length / filasPorPagina));
  const inicio = (pagina - 1) * filasPorPagina;
  const proyectosPaginados = proyectosFiltrados.slice(inicio, inicio + filasPorPagina);

  const mesesCronograma = useMemo(() => {
    const fechaBase = new Date();
    const meses = [];
    for (let i = -4; i <= 2; i++) {
      const d = new Date(fechaBase.getFullYear(), fechaBase.getMonth() + i, 1);
      const nombreMes = d.toLocaleDateString('es-AR', { month: 'long' });
      const anio = d.getFullYear();
      meses.push({
        label: i === -4 ? `${nombreMes} de ${anio}` : nombreMes,
        dias: [1, 8, 15, 22, 29],
        esMesActual: i === 0,
      });
    }
    return meses;
  }, []);

  const diaHoy = new Date().getDate();

  return (
    <div className="min-h-screen text-white p-8 font-sans">
      {/* CABECERA SUPERIOR */}
      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Proyectos y Obras</h1>
          <p className="text-sm text-gray-300 mt-1">
            Gestión integral para estudios de arquitectura, diseño de interiores, exteriores y dirección de obra
          </p>
        </div>

        <button
          onClick={abrirModalNuevo}
          className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors shadow-[0_0_20px_rgba(234,179,8,0.2)] cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" /> Nuevo proyecto
        </button>
      </div>

      {/* BARRA DE VISTAS + ACCIONES SECUNDARIAS */}
      <div className="flex flex-wrap justify-between items-center gap-4 pb-5 border-b border-white/10 mb-6">
        <div className="inline-flex items-center bg-[#242424]/85 backdrop-blur-md border border-white/10 rounded-xl p-1 gap-1">
          <button
            onClick={() => setVista('lista')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              vista === 'lista'
                ? 'bg-[#EAB308] text-black font-bold shadow'
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <List className="w-4 h-4" /> Lista
          </button>
          <button
            onClick={() => setVista('kanban')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              vista === 'kanban'
                ? 'bg-[#EAB308] text-black font-bold shadow'
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Columns3 className="w-4 h-4" /> Tablero Kanban
          </button>
          <button
            onClick={() => setVista('cronograma')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              vista === 'cronograma'
                ? 'bg-[#EAB308] text-black font-bold shadow'
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <CalendarDays className="w-4 h-4" /> Cronograma
          </button>
          <button
            onClick={() => setVista('tarjetas')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              vista === 'tarjetas'
                ? 'bg-[#EAB308] text-black font-bold shadow'
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <LayoutGrid className="w-4 h-4" /> Tarjetas
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          <button className="bg-[#242424]/85 hover:bg-white/10 border border-white/10 text-gray-200 px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer">
            <Upload className="w-3.5 h-3.5" /> Importar
          </button>
          <button className="bg-[#242424]/85 hover:bg-white/10 border border-white/10 text-gray-200 px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer">
            <Download className="w-3.5 h-3.5" /> Exportar
          </button>
          <div className="w-px h-5 bg-white/10 mx-1" />
          <button className="bg-[#242424]/85 hover:bg-white/10 border border-white/10 text-gray-200 px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer">
            <Lock className="w-3.5 h-3.5" /> Restringir vista
          </button>
        </div>
      </div>

      {/* PANEL DE BÚSQUEDA Y FILTROS */}
      <div className="bg-[#242424]/85 backdrop-blur-md border border-white/10 rounded-2xl p-4 mb-6 shadow-xl">
        <div className="flex flex-wrap gap-3 pb-4 border-b border-white/10">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setPagina(1);
              }}
              placeholder="Buscar proyecto por código (OBR-2026), nombre, cliente o ubicación..."
              className="w-full bg-[#181818]/90 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-white/25"
            />
          </div>

          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="bg-[#181818]/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-200 focus:outline-none cursor-pointer"
          >
            <option value="Todos">Estado: Todos</option>
            {ESTADOS.map((est) => (
              <option key={est} value={est}>{est}</option>
            ))}
          </select>

          <select
            value={filtroEtapa}
            onChange={(e) => setFiltroEtapa(e.target.value)}
            className="bg-[#181818]/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-200 focus:outline-none cursor-pointer"
          >
            <option value="Todas">Etapa: Todas</option>
            {ETAPAS.map((et) => (
              <option key={et.nombre} value={et.nombre}>{et.nombre}</option>
            ))}
          </select>

          <select
            value={filtroResponsable}
            onChange={(e) => setFiltroResponsable(e.target.value)}
            className="bg-[#181818]/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-200 focus:outline-none cursor-pointer"
          >
            <option value="Todos">Responsable: Todos</option>
            {INTEGRANTES.map((i) => (
              <option key={i.nombre} value={i.nombre}>{i.nombre}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-between items-center pt-3">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-4 h-4 text-[#EAB308]" />
            <select
              value={filtroPeriodo}
              onChange={(e) => setFiltroPeriodo(e.target.value)}
              className="bg-[#181818]/90 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none cursor-pointer"
            >
              <option value="todos">Período: Todos</option>
              <option value="mes">Este mes</option>
              <option value="anio">Este año</option>
            </select>
          </div>
          <span className="text-xs text-gray-300">
            {proyectosFiltrados.length} {proyectosFiltrados.length === 1 ? 'proyecto' : 'proyectos'}
          </span>
        </div>
      </div>

      {/* ================================================================= */}
      {/* VISTA 1: TARJETAS                                                 */}
      {/* ================================================================= */}
      {vista === 'tarjetas' && (
        <>
          {proyectosPaginados.length === 0 ? (
            <div className="bg-[#242424]/85 backdrop-blur-md border border-white/10 rounded-2xl p-12 text-center">
              <p className="text-gray-300 text-sm">No hay proyectos registrados todavía. Tocá &quot;+ Nuevo proyecto&quot; para crear el primero.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
              {proyectosPaginados.map((p) => {
                const progreso = obtenerProgresoEtapa(p.etapa);
                return (
                  <div
                    key={p.id}
                    onClick={() => router.push(`/proyectos/${p.codigo}`)}
                    className="bg-[#242424]/85 backdrop-blur-md border border-white/10 hover:border-[#EAB308]/70 rounded-2xl overflow-hidden shadow-xl flex flex-col transition-all cursor-pointer group"
                  >
                    <div className="relative h-44 bg-gradient-to-br from-[#232323] to-[#121212] overflow-hidden">
                      {p.portada_url ? (
                        <img
                          src={p.portada_url}
                          alt={p.nombre}
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-700">
                          <ImageIcon className="w-12 h-12" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                      <span className="absolute top-3 left-3 bg-black/70 border border-[#EAB308]/50 text-[#EAB308] px-2.5 py-1 rounded-lg text-[11px] font-bold">
                        {p.codigo}
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          abrirModalEditar(p, true);
                        }}
                        className="absolute top-3 right-3 bg-black/70 hover:bg-black/90 border border-gray-700 text-gray-200 px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <ImageIcon className="w-3.5 h-3.5" /> Cambiar portada
                      </button>

                      <div className="absolute bottom-3 left-4 right-4">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-300">
                          {p.tipologia}
                        </div>
                        <h3 className="text-lg font-bold text-white truncate">{p.nombre}</h3>
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-400">
                            Comitente:{' '}
                            <strong className="text-white">{p.cliente_nombre || 'Particular'}</strong>
                          </span>
                          <span className="bg-cyan-950/60 border border-cyan-800/60 text-cyan-400 px-2.5 py-0.5 rounded-md text-[11px] font-semibold">
                            {p.estado}
                          </span>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="text-gray-400">
                              Etapa: <strong className="text-white">{p.etapa}</strong>
                            </span>
                            <span className="text-gray-300 font-semibold">{progreso}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#EAB308] rounded-full transition-all"
                              style={{ width: `${progreso}%` }}
                            />
                          </div>
                        </div>

                        {p.ubicacion && (
                          <a
                            href={obtenerEnlaceMaps(p.ubicacion)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            title="Abrir ubicación en Google Maps"
                            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#EAB308] hover:underline transition-colors max-w-full"
                          >
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-[#EAB308]" />
                            <span className="truncate">{p.ubicacion}</span>
                          </a>
                        )}
                      </div>

                      <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                        <span className="text-sm font-bold text-white">
                          {p.moneda} ${formatearMonto(p.presupuesto)}
                        </span>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              abrirModalEditar(p);
                            }}
                            className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                            title="Editar proyecto"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <Link
                            href={`/proyectos/${p.codigo}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs font-bold text-[#EAB308] hover:text-[#CA9A04] flex items-center gap-1"
                          >
                            Abrir ficha <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ================================================================= */}
      {/* VISTA 2: LISTA                                                    */}
      {/* ================================================================= */}
      {vista === 'lista' && (
        <div className="bg-[#242424]/85 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-xl mb-6">
          <h2 className="text-sm font-bold text-white mb-4">
            Proyectos ({proyectosFiltrados.length})
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  <th className="py-3 px-3">PROYECTO</th>
                  <th className="py-3 px-3">CLIENTE</th>
                  <th className="py-3 px-3">ETAPA</th>
                  <th className="py-3 px-3">ENTREGA</th>
                  <th className="py-3 px-3">ESTADO</th>
                  <th className="py-3 px-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-sm">
                {proyectosPaginados.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400 text-sm">
                      No hay proyectos para mostrar.
                    </td>
                  </tr>
                ) : (
                  proyectosPaginados.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => router.push(`/proyectos/${p.codigo}`)}
                      className="group cursor-pointer hover:bg-[#EAB308]/10 hover:outline hover:outline-1 hover:-outline-offset-1 hover:outline-[#EAB308]/60 transition-all"
                    >
                      <td className="py-4 px-3">
                        <div className="font-bold text-white group-hover:text-[#EAB308] transition-colors">
                          {p.nombre}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {p.codigo} · {p.tipologia}
                        </div>
                      </td>
                      <td className="py-4 px-3 text-gray-200">{p.cliente_nombre || 'Particular'}</td>
                      <td className="py-4 px-3 text-gray-200 max-w-[200px]">{p.etapa}</td>
                      <td className="py-4 px-3 text-gray-300">{formatearFecha(p.entrega_estimada)}</td>
                      <td className="py-4 px-3">
                        <span className="inline-flex items-center gap-1.5 bg-cyan-950/60 border border-cyan-800/60 text-cyan-400 px-3 py-1 rounded-full text-xs font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                          {p.estado}
                        </span>
                      </td>
                      <td className="py-4 px-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              abrirModalEditar(p);
                            }}
                            className="p-2 rounded-full border border-white/15 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <Link
                            href={`/proyectos/${p.codigo}`}
                            onClick={(e) => e.stopPropagation()}
                            className="px-3.5 py-2 rounded-xl border border-white/20 bg-white/5 text-white group-hover:border-[#EAB308] group-hover:bg-[#EAB308] group-hover:text-black text-xs font-semibold inline-flex items-center gap-1.5 transition-all"
                          >
                            Abrir ficha <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* VISTA 3: TABLERO KANBAN                                           */}
      {/* ================================================================= */}
      {vista === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4 mb-6">
          {ETAPAS.map((et, idx) => {
            const itemsEtapa = proyectosFiltrados.filter((p) => p.etapa === et.nombre);
            const totalM2 = itemsEtapa.reduce((acc, p) => acc + Number(p.superficie || 0), 0);

            return (
              <div
                key={et.nombre}
                className="min-w-[310px] w-[310px] bg-[#242424]/85 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex-shrink-0 flex flex-col"
              >
                <div className="flex justify-between items-start gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0" />
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
                      {et.nombre}
                    </h3>
                  </div>
                  <span className="bg-[#181818] border border-white/10 text-gray-300 px-2 py-0.5 rounded-md text-xs font-bold">
                    {itemsEtapa.length}
                  </span>
                </div>

                <div className="flex justify-between text-[11px] text-gray-400 pb-3 border-b border-white/10 mb-4">
                  <span>Etapa {idx + 1} de {ETAPAS.length}</span>
                  <span>{totalM2} m² totales</span>
                </div>

                {itemsEtapa.length === 0 ? (
                  <div className="border border-dashed border-white/15 rounded-xl p-8 text-center text-xs text-gray-400">
                    Sin obras en esta etapa
                  </div>
                ) : (
                  <div className="space-y-3">
                    {itemsEtapa.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => router.push(`/proyectos/${p.codigo}`)}
                        className="bg-[#181818]/90 border border-white/10 hover:border-[#EAB308]/60 rounded-xl overflow-hidden transition-colors cursor-pointer"
                      >
                        {p.portada_url && (
                          <div className="relative h-28 bg-gray-900">
                            <img src={p.portada_url} alt={p.nombre} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                            <span className="absolute bottom-2 left-2.5 text-[11px] font-bold text-white">
                              {p.codigo}
                            </span>
                          </div>
                        )}

                        <div className="p-3.5 space-y-2.5">
                          <div className="flex justify-between items-center">
                            <span className="bg-[#242424] border border-white/10 text-gray-300 px-2 py-0.5 rounded text-[10px] font-bold">
                              {p.codigo}
                            </span>
                            <span className="bg-cyan-950/60 border border-cyan-800/60 text-cyan-400 px-2 py-0.5 rounded text-[10px] font-semibold">
                              {p.estado}
                            </span>
                          </div>

                          <div>
                            <div className="text-sm font-bold text-white">{p.nombre}</div>
                            <div className="text-xs text-gray-400">{p.tipologia}</div>
                          </div>

                          <div className="space-y-1 text-[11px] text-gray-400 pt-2 border-t border-white/10">
                            <div className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-gray-500" />
                              Comitente: <strong className="text-gray-200">{p.cliente_nombre || 'Particular'}</strong>
                            </div>
                            {p.ubicacion && (
                              <a
                                href={obtenerEnlaceMaps(p.ubicacion)}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                title="Abrir ubicación en Google Maps"
                                className="flex items-center gap-1.5 text-gray-400 hover:text-[#EAB308] hover:underline transition-colors truncate"
                              >
                                <MapPin className="w-3.5 h-3.5 text-[#EAB308] flex-shrink-0" />
                                <span className="truncate">{p.ubicacion}</span>
                              </a>
                            )}
                          </div>

                          <div className="flex justify-between items-center text-xs pt-1">
                            <span className="text-gray-400 font-semibold">
                              {p.superficie ? `${p.superficie} m²` : 'S/M²'}
                            </span>
                            <span className="text-white font-bold">
                              {p.moneda} ${formatearMonto(p.presupuesto)}
                            </span>
                          </div>

                          <div className="flex justify-between items-center pt-2 border-t border-white/10">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                moverEtapaKanban(p, -1);
                              }}
                              disabled={idx === 0}
                              className="bg-[#242424] hover:bg-white/10 border border-white/10 text-blue-400 px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 disabled:opacity-30 cursor-pointer"
                            >
                              <ChevronLeft className="w-3 h-3" /> Ant.
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                moverEtapaKanban(p, 1);
                              }}
                              disabled={idx === ETAPAS.length - 1}
                              className="bg-[#242424] hover:bg-white/10 border border-white/10 text-blue-400 px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 disabled:opacity-30 cursor-pointer"
                            >
                              Sig. <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ================================================================= */}
      {/* VISTA 4: CRONOGRAMA                                               */}
      {/* ================================================================= */}
      {vista === 'cronograma' && (
        <div className="bg-[#242424]/85 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-xl mb-6">
          <div className="p-4 border-b border-white/10 flex flex-wrap justify-between items-center gap-4">
            <span className="bg-[#181818] border border-white/10 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#EAB308]" /> Cronograma
            </span>

            <div className="flex flex-wrap items-center gap-3">
              <button className="bg-[#181818] hover:bg-white/10 border border-white/10 text-gray-200 px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer">
                <Calendar className="w-3.5 h-3.5 text-[#EAB308]" /> Gestionar en el Calendario
              </button>

              <div className="inline-flex bg-[#181818] border border-white/10 rounded-xl p-1 gap-1">
                {(['Semana', 'Mes', 'Trimestre', 'Semestre', 'Año'] as EscalaTiempo[]).map((esc) => (
                  <button
                    key={esc}
                    onClick={() => setEscalaCronograma(esc)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      escalaCronograma === esc
                        ? 'bg-[#EAB308] text-black font-bold'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {esc}
                  </button>
                ))}
              </div>

              <div className="inline-flex items-center gap-2 text-xs text-gray-300 bg-[#181818] border border-white/10 rounded-xl px-3 py-1.5">
                <ChevronLeft className="w-3.5 h-3.5 cursor-pointer hover:text-white" />
                <span className="font-semibold">Hoy</span>
                <ChevronRight className="w-3.5 h-3.5 cursor-pointer hover:text-white" />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[900px] relative">
              <div className="grid grid-cols-7 border-b border-white/10 text-xs font-bold text-gray-300">
                {mesesCronograma.map((m, i) => (
                  <div key={i} className="px-3 py-2.5 border-r border-white/10 capitalize">
                    {m.label}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 border-b border-white/10 text-[11px] text-gray-400">
                {mesesCronograma.map((m, i) => (
                  <div key={i} className="grid grid-cols-5 px-2 py-2 border-r border-white/10 text-center">
                    {m.dias.map((d) => (
                      <span key={d}>{d}</span>
                    ))}
                  </div>
                ))}
              </div>

              <div
                className="absolute top-[64px] bottom-0 w-[2px] bg-rose-500 z-10 pointer-events-none"
                style={{ left: '66%' }}
              >
                <div className="w-6 h-6 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center -ml-[11px] -mt-3 shadow">
                  {diaHoy}
                </div>
              </div>

              <div className="min-h-[260px] p-4 space-y-4 relative">
                {proyectosFiltrados.map((p) => {
                  const progreso = obtenerProgresoEtapa(p.etapa);
                  return (
                    <div key={p.id} className="flex items-center gap-3 pl-[52%]">
                      <div
                        onClick={() => router.push(`/proyectos/${p.codigo}`)}
                        className="bg-[#181818] border border-white/15 hover:border-[#EAB308]/60 rounded-xl px-4 py-2.5 flex items-center gap-2.5 min-w-[170px] cursor-pointer transition-colors"
                      >
                        <Folder className="w-4 h-4 text-gray-400" />
                        <span className="text-xs font-bold text-white truncate">{p.nombre}</span>
                      </div>

                      <span className="text-xs font-bold text-white">{progreso} %</span>
                      <span className="bg-cyan-950/60 border border-cyan-800/60 text-cyan-400 px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        {p.estado}
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                        En planificación
                      </span>
                    </div>
                  );
                })}

                <button
                  onClick={abrirModalNuevo}
                  className="mt-6 ml-4 text-xs font-semibold text-gray-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> + Nuevo ítem
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BARRA DE PAGINACIÓN (para Tarjetas y Lista) */}
      {(vista === 'tarjetas' || vista === 'lista') && (
        <div className="bg-[#242424]/85 backdrop-blur-md border border-white/10 rounded-2xl px-5 py-3.5 flex flex-wrap justify-between items-center gap-4 text-xs text-gray-300">
          <div className="flex items-center gap-3">
            <span>
              Mostrando <strong className="text-white">{proyectosFiltrados.length === 0 ? 0 : inicio + 1}–{Math.min(inicio + filasPorPagina, proyectosFiltrados.length)}</strong> de <strong className="text-white">{proyectosFiltrados.length}</strong>
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
                className="bg-[#181818] border border-white/15 rounded-lg px-2 py-1 text-white"
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
              className="px-3 py-1.5 rounded-lg bg-[#181818] border border-white/10 hover:bg-white/10 disabled:opacity-40 cursor-pointer"
            >
              ‹ Anterior
            </button>
            <span className="px-3.5 py-1.5 rounded-lg bg-[#EAB308] text-black font-bold">
              Página {pagina}
            </span>
            <button
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={pagina === totalPaginas}
              className="px-3 py-1.5 rounded-lg bg-[#181818] border border-white/10 hover:bg-white/10 disabled:opacity-40 cursor-pointer"
            >
              Siguiente ›
            </button>
          </div>
        </div>
      )}

      {/* TOAST DE CONFIRMACIÓN */}
      {toast &&
        montado &&
        createPortal(
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#161616] border border-gray-700/80 shadow-2xl rounded-xl px-5 py-3.5 flex items-center gap-3 z-[9999]">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-semibold text-white">{toast}</span>
          </div>,
          document.body
        )}

      {/* MODAL: NUEVO / EDITAR PROYECTO */}
      {modalAbierto &&
        montado &&
        createPortal(
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
            <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800 w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
              <div className="px-6 pt-6 pb-4 flex justify-between items-start border-b border-gray-800">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {proyectoEditando ? 'Editar Proyecto' : 'Nuevo Proyecto'}
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Arquitectura, diseño de interiores, paisajismo, reforma u obra
                  </p>
                </div>
                <button
                  onClick={() => setModalAbierto(false)}
                  className="text-gray-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={guardarProyecto} className="px-6 py-5 overflow-y-auto space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Nombre del Proyecto *
                  </label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej. Casa Terrazas / Interiorismo Loft Palermo / Jardín Norte"
                    className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
                  />
                </div>

                <div className="bg-[#151515] border border-gray-800 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setMostrarPortada(!mostrarPortada)}
                    className="w-full px-4 py-3 text-left text-xs font-bold text-gray-200 hover:text-white flex items-center gap-2 cursor-pointer"
                  >
                    <span className="text-[#EAB308] text-sm font-bold">{mostrarPortada ? '−' : '+'}</span>
                    Imagen de portada (opcional)
                  </button>

                  {mostrarPortada && (
                    <div className="px-4 pb-4 pt-2 space-y-3 border-t border-gray-800/70">
                      <div>
                        <div className="text-xs font-bold text-white">Imagen de Portada del Proyecto (Opcional)</div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          Subí una foto, moodboard o render del proyecto, o pegá abajo un enlace directo.
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5">
                        {portadaUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              setPortadaUrl('');
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            className="border border-red-900/60 bg-red-950/30 hover:bg-red-900/40 text-red-400 px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Eliminar imagen
                          </button>
                        )}

                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={manejarSubidaArchivo}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="border border-dashed border-[#EAB308]/50 hover:border-[#EAB308] bg-[#EAB308]/5 text-[#EAB308] px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" /> Subir foto / render
                        </button>
                      </div>

                      {portadaUrl && (
                        <div className="rounded-xl overflow-hidden border border-gray-800 bg-[#121212]">
                          <img
                            src={portadaUrl}
                            alt="Vista previa de portada"
                            className="w-full h-36 object-cover"
                          />
                        </div>
                      )}

                      <input
                        type="text"
                        value={portadaUrl.startsWith('data:image') ? '' : portadaUrl}
                        onChange={(e) => setPortadaUrl(e.target.value)}
                        placeholder="O pegá aquí el enlace de la imagen o render del proyecto (https://...)"
                        className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* CLIENTE / COMITENTE */}
                  <div className="relative">
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">Cliente / Comitente</label>

                    <button
                      type="button"
                      onClick={() => {
                        setDropdownClienteAbierto(!dropdownClienteAbierto);
                        setDropdownResponsableAbierto(false);
                      }}
                      className="w-full bg-[#121212] border border-gray-700/80 hover:border-gray-600 rounded-lg px-3 py-2 text-sm text-white flex items-center justify-between transition-colors cursor-pointer min-h-[42px]"
                    >
                      {clienteActual ? (
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="border border-[#EAB308]/50 bg-[#EAB308]/10 text-[#EAB308] px-1.5 py-0.5 rounded text-[11px] font-bold flex-shrink-0">
                            {clienteActual.codigo}
                          </span>
                          <span className="font-semibold text-white truncate">
                            {clienteActual.nombre}
                          </span>
                          <span className="bg-cyan-950/60 border border-cyan-800/60 text-cyan-400 px-2 py-0.5 rounded-full text-[11px] font-medium flex-shrink-0">
                            {clienteActual.estado || 'Prospecto'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-300 truncate">Particular / Sin cliente vinculado</span>
                      )}

                      {dropdownClienteAbierto ? (
                        <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
                      )}
                    </button>

                    {dropdownClienteAbierto && (
                      <div className="absolute left-0 right-0 mt-2 bg-[#161616] border border-gray-700 rounded-xl shadow-2xl z-30 overflow-hidden">
                        <div className="p-2.5 border-b border-gray-800">
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={busquedaCliente}
                              onChange={(e) => setBusquedaCliente(e.target.value)}
                              placeholder="Buscar cliente por código (CLI-001) o nombre..."
                              className="w-full bg-[#121212] border border-gray-700/80 rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
                            />
                          </div>
                        </div>

                        <div className="max-h-56 overflow-y-auto p-1.5 space-y-1">
                          <button
                            type="button"
                            onClick={() => {
                              setClienteId('');
                              setDropdownClienteAbierto(false);
                              setBusquedaCliente('');
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer ${
                              !clienteId
                                ? 'bg-[#EAB308]/15 text-white font-semibold'
                                : 'text-gray-300 hover:bg-gray-800/70'
                            }`}
                          >
                            <span>Particular / Sin cliente vinculado</span>
                            {!clienteId && <Check className="w-4 h-4 text-[#EAB308]" />}
                          </button>

                          {clientesFiltrados.map((c) => {
                            const seleccionado = String(clienteId) === String(c.id);
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  setClienteId(String(c.id));
                                  setDropdownClienteAbierto(false);
                                  setBusquedaCliente('');
                                }}
                                className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${
                                  seleccionado
                                    ? 'bg-[#EAB308]/15 border border-[#EAB308]/30'
                                    : 'hover:bg-gray-800/70 border border-transparent'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <span className="border border-[#EAB308]/50 bg-[#EAB308]/10 text-[#EAB308] px-1.5 py-0.5 rounded text-[11px] font-bold flex-shrink-0">
                                      {c.codigo}
                                    </span>
                                    <span className="text-xs font-bold text-white truncate">
                                      {c.nombre}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className="bg-cyan-950/60 border border-cyan-800/60 text-cyan-400 px-2 py-0.5 rounded-full text-[10px] font-medium">
                                      {c.estado || 'Prospecto'}
                                    </span>
                                    {seleccionado && <Check className="w-4 h-4 text-[#EAB308]" />}
                                  </div>
                                </div>

                                {c.tipo && (
                                  <div className="text-[11px] text-gray-400 mt-1">
                                    · {c.tipo}
                                  </div>
                                )}
                              </button>
                            );
                          })}

                          {clientesFiltrados.length === 0 && (
                            <div className="text-center text-xs text-gray-500 py-3">
                              No se encontraron clientes.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* RESPONSABLE DEL PROYECTO */}
                  <div className="relative">
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">Responsable del Proyecto</label>

                    <button
                      type="button"
                      onClick={() => {
                        setDropdownResponsableAbierto(!dropdownResponsableAbierto);
                        setDropdownClienteAbierto(false);
                      }}
                      className="w-full bg-[#121212] border border-gray-700/80 hover:border-gray-600 rounded-lg px-3 py-2 text-sm text-white flex items-center justify-between transition-colors cursor-pointer min-h-[42px]"
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <UserCheck className="w-4 h-4 text-[#EAB308] flex-shrink-0" />
                        <span className="font-bold text-white truncate">{responsable}</span>
                      </div>

                      {dropdownResponsableAbierto ? (
                        <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
                      )}
                    </button>

                    {dropdownResponsableAbierto && (
                      <div className="absolute left-0 right-0 mt-2 bg-[#161616] border border-gray-700 rounded-xl shadow-2xl z-30 overflow-hidden">
                        <div className="p-2.5 border-b border-gray-800">
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={busquedaResponsable}
                              onChange={(e) => setBusquedaResponsable(e.target.value)}
                              placeholder="Buscar integrante por nombre o especialidad..."
                              className="w-full bg-[#121212] border border-gray-700/80 rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
                            />
                          </div>
                        </div>

                        <div className="max-h-56 overflow-y-auto p-1.5 space-y-1">
                          {integrantesFiltrados.map((item) => {
                            const seleccionado = responsable === item.nombre;
                            const enEsteProyecto = proyectoEditando?.responsable === item.nombre;

                            return (
                              <button
                                key={item.nombre}
                                type="button"
                                onClick={() => {
                                  setResponsable(item.nombre);
                                  setDropdownResponsableAbierto(false);
                                  setBusquedaResponsable('');
                                }}
                                className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                                  seleccionado
                                    ? 'bg-[#EAB308]/15 border border-[#EAB308]/30'
                                    : 'hover:bg-gray-800/70 border border-transparent'
                                }`}
                              >
                                <div className="overflow-hidden">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-bold text-white">
                                      {item.nombre}
                                    </span>
                                    {enEsteProyecto && (
                                      <span className="bg-[#EAB308]/15 border border-[#EAB308]/30 text-[#EAB308] px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                                        EN ESTE PROYECTO
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-gray-400 mt-0.5 truncate">
                                    {item.especialidad}
                                  </div>
                                </div>

                                {seleccionado && (
                                  <Check className="w-4 h-4 text-[#EAB308] flex-shrink-0" />
                                )}
                              </button>
                            );
                          })}

                          {integrantesFiltrados.length === 0 && (
                            <div className="text-center text-xs text-gray-500 py-3">
                              No se encontraron integrantes.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">Tipología</label>
                    <select
                      value={tipologia}
                      onChange={(e) => setTipologia(e.target.value)}
                      className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-gray-500"
                    >
                      {TIPOLOGIAS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">Etapa Actual</label>
                    <select
                      value={etapa}
                      onChange={(e) => setEtapa(e.target.value)}
                      className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-gray-500"
                    >
                      {ETAPAS.map((et) => (
                        <option key={et.nombre} value={et.nombre}>{et.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">Estado</label>
                    <select
                      value={estado}
                      onChange={(e) => setEstado(e.target.value)}
                      className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-gray-500"
                    >
                      {ESTADOS.map((est) => (
                        <option key={est} value={est}>{est}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">Moneda</label>
                    <select
                      value={moneda}
                      onChange={(e) => setMoneda(e.target.value)}
                      className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-gray-500"
                    >
                      <option value="ARS">ARS</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">Presupuesto / Honorarios</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={presupuesto}
                      onChange={(e) => manejarCambioPresupuesto(e.target.value)}
                      placeholder="Importe"
                      className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">Entrega Estimada</label>
                    <input
                      type="date"
                      value={entregaEstimada}
                      onChange={(e) => setEntregaEstimada(e.target.value)}
                      className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-gray-500 [color-scheme:dark]"
                    />
                  </div>
                </div>

                <div className="bg-[#151515] border border-gray-800 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setMostrarMasDatos(!mostrarMasDatos)}
                    className={`w-full px-4 py-3 text-left text-xs flex items-center gap-2 cursor-pointer transition-colors ${
                      mostrarMasDatos ? 'border-b border-[#EAB308]/50 text-white' : 'text-gray-200 hover:text-white'
                    }`}
                  >
                    <span className="text-[#EAB308] text-sm font-bold">{mostrarMasDatos ? '−' : '+'}</span>
                    <strong className="font-bold">Más datos (opcional)</strong>
                    <span className="text-gray-400">código, ubicación, Drive, superficie, fechas y notas</span>
                  </button>

                  {mostrarMasDatos && (
                    <div className="p-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-300 mb-1.5">Ubicación / Dirección</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={ubicacion}
                              onChange={(e) => setUbicacion(e.target.value)}
                              placeholder="Dirección, barrio o enlace de Google Maps"
                              className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
                            />
                            {ubicacion.trim() && (
                              <a
                                href={obtenerEnlaceMaps(ubicacion)}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Abrir en Google Maps"
                                className="bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-700/60 text-cyan-400 px-3 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-300 mb-1.5">Carpeta de Google Drive / Nube</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={driveUrl}
                              onChange={(e) => setDriveUrl(e.target.value)}
                              placeholder="https://drive.google.com/drive/folders/..."
                              className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
                            />
                            {driveUrl.trim() && (
                              <a
                                href={driveUrl.trim()}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Abrir carpeta en Google Drive"
                                className="bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-700/60 text-cyan-400 px-3 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-300 mb-1.5">Código</label>
                          <input
                            type="text"
                            value={codigo}
                            onChange={(e) => setCodigo(e.target.value)}
                            placeholder="Se completa solo (OBR-2026-...)"
                            className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-300 mb-1.5">Superficie (m²)</label>
                          <input
                            type="text"
                            value={superficie}
                            onChange={(e) => setSuperficie(e.target.value)}
                            placeholder="Ej. 180"
                            className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-300 mb-1.5">Fecha de Inicio</label>
                          <input
                            type="date"
                            value={fechaInicio}
                            onChange={(e) => setFechaInicio(e.target.value)}
                            className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-gray-500 [color-scheme:dark]"
                          />
                        </div>
                      </div>

                      <div className="max-w-xs">
                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">Próxima Visita / Reunión</label>
                        <input
                          type="date"
                          value={proximaVisita}
                          onChange={(e) => setProximaVisita(e.target.value)}
                          className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-gray-500 [color-scheme:dark]"
                        />
                        <p className="text-[11px] text-gray-500 mt-1">
                          Opcional: si agendás visitas, la próxima se muestra sola.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">Descripción y Notas del Proyecto</label>
                        <textarea
                          rows={3}
                          value={notas}
                          onChange={(e) => setNotas(e.target.value)}
                          placeholder="Alcance del encargo, estilo, materiales, requerimientos del cliente o notas generales..."
                          className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500 resize-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-gray-800/80">
                  <div>
                    {proyectoEditando && (
                      <button
                        type="button"
                        onClick={eliminarProyecto}
                        disabled={cargando}
                        className="border border-transparent hover:border-red-500/40 hover:bg-red-500/15 text-red-500 hover:text-red-400 px-4 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" /> Enviar a papelera
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setModalAbierto(false)}
                      className="border border-transparent hover:border-gray-500/40 hover:bg-gray-500/15 text-gray-300 hover:text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={cargando}
                      className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-5 py-2.5 rounded-lg font-bold text-sm transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {cargando
                        ? 'Guardando...'
                        : proyectoEditando
                        ? 'Guardar Cambios'
                        : 'Crear Proyecto'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}