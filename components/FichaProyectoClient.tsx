"use client";

import { useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  ArrowLeft, FileText, Image as ImageIcon, Pencil, Trash2, FolderOpen, ExternalLink,
  User, UserCheck, MapPin, Check, CheckCircle2, Calendar, Plus, Users, MessageSquare,
  X, Upload, AlertOctagon, Search, ChevronDown, ChevronUp, BarChart3, Bell,
} from 'lucide-react';

type PestanaProyecto = 'resumen' | 'tareas' | 'visitas' | 'documentos' | 'compras' | 'finanzas';

const ETAPAS = [
  { id: 1, nombre: 'Relevamiento y Concepto' },
  { id: 2, nombre: 'Anteproyecto y Diseño' },
  { id: 3, nombre: 'Proyecto Ejecutivo y Detalles' },
  { id: 4, nombre: 'Presupuesto y Compras' },
  { id: 5, nombre: 'Dirección y Ejecución de Obra' },
  { id: 6, nombre: 'Entrega y Post-Obra' },
];

const TIPOLOGIAS = [
  'Vivienda Unifamiliar', 'Vivienda Multifamiliar', 'Estación de Servicio', 'Local Comercial',
  'Oficinas / Corporativo', 'Diseño de Interiores', 'Paisajismo / Exteriores', 'Reforma / Ampliación', 'Industrial / Galpón',
];

const ESTADOS = ['En Diseño', 'En Curso', 'Pausado', 'Finalizado'];
const CATEGORIAS_VISITA = ['Visita de obra', 'Reunión con cliente', 'Coordinación de gremios', 'Relevamiento técnico', 'Entrega de documentación'];
const ESTADOS_VISITA = ['Programada', 'Realizada', 'Cancelada'];
const INTEGRANTES_BASE = [
  { nombre: 'Arq. Joana Cuevas', especialidad: 'Arquitecto Proyectista', iniciales: 'JC' },
  { nombre: 'Alejandro Fego', especialidad: 'Dirección de Proyecto y Diseño', iniciales: 'AF' },
  { nombre: 'Lautaro Godoy', especialidad: 'Arquitecto Proyectista', iniciales: 'LG' },
  { nombre: 'Equipo MB', especialidad: 'Estudio de Arquitectura', iniciales: 'MB' },
];

export default function FichaProyectoClient({
  proyecto,
  clientes = [],
  movimientos = [],
  visitas = [],
}: {
  proyecto: any;
  clientes?: any[];
  movimientos?: any[];
  visitas?: any[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editFileInputRef = useRef<HTMLInputElement | null>(null);
  const hoy = new Date().toISOString().split('T')[0];

  const [pestana, setPestana] = useState<PestanaProyecto>('resumen');
  const [estadoActual, setEstadoActual] = useState(proyecto.estado || 'En Diseño');
  const [etapaActual, setEtapaActual] = useState(proyecto.etapa || 'Relevamiento y Concepto');
  const [portadaUrl, setPortadaUrl] = useState(proyecto.portada_url || '');
  const [toast, setToast] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  // Modales
  const [modalPortada, setModalPortada] = useState(false);
  const [modalEliminar, setModalEliminar] = useState(false);
  const [modalEditarProyecto, setModalEditarProyecto] = useState(false);
  const [modalMovimiento, setModalMovimiento] = useState(false);
  const [modalVisita, setModalVisita] = useState(false);

  // Estados Modal EDITAR PROYECTO
  const [editNombre, setEditNombre] = useState(proyecto.nombre || '');
  const [editPortada, setEditPortada] = useState(proyecto.portada_url || '');
  const [editClienteId, setEditClienteId] = useState(proyecto.cliente_id ? String(proyecto.cliente_id) : '');
  const [editResponsable, setEditResponsable] = useState(proyecto.responsable || 'Alejandro Fego');
  const [editTipologia, setEditTipologia] = useState(proyecto.tipologia || 'Vivienda Unifamiliar');
  const [editEtapa, setEditEtapa] = useState(proyecto.etapa || 'Relevamiento y Concepto');
  const [editEstado, setEditEstado] = useState(proyecto.estado || 'En Diseño');
  const [editMoneda, setEditMoneda] = useState(proyecto.moneda || 'USD');
  const [editPresupuesto, setEditPresupuesto] = useState('');
  const [editEntrega, setEditEntrega] = useState(proyecto.entrega_estimada || '');
  const [editUbicacion, setEditUbicacion] = useState(proyecto.ubicacion || '');
  const [editDrive, setEditDrive] = useState(proyecto.drive_url || '');
  const [editCodigo, setEditCodigo] = useState(proyecto.codigo || '');
  const [editSuperficie, setEditSuperficie] = useState(proyecto.superficie ? String(proyecto.superficie) : '');
  const [editFechaInicio, setEditFechaInicio] = useState(proyecto.fecha_inicio || hoy);
  const [editProximaVisita, setEditProximaVisita] = useState(proyecto.proxima_visita || '');
  const [editNotas, setEditNotas] = useState(proyecto.notas || '');
  const [mostrarEditPortada, setMostrarEditPortada] = useState(true);
  const [mostrarEditMasDatos, setMostrarEditMasDatos] = useState(false);
  const [dropCliente, setDropCliente] = useState(false);
  const [busqCliente, setBusqCliente] = useState('');
  const [dropResp, setDropResp] = useState(false);
  const [busqResp, setBusqResp] = useState('');

  // Estados Modal MOVIMIENTO FINANCIERO
  const [movEditando, setMovEditando] = useState<any | null>(null);
  const [movTipo, setMovTipo] = useState<'ingreso' | 'egreso'>('ingreso');
  const [movCategoria, setMovCategoria] = useState('Honorarios Proyecto');
  const [movFactura, setMovFactura] = useState('');
  const [movConcepto, setMovConcepto] = useState('');
  const [movMoneda, setMovMoneda] = useState(proyecto.moneda || 'ARS');
  const [movImporte, setMovImporte] = useState('');
  const [movEstado, setMovEstado] = useState('Cobrado / Pagado');
  const [movFecha, setMovFecha] = useState(hoy);
  const [movClienteId, setMovClienteId] = useState(proyecto.cliente_id ? String(proyecto.cliente_id) : '');
  const [movProveedor, setMovProveedor] = useState('Ninguno');
  const [movNotas, setMovNotas] = useState('');

  // Estados Modal VISITA / REUNIÓN + ALARMA
  const [visitaEditando, setVisitaEditando] = useState<any | null>(null);
  const [visCategoria, setVisCategoria] = useState('Visita de obra');
  const [visResponsable, setVisResponsable] = useState(proyecto.responsable || 'Alejandro Fego');
  const [dropVisResp, setDropVisResp] = useState(false);
  const [visTitulo, setVisTitulo] = useState('');
  const [visFecha, setVisFecha] = useState(hoy);
  const [visHorario, setVisHorario] = useState('10:00');
  const [visEstado, setVisEstado] = useState('Programada');
  const [visActa, setVisActa] = useState('');
  const [visAlarmaActiva, setVisAlarmaActiva] = useState(false);
  const [visAlarmaFecha, setVisAlarmaFecha] = useState(hoy);
  const [visAlarmaHorario, setVisAlarmaHorario] = useState('09:00');

  // Equipo y Comentarios
  const [equipoAsignado, setEquipoAsignado] = useState<string[]>([proyecto.responsable || 'Alejandro Fego']);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [comentarios, setComentarios] = useState<{ id: number; autor: string; fecha: string; texto: string }[]>([]);

  const mostrarToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const formatearMonto = (valor: number) =>
    Number(valor || 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  const formatearImporteInput = (valor: string, setter: (v: string) => void) => {
    const limpio = valor.replace(/[^0-9,]/g, '');
    const partes = limpio.split(',');
    const parteEntera = partes[0].replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    setter(partes.length > 1 ? `${parteEntera || '0'},${partes[1].slice(0, 2)}` : parteEntera);
  };

  const formatearFecha = (fechaStr: string | null) => {
    if (!fechaStr) return '—';
    const partes = fechaStr.split('-');
    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : fechaStr;
  };

  const obtenerEnlaceMaps = (texto: string) => {
    const limpio = texto.trim();
    return /^https?:\/\//i.test(limpio) ? limpio : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(limpio)}`;
  };

  const proximaVisitaReal = useMemo(() => {
    const programadas = visitas
      .filter((v) => v.estado === 'Programada')
      .sort((a, b) => `${a.fecha} ${a.horario}`.localeCompare(`${b.fecha} ${b.horario}`));
    return programadas.length > 0 ? programadas[0].fecha : proyecto.proxima_visita || null;
  }, [visitas, proyecto.proxima_visita]);

  // EDITAR PROYECTO
  const abrirEditarProyecto = () => {
    setEditNombre(proyecto.nombre || '');
    setEditPortada(portadaUrl || '');
    setEditClienteId(proyecto.cliente_id ? String(proyecto.cliente_id) : '');
    setEditResponsable(proyecto.responsable || 'Alejandro Fego');
    setEditTipologia(proyecto.tipologia || 'Vivienda Unifamiliar');
    setEditEtapa(etapaActual);
    setEditEstado(estadoActual);
    setEditMoneda(proyecto.moneda || 'USD');
    setEditPresupuesto(proyecto.presupuesto ? formatearMonto(proyecto.presupuesto) : '');
    setEditEntrega(proyecto.entrega_estimada || '');
    setEditUbicacion(proyecto.ubicacion || '');
    setEditDrive(proyecto.drive_url || '');
    setEditCodigo(proyecto.codigo || '');
    setEditSuperficie(proyecto.superficie ? String(proyecto.superficie) : '');
    setEditFechaInicio(proyecto.fecha_inicio || hoy);
    setEditProximaVisita(proyecto.proxima_visita || '');
    setEditNotas(proyecto.notas || '');
    setMostrarEditPortada(Boolean(portadaUrl));
    setMostrarEditMasDatos(false);
    setDropCliente(false);
    setDropResp(false);
    setModalEditarProyecto(true);
  };

  const guardarEdicionProyecto = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    const cliSel = clientes.find((c) => String(c.id) === String(editClienteId));
    const presNum = parseFloat(editPresupuesto.replace(/\./g, '').replace(',', '.')) || 0;
    const supNum = parseFloat(editSuperficie.replace(',', '.')) || 0;
    const nuevoCod = editCodigo.trim() || proyecto.codigo;

    const { error } = await supabase
      .from('proyectos')
      .update({
        codigo: nuevoCod,
        nombre: editNombre.trim(),
        portada_url: editPortada.trim() || null,
        cliente_id: editClienteId || null,
        cliente_nombre: cliSel ? cliSel.nombre : null,
        responsable: editResponsable,
        tipologia: editTipologia,
        etapa: editEtapa,
        estado: editEstado,
        moneda: editMoneda,
        presupuesto: presNum,
        fecha_inicio: editFechaInicio || null,
        entrega_estimada: editEntrega || null,
        ubicacion: editUbicacion.trim() || null,
        drive_url: editDrive.trim() || null,
        superficie: supNum,
        proxima_visita: editProximaVisita || null,
        notas: editNotas.trim() || null,
      })
      .eq('id', proyecto.id);

    setCargando(false);
    if (!error) {
      setPortadaUrl(editPortada.trim());
      setEtapaActual(editEtapa);
      setEstadoActual(editEstado);
      setModalEditarProyecto(false);
      mostrarToast('Cambios del proyecto guardados');
      if (nuevoCod !== proyecto.codigo) router.replace(`/proyectos/${nuevoCod}`);
      else router.refresh();
    } else {
      alert('Error al guardar cambios: ' + error.message);
    }
  };

  // MOVIMIENTOS FINANCIEROS
  const abrirNuevoMovimiento = () => {
    setMovEditando(null);
    setMovTipo('ingreso');
    setMovCategoria('Honorarios Proyecto');
    setMovFactura('');
    setMovConcepto('');
    setMovMoneda(proyecto.moneda || 'ARS');
    setMovImporte('');
    setMovEstado('Cobrado / Pagado');
    setMovFecha(hoy);
    setMovClienteId(proyecto.cliente_id ? String(proyecto.cliente_id) : '');
    setMovProveedor('Ninguno');
    setMovNotas('');
    setModalMovimiento(true);
  };

  const abrirEditarMovimiento = (m: any) => {
    setMovEditando(m);
    setMovTipo(m.tipo === 'egreso' ? 'egreso' : 'ingreso');
    setMovCategoria(m.categoria || 'Honorarios Proyecto');
    setMovFactura(m.nro_factura || '');
    setMovConcepto(m.concepto || '');
    setMovMoneda(m.moneda || 'ARS');
    setMovImporte(formatearMonto(m.importe));
    setMovEstado(m.estado || 'Cobrado / Pagado');
    setMovFecha(m.fecha || hoy);
    setMovClienteId(m.cliente_id ? String(m.cliente_id) : '');
    setMovProveedor(m.proveedor || 'Ninguno');
    setMovNotas(m.notas || '');
    setModalMovimiento(true);
  };

  const guardarMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    const impNum = parseFloat(movImporte.replace(/\./g, '').replace(',', '.')) || 0;
    const datos = {
      cliente_id: movClienteId || String(proyecto.cliente_id || '0'),
      tipo: movTipo,
      categoria: movCategoria,
      nro_factura: movFactura || null,
      concepto: movConcepto.trim(),
      moneda: movMoneda,
      importe: impNum,
      estado: movEstado,
      fecha: movFecha,
      proyecto: `${proyecto.codigo} · ${proyecto.nombre}`,
      proveedor: movProveedor,
      notas: movNotas || null,
    };

    const { error } = movEditando
      ? await supabase.from('movimientos').update(datos).eq('id', movEditando.id)
      : await supabase.from('movimientos').insert([datos]);

    setCargando(false);
    if (!error) {
      setModalMovimiento(false);
      mostrarToast(movEditando ? 'Movimiento actualizado' : 'Movimiento registrado');
      router.refresh();
    } else {
      alert('Error al guardar movimiento: ' + error.message);
    }
  };

  const eliminarMovimiento = async () => {
    if (!movEditando) return;
    setCargando(true);
    const { error } = await supabase.from('movimientos').delete().eq('id', movEditando.id);
    setCargando(false);
    if (!error) {
      setModalMovimiento(false);
      mostrarToast('Movimiento eliminado');
      router.refresh();
    } else {
      alert('Error al eliminar movimiento: ' + error.message);
    }
  };

  // VISITAS
  const abrirNuevaVisita = () => {
    setVisitaEditando(null);
    setVisCategoria('Visita de obra');
    setVisResponsable(proyecto.responsable || 'Alejandro Fego');
    setDropVisResp(false);
    setVisTitulo('');
    setVisFecha(hoy);
    setVisHorario('10:00');
    setVisEstado('Programada');
    setVisActa('');
    setVisAlarmaActiva(false);
    setVisAlarmaFecha(hoy);
    setVisAlarmaHorario('09:00');
    setModalVisita(true);
  };

  const abrirEditarVisita = (v: any) => {
    setVisitaEditando(v);
    setVisCategoria(v.categoria || 'Visita de obra');
    setVisResponsable(v.responsable || 'Alejandro Fego');
    setDropVisResp(false);
    setVisTitulo(v.titulo || '');
    setVisFecha(v.fecha || hoy);
    setVisHorario(v.horario || '10:00');
    setVisEstado(v.estado || 'Programada');
    setVisActa(v.acta || '');
    setVisAlarmaActiva(Boolean(v.alarma_activa));
    setVisAlarmaFecha(v.alarma_fecha || v.fecha || hoy);
    setVisAlarmaHorario(v.alarma_horario || '09:00');
    setModalVisita(true);
  };

  const guardarVisita = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    if (visAlarmaActiva && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    const alarmaActivaFinal = visEstado === 'Programada' ? visAlarmaActiva : false;

    const datos = {
      proyecto_id: String(proyecto.id),
      proyecto_codigo: proyecto.codigo,
      proyecto_nombre: proyecto.nombre,
      proyecto_estado: estadoActual,
      categoria: visCategoria,
      responsable: visResponsable,
      titulo: visTitulo.trim(),
      fecha: visFecha,
      horario: visHorario,
      estado: visEstado,
      acta: visActa.trim() || null,
      alarma_activa: alarmaActivaFinal,
      alarma_fecha: alarmaActivaFinal ? visAlarmaFecha : null,
      alarma_horario: alarmaActivaFinal ? visAlarmaHorario : null,
    };

    const { error } = visitaEditando
      ? await supabase.from('visitas').update(datos).eq('id', visitaEditando.id)
      : await supabase.from('visitas').insert([datos]);

    if (!error && visEstado === 'Programada') {
      await supabase.from('proyectos').update({ proxima_visita: visFecha }).eq('id', proyecto.id);
    }

    setCargando(false);
    if (!error) {
      setModalVisita(false);
      mostrarToast(visitaEditando ? 'Visita actualizada' : 'Visita agendada correctamente');
      router.refresh();
    } else {
      alert('Error al guardar visita: ' + error.message);
    }
  };

  const eliminarVisita = async () => {
    if (!visitaEditando) return;
    setCargando(true);
    const { error } = await supabase.from('visitas').delete().eq('id', visitaEditando.id);
    setCargando(false);
    if (!error) {
      setModalVisita(false);
      mostrarToast('Visita eliminada');
      router.refresh();
    } else {
      alert('Error al eliminar visita: ' + error.message);
    }
  };

  // ACCIONES RÁPIDAS
  const cambiarEstado = async (nuevoEstado: string) => {
    setEstadoActual(nuevoEstado);
    const { error } = await supabase.from('proyectos').update({ estado: nuevoEstado }).eq('id', proyecto.id);
    if (!error) { mostrarToast(`Estado actualizado a ${nuevoEstado}`); router.refresh(); }
  };

  const cambiarEtapa = async (nuevaEtapa: string) => {
    setEtapaActual(nuevaEtapa);
    const { error } = await supabase.from('proyectos').update({ etapa: nuevaEtapa }).eq('id', proyecto.id);
    if (!error) { mostrarToast(`Etapa actualizada: ${nuevaEtapa}`); router.refresh(); }
  };

  const leerImagen = (e: React.ChangeEvent<HTMLInputElement>, setter: (v: string) => void) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    const lector = new FileReader();
    lector.onloadend = () => { if (typeof lector.result === 'string') setter(lector.result); };
    lector.readAsDataURL(archivo);
  };

  const guardarPortada = async () => {
    setCargando(true);
    const { error } = await supabase.from('proyectos').update({ portada_url: portadaUrl.trim() || null }).eq('id', proyecto.id);
    setCargando(false);
    if (!error) { setModalPortada(false); mostrarToast('Portada actualizada'); router.refresh(); }
    else alert('Error al guardar portada: ' + error.message);
  };

  const eliminarProyecto = async () => {
    setCargando(true);
    const { error } = await supabase.from('proyectos').delete().eq('id', proyecto.id);
    setCargando(false);
    if (!error) { router.push('/proyectos'); router.refresh(); }
    else alert('Error al eliminar proyecto: ' + error.message);
  };

  const toggleAsignar = (nombre: string) =>
    setEquipoAsignado((prev) => (prev.includes(nombre) ? prev.filter((n) => n !== nombre) : [...prev, nombre]));

  const insertarMencion = (nombre: string) =>
    setNuevoComentario((prev) => `${prev}${prev.endsWith(' ') || !prev ? '' : ' '}@${nombre} `);

  const publicarComentario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoComentario.trim()) return;
    setComentarios((prev) => [
      { id: Date.now(), autor: 'Alejandro Fego', fecha: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }), texto: nuevoComentario.trim() },
      ...prev,
    ]);
    setNuevoComentario('');
  };

  // CÁLCULOS ECONÓMICOS
  const moneda = proyecto.moneda || 'USD';
  const presupuesto = Number(proyecto.presupuesto || 0);
  const cobrado = movimientos
    .filter((m) => m.tipo === 'ingreso' && m.estado === 'Cobrado / Pagado' && m.moneda === moneda)
    .reduce((acc, m) => acc + Number(m.importe || 0), 0);
  const gastos = movimientos
    .filter((m) => m.tipo === 'egreso' && m.moneda === moneda)
    .reduce((acc, m) => acc + Number(m.importe || 0), 0);
  const saldoPorCobrar = Math.max(0, presupuesto - cobrado);
  const resultadoNeto = cobrado - gastos;

  const baseBarra = Math.max(presupuesto, cobrado, gastos, 1);
  const pctCobrado = Math.min(100, Math.round((cobrado / baseBarra) * 100));
  const pctPendiente = Math.min(100, Math.round((saldoPorCobrar / baseBarra) * 100));
  const pctGastos = Math.min(100, Math.round((gastos / baseBarra) * 100));

  const indiceEtapaActual = Math.max(0, ETAPAS.findIndex((e) => e.nombre === etapaActual));
  const clienteEditActual = clientes.find((c) => String(c.id) === String(editClienteId)) || null;
  const clientesEditFiltrados = clientes.filter(
    (c) => (c.codigo || '').toLowerCase().includes(busqCliente.toLowerCase()) || (c.nombre || '').toLowerCase().includes(busqCliente.toLowerCase())
  );
  const respEditFiltrados = INTEGRANTES_BASE.filter(
    (i) => i.nombre.toLowerCase().includes(busqResp.toLowerCase()) || i.especialidad.toLowerCase().includes(busqResp.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#121212] text-white p-8 font-sans">
      {/* BARRA SUPERIOR */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <Link href="/proyectos" className="flex items-center gap-2 bg-[#1A1A1A] border border-gray-800 hover:bg-gray-800 px-4 py-2 rounded-xl text-sm text-gray-300 hover:text-white transition-colors font-medium">
          <ArrowLeft className="w-4 h-4" /> Volver a Proyectos
        </Link>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 mr-1">
            <span className="text-xs text-gray-400">Estado:</span>
            <select value={estadoActual} onChange={(e) => cambiarEstado(e.target.value)} className="bg-[#1A1A1A] border border-gray-700 rounded-xl px-3 py-2 text-xs font-semibold text-white cursor-pointer">
              {ESTADOS.map((est) => <option key={est} value={est}>{est}</option>)}
            </select>
          </div>
          <button onClick={() => window.print()} className="bg-[#059669] hover:bg-[#047857] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer">
            <FileText className="w-3.5 h-3.5" /> Reporte para el cliente
          </button>
          <button onClick={() => setModalPortada(true)} className="bg-[#1A1A1A] hover:bg-gray-800 border border-gray-700 text-gray-200 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer">
            <ImageIcon className="w-3.5 h-3.5 text-[#EAB308]" /> Portada
          </button>
          <button onClick={abrirEditarProyecto} className="bg-[#1A1A1A] hover:bg-gray-800 border border-gray-700 text-gray-200 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer">
            <Pencil className="w-3.5 h-3.5 text-[#EAB308]" /> Editar proyecto
          </button>
          <button onClick={() => setModalEliminar(true)} className="bg-red-950/30 hover:bg-red-900/40 border border-red-900/50 text-red-500 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer">
            <Trash2 className="w-3.5 h-3.5" /> Papelera
          </button>
        </div>
      </div>

      {/* CABECERA CON PORTADA Y PESTAÑAS */}
      <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl overflow-hidden shadow-xl mb-6">
        <div className="relative h-44 bg-gradient-to-br from-[#232323] to-[#121212] overflow-hidden">
          {portadaUrl ? (
            <img src={portadaUrl} alt={proyecto.nombre} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-700"><ImageIcon className="w-12 h-12" /></div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] via-black/30 to-transparent" />
          <button onClick={() => setModalPortada(true)} className="absolute top-4 right-4 bg-black/75 hover:bg-black border border-gray-700 text-gray-200 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
            <ImageIcon className="w-3.5 h-3.5 text-[#EAB308]" /> Cambiar portada
          </button>
        </div>

        <div className="p-6 pt-4">
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-2">
                <span className="bg-[#EAB308]/15 border border-[#EAB308]/40 text-[#EAB308] px-2.5 py-0.5 rounded-md text-xs font-bold">{proyecto.codigo}</span>
                <span className="text-xs font-semibold text-gray-300">{proyecto.tipologia}</span>
                <span className="bg-[#121212] border border-gray-800 text-gray-200 px-2.5 py-0.5 rounded-md text-xs font-medium">Responsable: {proyecto.responsable || 'Sin asignar'}</span>
                <span className="bg-cyan-950/60 border border-cyan-800/60 text-cyan-400 px-2.5 py-0.5 rounded-md text-xs font-semibold">{estadoActual}</span>
              </div>
              <h1 className="text-3xl font-extrabold text-white mb-2">{proyecto.nombre}</h1>
              <div className="flex flex-wrap items-center gap-5 text-xs text-gray-300">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#EAB308]" /> Cliente: <strong className="text-white">{proyecto.cliente_nombre || 'Particular'}</strong>
                </div>
                {proyecto.ubicacion && (
                  <a href={obtenerEnlaceMaps(proyecto.ubicacion)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-gray-300 hover:text-[#EAB308] hover:underline">
                    <MapPin className="w-3.5 h-3.5 text-[#EAB308]" /> <span>{proyecto.ubicacion}</span>
                  </a>
                )}
              </div>
            </div>
            {proyecto.drive_url && (
              <a href={proyecto.drive_url} target="_blank" rel="noopener noreferrer" className="bg-blue-950/40 hover:bg-blue-900/50 border border-blue-700/60 text-blue-400 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
                <FolderOpen className="w-4 h-4" /> Abrir Carpeta Drive <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          <div className="flex flex-wrap gap-2.5 mt-6 pt-5 border-t border-gray-800/80">
            {[
              { id: 'resumen', label: 'Resumen General' },
              { id: 'tareas', label: 'Tareas (0)' },
              { id: 'visitas', label: `Visitas y Bitácora (${visitas.length})` },
              { id: 'documentos', label: 'Documentos (0)' },
              { id: 'compras', label: 'Compras (0)' },
              { id: 'finanzas', label: `Finanzas (${movimientos.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setPestana(tab.id as PestanaProyecto)}
                className={`px-4 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                  pestana === tab.id ? 'bg-[#EAB308] text-black font-bold shadow-[0_0_15px_rgba(234,179,8,0.25)]' : 'bg-[#161B26] text-gray-300 hover:text-white hover:bg-[#1E2534] font-medium'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* PESTAÑA: RESUMEN GENERAL */}
      {pestana === 'resumen' && (
        <div className="space-y-6">
          {/* 1. ETAPA Y AVANCE */}
          <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-wrap justify-between items-start gap-4 mb-5">
              <div>
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-200">ETAPA Y AVANCE DEL PROYECTO</h2>
                <p className="text-xs text-gray-400 mt-1">Tocá cualquier etapa para actualizar en qué fase se encuentra el proyecto</p>
              </div>
              <span className="bg-[#EAB308]/10 border border-[#EAB308]/30 text-[#EAB308] px-3 py-1 rounded-full text-xs font-bold">Etapa actual: {etapaActual}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              {ETAPAS.map((et, idx) => {
                const completada = idx < indiceEtapaActual;
                const actual = idx === indiceEtapaActual;
                return (
                  <button
                    key={et.id}
                    onClick={() => cambiarEtapa(et.nombre)}
                    className={`text-left p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between min-h-[86px] ${
                      actual ? 'bg-[#EAB308]/10 border-[#EAB308]' : completada ? 'bg-emerald-950/25 border-emerald-800/60 hover:border-emerald-600' : 'bg-[#121212] border-gray-800 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      {completada ? (
                        <span className="w-6 h-6 rounded-full bg-emerald-500 text-black flex items-center justify-center"><Check className="w-3.5 h-3.5 stroke-[3]" /></span>
                      ) : actual ? (
                        <span className="w-6 h-6 rounded-full bg-[#EAB308] text-black text-xs font-extrabold flex items-center justify-center">{et.id}</span>
                      ) : (
                        <span className="w-6 h-6 rounded-full bg-[#1E2534] text-gray-300 text-xs font-bold flex items-center justify-center">{et.id}</span>
                      )}
                      {actual && <span className="text-[10px] font-extrabold text-[#EAB308]">ACTUAL</span>}
                    </div>
                    <span className={`text-xs font-bold leading-snug ${actual || completada ? 'text-white' : 'text-gray-300'}`}>{et.nombre}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. DATOS PRINCIPALES + ESTADO ECONÓMICO Y VISITAS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-[#1A1A1A] border border-gray-800 rounded-2xl p-6 shadow-xl">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-200">DATOS PRINCIPALES DEL PROYECTO</h2>
                <button type="button" onClick={abrirEditarProyecto} className="text-xs font-bold text-[#EAB308] hover:text-[#CA9A04] cursor-pointer">
                  Editar datos →
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-3.5">
                <div className="bg-[#121212] border border-gray-800 rounded-xl p-4">
                  <div className="text-[11px] text-gray-400 mb-1">Cliente</div>
                  <div className="text-sm font-bold text-white">{proyecto.cliente_nombre || 'Particular'}</div>
                </div>
                <div className="bg-[#121212] border border-gray-800 rounded-xl p-4">
                  <div className="text-[11px] text-gray-400 mb-1">Tipología</div>
                  <div className="text-sm font-bold text-white">{proyecto.tipologia}</div>
                </div>
                <div className="bg-[#121212] border border-gray-800 rounded-xl p-4">
                  <div className="text-[11px] text-gray-400 mb-1">Responsable</div>
                  <div className="text-sm font-bold text-white">{proyecto.responsable || 'Sin asignar'}</div>
                </div>
                <div className="bg-[#121212] border border-gray-800 rounded-xl p-4">
                  <div className="text-[11px] text-gray-400 mb-1">Superficie</div>
                  <div className="text-sm font-bold text-white">{proyecto.superficie ? `${proyecto.superficie} m²` : '—'}</div>
                </div>
                <div className="bg-[#121212] border border-gray-800 rounded-xl p-4">
                  <div className="text-[11px] text-gray-400 mb-1">Inicio / Entrega</div>
                  <div className="text-sm font-bold text-white">{formatearFecha(proyecto.fecha_inicio)} → {formatearFecha(proyecto.entrega_estimada)}</div>
                </div>
                <div className="bg-[#121212] border border-gray-800 rounded-xl p-4">
                  <div className="text-[11px] text-gray-400 mb-1">Próxima Visita</div>
                  <div className="text-sm font-bold text-[#EAB308]">{proximaVisitaReal ? formatearFecha(proximaVisitaReal) : 'Sin agendar'}</div>
                </div>
              </div>
              <div className="bg-[#121212] border border-gray-800 rounded-xl p-4">
                <div className="text-[11px] text-gray-400 mb-1.5">Descripción y Notas del Proyecto:</div>
                <div className="text-xs text-gray-300">{proyecto.notas || 'Sin notas adicionales cargadas en la ficha.'}</div>
              </div>
            </div>

            <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-5">
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-200">ESTADO ECONÓMICO ({moneda})</h2>
                  <button type="button" onClick={() => setPestana('finanzas')} className="text-xs font-bold text-[#EAB308] hover:text-[#CA9A04] cursor-pointer">
                    Ver Finanzas →
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="bg-[#121212] border border-gray-800 rounded-xl p-4">
                    <div className="text-[11px] text-gray-400 mb-1">Presupuesto / Honorarios</div>
                    <div className="text-sm font-extrabold text-white">{moneda} ${formatearMonto(presupuesto)}</div>
                  </div>
                  <div className="bg-[#121212] border border-gray-800 rounded-xl p-4">
                    <div className="text-[11px] text-gray-400 mb-1">Cobrado</div>
                    <div className="text-sm font-extrabold text-emerald-400">{moneda} ${formatearMonto(cobrado)}</div>
                  </div>
                  <div className="bg-[#121212] border border-gray-800 rounded-xl p-4">
                    <div className="text-[11px] text-gray-400 mb-1">Saldo por cobrar</div>
                    <div className="text-sm font-extrabold text-[#EAB308]">{moneda} ${formatearMonto(saldoPorCobrar)}</div>
                  </div>
                  <div className="bg-[#121212] border border-gray-800 rounded-xl p-4">
                    <div className="text-[11px] text-gray-400 mb-1">Gastos / Compras</div>
                    <div className="text-sm font-extrabold text-rose-400">{moneda} ${formatearMonto(gastos)}</div>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-gray-800/80">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-gray-200 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#EAB308]" /> Visitas y Reuniones ({visitas.length})
                  </span>
                  <button type="button" onClick={abrirNuevaVisita} className="text-xs font-bold text-[#EAB308] hover:text-[#CA9A04] cursor-pointer">
                    + Agendar visita
                  </button>
                </div>
                {visitas.length > 0 && (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {visitas.map((v) => (
                      <div key={v.id} onClick={() => abrirEditarVisita(v)} className="bg-[#121212] border border-gray-800 hover:border-[#EAB308]/50 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2 cursor-pointer">
                        <div className="overflow-hidden">
                          <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                            {v.titulo} {v.alarma_activa && <Bell className="w-3 h-3 text-[#EAB308] flex-shrink-0" />}
                          </div>
                          <div className="text-[11px] text-gray-400 mt-0.5">{formatearFecha(v.fecha)} · {v.horario} hs</div>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                          v.estado === 'Realizada' ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-400' : v.estado === 'Cancelada' ? 'bg-red-950/60 border-red-800/60 text-red-400' : 'bg-cyan-950/60 border-cyan-800/60 text-cyan-400'
                        }`}>
                          {v.estado}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. TAREAS + DOCUMENTACIÓN */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-[#EAB308]" /> Estado de Tareas y Responsables (0)
              </h2>
              <p className="text-xs text-gray-400 mb-4">Quién está a cargo de cada entrega y qué tareas están en curso, atrasadas o completadas</p>
              <div className="flex items-center gap-4 mb-4">
                <button onClick={() => setPestana('tareas')} className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                  <Plus className="w-3.5 h-3.5" /> Nueva tarea
                </button>
                <button onClick={() => setPestana('tareas')} className="text-xs font-bold text-[#EAB308] cursor-pointer">Ver todas →</button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
                <div className="bg-rose-950/20 border border-rose-900/50 rounded-xl px-3 py-2.5 flex justify-between items-center">
                  <span className="text-xs text-rose-400 font-semibold">Atrasadas</span><span className="text-xs font-bold text-rose-400">0</span>
                </div>
                <div className="bg-amber-950/20 border border-amber-900/50 rounded-xl px-3 py-2.5 flex justify-between items-center">
                  <span className="text-xs text-amber-400 font-semibold">Por realizar</span><span className="text-xs font-bold text-amber-400">0</span>
                </div>
                <div className="bg-blue-950/20 border border-blue-900/50 rounded-xl px-3 py-2.5 flex justify-between items-center">
                  <span className="text-xs text-blue-400 font-semibold">En curso</span><span className="text-xs font-bold text-blue-400">0</span>
                </div>
                <div className="bg-emerald-950/20 border border-emerald-900/50 rounded-xl px-3 py-2.5 flex justify-between items-center">
                  <span className="text-xs text-emerald-400 font-semibold">Completadas</span><span className="text-xs font-bold text-emerald-400">0</span>
                </div>
              </div>
              <div className="bg-[#121212] border border-gray-800 rounded-xl p-6 text-center text-xs text-gray-500">Aún no hay tareas cargadas para este proyecto.</div>
            </div>

            <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start gap-4 mb-4">
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-2"><FileText className="w-4 h-4 text-[#EAB308]" /> Documentación y Entregas (0)</h2>
                    <p className="text-xs text-gray-400 mt-1">Qué planos o propuestas están listos y cuáles faltan terminar</p>
                  </div>
                  <button onClick={() => setPestana('documentos')} className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                    <Plus className="w-3.5 h-3.5" /> Subir
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-[#121212] border border-gray-800 rounded-xl p-4">
                    <div className="text-xs font-bold text-emerald-400">Listos / Aprobados</div>
                    <div className="text-2xl font-extrabold text-emerald-400 my-1">0</div>
                    <div className="text-[11px] text-gray-400">Entregados o visados</div>
                  </div>
                  <div className="bg-[#121212] border border-gray-800 rounded-xl p-4">
                    <div className="text-xs font-bold text-[#EAB308]">En Desarrollo / Faltan</div>
                    <div className="text-2xl font-extrabold text-[#EAB308] my-1">0</div>
                    <div className="text-[11px] text-gray-400">Borradores o pendientes</div>
                  </div>
                </div>
                <div className="bg-[#121212] border border-gray-800 rounded-xl p-5 text-center text-xs text-gray-500">Aún no hay planos, moodboards ni documentos cargados en este proyecto.</div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-800/80">
                <button onClick={() => setPestana('documentos')} className="text-xs font-bold text-[#EAB308] cursor-pointer">Abrir todos los documentos y carpeta Drive →</button>
              </div>
            </div>
          </div>

          {/* 4. EQUIPO + COMENTARIOS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-6 shadow-xl">
              <div className="flex justify-between items-start gap-4 mb-5">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2"><Users className="w-4 h-4 text-[#EAB308]" /> Equipo y Responsables</h2>
                  <p className="text-xs text-gray-400 mt-1">Profesionales que participan en este proyecto</p>
                </div>
                <button className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                  <Plus className="w-3.5 h-3.5" /> Sumar / Invitar
                </button>
              </div>
              <div className="space-y-2.5">
                {INTEGRANTES_BASE.slice(0, 3).map((int) => {
                  const esResponsable = proyecto.responsable === int.nombre;
                  const asignado = equipoAsignado.includes(int.nombre);
                  return (
                    <div key={int.nombre} className={`rounded-xl p-3.5 border flex items-center justify-between gap-3 ${esResponsable ? 'bg-[#EAB308]/10 border-[#EAB308]/40' : 'bg-[#121212] border-gray-800'}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#1E2534] border border-gray-700 flex items-center justify-center text-xs font-bold text-white">{int.iniciales}</div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{int.nombre}</span>
                            {esResponsable && <span className="bg-[#EAB308] text-black px-2 py-0.5 rounded text-[10px] font-extrabold">Responsable</span>}
                          </div>
                          <div className="text-[11px] text-gray-400 mt-0.5">{int.especialidad}</div>
                        </div>
                      </div>
                      <button onClick={() => toggleAsignar(int.nombre)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${asignado ? 'bg-emerald-950/60 border border-emerald-700/60 text-emerald-400' : 'bg-[#1A1A1A] border border-gray-700 text-gray-300 hover:text-white'}`}>
                        {asignado ? <><Check className="w-3.5 h-3.5" /> Asignado</> : '+ Asignar'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-6 shadow-xl flex flex-col">
              <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-1"><MessageSquare className="w-4 h-4 text-[#EAB308]" /> Comentarios del Proyecto y Menciones (@Nombre)</h2>
              <p className="text-xs text-gray-400 mb-4">Dejá notas sobre el proyecto o tocá el nombre de un integrante para etiquetarlo</p>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="text-[11px] text-gray-400">Mencionar a:</span>
                {INTEGRANTES_BASE.slice(0, 3).map((int) => (
                  <button key={int.nombre} type="button" onClick={() => insertarMencion(int.nombre)} className="bg-blue-950/50 hover:bg-blue-900/60 border border-blue-800/60 text-blue-400 px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer">
                    @{int.nombre}
                  </button>
                ))}
              </div>
              <form onSubmit={publicarComentario} className="flex gap-2.5 mb-5">
                <input type="text" value={nuevoComentario} onChange={(e) => setNuevoComentario(e.target.value)} placeholder="Escribí un comentario o actualización sobre el proyecto..." className="flex-1 bg-[#121212] border border-gray-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500" />
                <button type="submit" className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer">Publicar</button>
              </form>
              {comentarios.length === 0 ? (
                <p className="text-xs text-gray-500">Aún no hay comentarios cargados en este proyecto.</p>
              ) : (
                <div className="space-y-2.5 max-h-56 overflow-y-auto">
                  {comentarios.map((c) => (
                    <div key={c.id} className="bg-[#121212] border border-gray-800 rounded-xl p-3 text-xs">
                      <div className="flex justify-between text-gray-400 mb-1"><strong className="text-white">{c.autor}</strong><span>{c.fecha}</span></div>
                      <p className="text-gray-300">{c.texto}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA: FINANZAS */}
      {pestana === 'finanzas' && (
        <div className="space-y-6">
          <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2"><BarChart3 className="w-4 h-4 text-[#EAB308]" /> Balance Financiero del Proyecto ({moneda})</h2>
                <p className="text-xs text-gray-400 mt-1">Comparativa de honorarios pactados, cobrados, pendientes y gastos/compras del proyecto</p>
              </div>
              <button onClick={abrirNuevoMovimiento} className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Nuevo movimiento
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-5 grid grid-cols-2 gap-3.5">
                <div className="bg-[#121212] border border-gray-800 rounded-xl p-4">
                  <div className="text-[11px] text-gray-400 mb-1">Presupuesto / Honorarios</div>
                  <div className="text-base font-extrabold text-white">{moneda} ${formatearMonto(presupuesto)}</div>
                </div>
                <div className="bg-[#121212] border border-gray-800 rounded-xl p-4">
                  <div className="text-[11px] text-gray-400 mb-1">Ingresos Cobrados</div>
                  <div className="text-base font-extrabold text-emerald-400">{moneda} ${formatearMonto(cobrado)}</div>
                </div>
                <div className="bg-[#121212] border border-gray-800 rounded-xl p-4">
                  <div className="text-[11px] text-gray-400 mb-1">Pendiente de Cobro</div>
                  <div className="text-base font-extrabold text-[#EAB308]">{moneda} ${formatearMonto(saldoPorCobrar)}</div>
                </div>
                <div className="bg-[#121212] border border-gray-800 rounded-xl p-4">
                  <div className="text-[11px] text-gray-400 mb-1">Resultado Neto</div>
                  <div className={`text-base font-extrabold ${resultadoNeto >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{moneda} ${formatearMonto(resultadoNeto)}</div>
                </div>
              </div>

              <div className="lg:col-span-7 bg-[#121212] border border-gray-800 rounded-xl p-5 space-y-4">
                {[
                  { lbl: 'Presupuesto / Honorarios', val: presupuesto, pct: presupuesto > 0 ? 100 : 0, colorTxt: 'text-white', colorBar: 'bg-sky-500' },
                  { lbl: 'Ingresos Cobrados', val: cobrado, pct: pctCobrado, colorTxt: 'text-emerald-400', colorBar: 'bg-emerald-500' },
                  { lbl: 'Pendiente de Cobro', val: saldoPorCobrar, pct: pctPendiente, colorTxt: 'text-[#EAB308]', colorBar: 'bg-[#EAB308]' },
                  { lbl: 'Gastos Directos y Compras', val: gastos, pct: pctGastos, colorTxt: 'text-rose-400', colorBar: 'bg-rose-500' },
                ].map((b) => (
                  <div key={b.lbl}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-gray-300 font-medium">{b.lbl}</span>
                      <span className={`${b.colorTxt} font-bold`}>{moneda} ${formatearMonto(b.val)}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full ${b.colorBar} rounded-full transition-all`} style={{ width: `${b.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-sm font-bold text-white mb-4">Historial de Movimientos del Proyecto ({movimientos.length})</h3>
            {movimientos.length === 0 ? (
              <div className="bg-[#121212] border border-gray-800 rounded-xl p-8 text-center text-xs text-gray-400">No hay movimientos registrados para este proyecto todavía.</div>
            ) : (
              <div className="space-y-3">
                {movimientos.map((m) => {
                  const esIngreso = m.tipo === 'ingreso';
                  const finalizado = m.estado === 'Cobrado / Pagado';
                  return (
                    <div key={m.id} onClick={() => abrirEditarMovimiento(m)} className="bg-[#121212] border border-gray-800 hover:border-[#EAB308]/60 hover:bg-[#171717] rounded-xl p-4 flex flex-wrap justify-between items-center gap-3 cursor-pointer">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-white">{m.concepto}</span>
                          {!esIngreso && <span className="bg-[#EAB308]/15 border border-[#EAB308]/30 text-[#EAB308] px-2 py-0.5 rounded-full text-[10px] font-semibold">Compra</span>}
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${finalizado ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-400' : 'bg-blue-950/60 border-blue-800/60 text-blue-400'}`}>
                            {finalizado ? 'Finalizado' : m.estado}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">{m.categoria || 'General'} · {formatearFecha(m.fecha)} · {m.nro_factura || 'S/C'}</div>
                      </div>
                      <span className={`text-sm font-extrabold ${esIngreso ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {esIngreso ? '+' : '-'}{m.moneda} ${formatearMonto(m.importe)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PESTAÑA: VISITAS */}
      {pestana === 'visitas' && (
        <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-wrap justify-between items-center gap-4 mb-5">
            <div>
              <h2 className="text-sm font-bold text-white">Visitas y Bitácora de Obra ({visitas.length})</h2>
              <p className="text-xs text-gray-400 mt-0.5">Hacé clic en cualquier visita para ver o editar el acta y su alarma</p>
            </div>
            <button onClick={abrirNuevaVisita} className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer">
              <Plus className="w-3.5 h-3.5" /> Agendar visita
            </button>
          </div>
          {visitas.length === 0 ? (
            <div className="bg-[#121212] border border-gray-800 rounded-xl p-8 text-center text-xs text-gray-400">No hay visitas agendadas para este proyecto todavía.</div>
          ) : (
            <div className="space-y-3">
              {visitas.map((v) => (
                <div key={v.id} onClick={() => abrirEditarVisita(v)} className="bg-[#121212] border border-gray-800 hover:border-[#EAB308]/60 rounded-xl p-4 flex flex-wrap justify-between items-center gap-4 cursor-pointer">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-bold text-[#EAB308]">{formatearFecha(v.fecha)} · {v.horario} hs</span>
                      <span className="text-sm font-bold text-white">{v.titulo}</span>
                      {v.alarma_activa && <span className="inline-flex items-center gap-1 bg-[#EAB308]/15 text-[#EAB308] px-2 py-0.5 rounded-full text-[10px] font-bold"><Bell className="w-3 h-3" /> {formatearFecha(v.alarma_fecha)} {v.alarma_horario}</span>}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{v.categoria} · Responsable: {v.responsable}</div>
                  </div>
                  <span className="bg-cyan-950/60 border border-cyan-800/60 text-cyan-400 px-3 py-1 rounded-full text-xs font-semibold">{v.estado}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {['tareas', 'documentos', 'compras'].includes(pestana) && (
        <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-10 text-center shadow-xl">
          <p className="text-sm text-gray-300 font-semibold capitalize mb-1">{pestana}</p>
          <p className="text-xs text-gray-500">Pronto conectaremos esta sección con su tabla correspondiente en Supabase.</p>
        </div>
      )}

      {/* MODAL 1: EDITAR PROYECTO */}
      {modalEditarProyecto && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800 w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 pt-6 pb-4 flex justify-between items-start">
              <div>
                <h2 className="text-lg font-bold text-white">Editar Proyecto</h2>
                <p className="text-xs text-gray-400 mt-0.5">Arquitectura, diseño de interiores, paisajismo, reforma u obra</p>
              </div>
              <button onClick={() => setModalEditarProyecto(false)} className="text-gray-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={guardarEdicionProyecto} className="px-6 pb-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Nombre del Proyecto *</label>
                <input type="text" required value={editNombre} onChange={(e) => setEditNombre(e.target.value)} className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white" />
              </div>

              <div className="bg-[#151515] border border-gray-800 rounded-xl overflow-hidden">
                <button type="button" onClick={() => setMostrarEditPortada(!mostrarEditPortada)} className="w-full px-4 py-3 text-left text-xs font-bold text-gray-200 flex items-center gap-2 cursor-pointer">
                  <span className="text-[#EAB308] text-sm font-bold">{mostrarEditPortada ? '−' : '+'}</span> Imagen de portada (opcional)
                </button>
                {mostrarEditPortada && (
                  <div className="px-4 pb-4 pt-2 space-y-3 border-t border-gray-800/70">
                    <div>
                      <div className="text-xs font-bold text-white">Imagen de Portada del Proyecto (Opcional)</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">Subí una foto, moodboard o render del proyecto, o pegá abajo un enlace directo.</div>
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                      {editPortada && (
                        <button type="button" onClick={() => setEditPortada('')} className="border border-red-900/60 bg-red-950/30 text-red-400 px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer">
                          <Trash2 className="w-3.5 h-3.5" /> Eliminar imagen
                        </button>
                      )}
                      <input ref={editFileInputRef} type="file" accept="image/*" onChange={(e) => leerImagen(e, setEditPortada)} className="hidden" />
                      <button type="button" onClick={() => editFileInputRef.current?.click()} className="border border-dashed border-[#EAB308]/50 bg-[#EAB308]/5 text-[#EAB308] px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer">
                        <Upload className="w-3.5 h-3.5" /> Subir foto / render
                      </button>
                    </div>
                    {editPortada && <div className="rounded-xl overflow-hidden border border-gray-800"><img src={editPortada} alt="Portada" className="w-full h-36 object-cover" /></div>}
                    <input type="text" value={editPortada.startsWith('data:image') ? '' : editPortada} onChange={(e) => setEditPortada(e.target.value)} placeholder="O pegá aquí el enlace de la imagen o render del proyecto (https://...)" className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Cliente / Comitente</label>
                  <button type="button" onClick={() => { setDropCliente(!dropCliente); setDropResp(false); }} className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2 text-sm text-white flex items-center justify-between cursor-pointer min-h-[42px]">
                    {clienteEditActual ? (
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="border border-[#EAB308]/50 bg-[#EAB308]/10 text-[#EAB308] px-1.5 py-0.5 rounded text-[11px] font-bold">{clienteEditActual.codigo}</span>
                        <span className="font-semibold truncate">{clienteEditActual.nombre}</span>
                        <span className="bg-cyan-950/60 border border-cyan-800/60 text-cyan-400 px-2 py-0.5 rounded-full text-[10px]">{clienteEditActual.estado || 'Activo'}</span>
                      </div>
                    ) : <span className="text-gray-400 truncate">Particular / Sin cliente vinculado</span>}
                    {dropCliente ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </button>
                  {dropCliente && (
                    <div className="absolute left-0 right-0 mt-2 bg-[#161616] border border-gray-700 rounded-xl shadow-2xl z-30 overflow-hidden">
                      <div className="p-2 border-b border-gray-800 relative">
                        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input type="text" value={busqCliente} onChange={(e) => setBusqCliente(e.target.value)} placeholder="Buscar cliente..." className="w-full bg-[#121212] border border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white" />
                      </div>
                      <div className="max-h-48 overflow-y-auto p-1.5 space-y-1">
                        <button type="button" onClick={() => { setEditClienteId(''); setDropCliente(false); }} className="w-full text-left px-3 py-2 rounded-lg text-xs text-gray-300 hover:bg-gray-800 cursor-pointer">Particular / Sin cliente vinculado</button>
                        {clientesEditFiltrados.map((c) => (
                          <button key={c.id} type="button" onClick={() => { setEditClienteId(String(c.id)); setDropCliente(false); }} className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between cursor-pointer ${String(editClienteId) === String(c.id) ? 'bg-[#EAB308]/15' : 'hover:bg-gray-800'}`}>
                            <div className="flex items-center gap-2 overflow-hidden"><span className="text-[#EAB308] font-bold">{c.codigo}</span><span className="text-white font-semibold truncate">{c.nombre}</span></div>
                            {String(editClienteId) === String(c.id) && <Check className="w-3.5 h-3.5 text-[#EAB308]" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Responsable del Proyecto</label>
                  <button type="button" onClick={() => { setDropResp(!dropResp); setDropCliente(false); }} className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2 text-sm text-white flex items-center justify-between cursor-pointer min-h-[42px]">
                    <div className="flex items-center gap-2"><UserCheck className="w-4 h-4 text-[#EAB308]" /><span className="font-bold truncate">{editResponsable}</span></div>
                    {dropResp ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </button>
                  {dropResp && (
                    <div className="absolute left-0 right-0 mt-2 bg-[#161616] border border-gray-700 rounded-xl shadow-2xl z-30 overflow-hidden">
                      <div className="p-2 border-b border-gray-800 relative">
                        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input type="text" value={busqResp} onChange={(e) => setBusqResp(e.target.value)} placeholder="Buscar integrante..." className="w-full bg-[#121212] border border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white" />
                      </div>
                      <div className="max-h-48 overflow-y-auto p-1.5 space-y-1">
                        {respEditFiltrados.map((i) => (
                          <button key={i.nombre} type="button" onClick={() => { setEditResponsable(i.nombre); setDropResp(false); }} className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between cursor-pointer ${editResponsable === i.nombre ? 'bg-[#EAB308]/15' : 'hover:bg-gray-800'}`}>
                            <div><div className="text-xs font-bold text-white">{i.nombre}</div><div className="text-[11px] text-gray-400">{i.especialidad}</div></div>
                            {editResponsable === i.nombre && <Check className="w-3.5 h-3.5 text-[#EAB308]" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Tipología</label>
                  <select value={editTipologia} onChange={(e) => setEditTipologia(e.target.value)} className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white">
                    {TIPOLOGIAS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Etapa Actual</label>
                  <select value={editEtapa} onChange={(e) => setEditEtapa(e.target.value)} className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white">
                    {ETAPAS.map((et) => <option key={et.id} value={et.nombre}>{et.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Estado</label>
                  <select value={editEstado} onChange={(e) => setEditEstado(e.target.value)} className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white">
                    {ESTADOS.map((est) => <option key={est} value={est}>{est}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Moneda</label>
                  <select value={editMoneda} onChange={(e) => setEditMoneda(e.target.value)} className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white">
                    <option value="ARS">ARS</option><option value="USD">USD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Presupuesto / Honorarios</label>
                  <input type="text" inputMode="decimal" value={editPresupuesto} onChange={(e) => formatearImporteInput(e.target.value, setEditPresupuesto)} className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Entrega Estimada</label>
                  <input type="date" value={editEntrega} onChange={(e) => setEditEntrega(e.target.value)} className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white [color-scheme:dark]" />
                </div>
              </div>

              <div className="bg-[#151515] border border-gray-800 rounded-xl overflow-hidden">
                <button type="button" onClick={() => setMostrarEditMasDatos(!mostrarEditMasDatos)} className="w-full px-4 py-3 text-left text-xs flex items-center gap-2 cursor-pointer">
                  <span className="text-[#EAB308] text-sm font-bold">{mostrarEditMasDatos ? '−' : '+'}</span>
                  <strong className="font-bold text-white">Más datos (opcional)</strong>
                  <span className="text-gray-400">código, ubicación, Drive, superficie, fechas y notas</span>
                </button>
                {mostrarEditMasDatos && (
                  <div className="p-4 space-y-4 border-t border-gray-800/70">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">Ubicación / Dirección</label>
                        <div className="flex gap-2">
                          <input type="text" value={editUbicacion} onChange={(e) => setEditUbicacion(e.target.value)} className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2 text-sm text-white" />
                          {editUbicacion.trim() && <a href={obtenerEnlaceMaps(editUbicacion)} target="_blank" rel="noopener noreferrer" className="bg-cyan-950/50 border border-cyan-700/60 text-cyan-400 px-3 rounded-lg flex items-center"><ExternalLink className="w-4 h-4" /></a>}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">Carpeta de Google Drive / Nube</label>
                        <div className="flex gap-2">
                          <input type="text" value={editDrive} onChange={(e) => setEditDrive(e.target.value)} className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2 text-sm text-white" />
                          {editDrive.trim() && <a href={editDrive.trim()} target="_blank" rel="noopener noreferrer" className="bg-cyan-950/50 border border-cyan-700/60 text-cyan-400 px-3 rounded-lg flex items-center"><ExternalLink className="w-4 h-4" /></a>}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">Código</label>
                        <input type="text" value={editCodigo} onChange={(e) => setEditCodigo(e.target.value)} className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2 text-sm text-white" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">Superficie (m²)</label>
                        <input type="text" value={editSuperficie} onChange={(e) => setEditSuperficie(e.target.value)} className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2 text-sm text-white" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">Fecha de Inicio</label>
                        <input type="date" value={editFechaInicio} onChange={(e) => setEditFechaInicio(e.target.value)} className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2 text-sm text-white [color-scheme:dark]" />
                      </div>
                    </div>
                    <div className="max-w-xs">
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">Próxima Visita / Reunión</label>
                      <input type="date" value={editProximaVisita} onChange={(e) => setEditProximaVisita(e.target.value)} className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2 text-sm text-white [color-scheme:dark]" />
                      <p className="text-[11px] text-gray-500 mt-1">Opcional: si agendás visitas, la próxima se muestra sola.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">Descripción y Notas del Proyecto</label>
                      <textarea rows={3} value={editNotas} onChange={(e) => setEditNotas(e.target.value)} className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2 text-sm text-white resize-none" />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end items-center gap-3 pt-2">
                <button type="button" onClick={() => setModalEditarProyecto(false)} className="border border-transparent hover:border-gray-500/40 hover:bg-gray-500/15 text-gray-300 hover:text-white px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer">Cancelar</button>
                <button type="submit" disabled={cargando} className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-5 py-2.5 rounded-lg font-bold text-sm cursor-pointer disabled:opacity-50">{cargando ? 'Guardando...' : 'Guardar Cambios'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: MOVIMIENTO FINANCIERO */}
      {modalMovimiento && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800 w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 pt-6 pb-4 flex justify-between items-start">
              <div>
                <h2 className="text-lg font-bold text-white">{movEditando ? 'Editar Movimiento Financiero' : 'Nuevo Movimiento Financiero'}</h2>
                <p className="text-xs text-gray-400 mt-0.5">Registro multimoneda de honorarios, cobros y gastos</p>
              </div>
              <button onClick={() => setModalMovimiento(false)} className="text-gray-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={guardarMovimiento} className="px-6 pb-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 bg-[#121212] p-1 rounded-lg border border-gray-800">
                <button type="button" onClick={() => setMovTipo('ingreso')} className={`py-2 rounded-md text-xs font-bold cursor-pointer ${movTipo === 'ingreso' ? 'bg-[#00D285] text-black shadow' : 'text-gray-400 hover:text-white'}`}>+ Ingreso / Honorario</button>
                <button type="button" onClick={() => setMovTipo('egreso')} className={`py-2 rounded-md text-xs font-bold cursor-pointer ${movTipo === 'egreso' ? 'bg-red-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>- Egreso / Costo</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-gray-300 mb-1.5">Categoría</label><input type="text" value={movCategoria} onChange={(e) => setMovCategoria(e.target.value)} className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white" /></div>
                <div><label className="block text-xs font-semibold text-gray-300 mb-1.5">Nro. Factura / Recibo</label><input type="text" value={movFactura} onChange={(e) => setMovFactura(e.target.value)} placeholder="Ej. FAC-A-0003-00189" className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500" /></div>
              </div>
              <div><label className="block text-xs font-semibold text-gray-300 mb-1.5">Concepto / Detalle *</label><input type="text" required value={movConcepto} onChange={(e) => setMovConcepto(e.target.value)} placeholder="Ej. Certificación #02 Proyecto Ejecutivo Casa Terrazas" className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500" /></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="block text-xs font-semibold text-gray-300 mb-1.5">Moneda *</label><select value={movMoneda} onChange={(e) => setMovMoneda(e.target.value)} className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white"><option value="ARS">ARS</option><option value="USD">USD</option></select></div>
                <div><label className="block text-xs font-semibold text-gray-300 mb-1.5">Importe *</label><input type="text" inputMode="decimal" required value={movImporte} onChange={(e) => formatearImporteInput(e.target.value, setMovImporte)} placeholder="0,00" className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white" /></div>
                <div><label className="block text-xs font-semibold text-gray-300 mb-1.5">Estado</label><select value={movEstado} onChange={(e) => setMovEstado(e.target.value)} className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white"><option value="Cobrado / Pagado">Cobrado / Pagado</option><option value="Facturado">Facturado</option><option value="Pendiente">Pendiente</option></select></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-gray-300 mb-1.5">Fecha *</label><input type="date" required value={movFecha} onChange={(e) => setMovFecha(e.target.value)} className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white [color-scheme:dark]" /></div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Corresponde al Proyecto (Opcional)</label>
                  <div className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2"><span className="border border-[#EAB308]/50 bg-[#EAB308]/10 text-[#EAB308] px-1.5 py-0.5 rounded text-[10px] font-bold">{proyecto.codigo}</span><span className="text-xs font-bold text-white">{proyecto.nombre}</span></div>
                      <span className="inline-block bg-cyan-950/60 border border-cyan-800/60 text-cyan-400 px-2 py-0.5 rounded-full text-[10px]">{estadoActual}</span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Cliente (Opcional)</label>
                  <select value={movClienteId} onChange={(e) => setMovClienteId(e.target.value)} className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white">
                    <option value="">Ninguno</option>
                    {clientes.map((c) => <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Proveedor / Asesor (Opcional)</label>
                  <select value={movProveedor} onChange={(e) => setMovProveedor(e.target.value)} className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white"><option value="Ninguno">Ninguno</option></select>
                </div>
              </div>
              <div><label className="block text-xs font-semibold text-gray-300 mb-1.5">Notas / Observaciones</label><textarea rows={3} value={movNotas} onChange={(e) => setMovNotas(e.target.value)} placeholder="Medio de pago, cuenta bancaria, cuotas o aclaraciones..." className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 resize-none" /></div>
              <div className="flex justify-between items-center pt-3">
                <div>
                  {movEditando && (
                    <button type="button" onClick={eliminarMovimiento} disabled={cargando} className="border border-transparent hover:border-red-500/40 hover:bg-red-500/15 text-red-500 px-4 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 cursor-pointer">
                      <Trash2 className="w-4 h-4" /> Eliminar movimiento
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setModalMovimiento(false)} className="border border-transparent hover:border-gray-500/40 hover:bg-gray-500/15 text-gray-300 hover:text-white px-4 py-2.5 rounded-lg font-medium text-sm cursor-pointer">Cancelar</button>
                  <button type="submit" disabled={cargando} className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-5 py-2.5 rounded-lg font-bold text-sm cursor-pointer">{cargando ? 'Guardando...' : movEditando ? 'Guardar Cambios' : 'Registrar Movimiento'}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: VISITA / REUNIÓN + ALARMA */}
      {modalVisita && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800 w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 pt-6 pb-4 flex justify-between items-start">
              <div>
                <h2 className="text-lg font-bold text-white">{visitaEditando ? 'Editar Visita / Reunión' : 'Programar Visita / Reunión'}</h2>
                <p className="text-xs text-gray-400 mt-0.5">Inspección de obra, reunión con cliente, coordinación de gremios y acta</p>
              </div>
              <button onClick={() => setModalVisita(false)} className="text-gray-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={guardarVisita} className="px-6 pb-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Corresponde al Proyecto / Obra *</label>
                <div className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="border border-[#EAB308]/50 bg-[#EAB308]/10 text-[#EAB308] px-2 py-0.5 rounded text-xs font-bold">{proyecto.codigo}</span>
                    <span className="text-sm font-bold text-white">{proyecto.nombre}</span>
                    <span className="bg-cyan-950/60 border border-cyan-800/60 text-cyan-400 px-2.5 py-0.5 rounded-full text-[11px]">{estadoActual}</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Categoría</label>
                  <select value={visCategoria} onChange={(e) => setVisCategoria(e.target.value)} className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white">
                    {CATEGORIAS_VISITA.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>

                <div className="relative">
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Responsable / Participante</label>
                  <button type="button" onClick={() => setDropVisResp(!dropVisResp)} className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-[#EAB308]" />
                      <span className="font-bold truncate">{visResponsable}</span>
                    </div>
                    {dropVisResp ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </button>
                  {dropVisResp && (
                    <div className="absolute left-0 right-0 mt-2 bg-[#161616] border border-gray-700 rounded-xl shadow-2xl z-30 p-1.5 space-y-1">
                      {INTEGRANTES_BASE.map((i) => (
                        <button
                          key={i.nombre}
                          type="button"
                          onClick={() => { setVisResponsable(i.nombre); setDropVisResp(false); }}
                          className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between cursor-pointer ${visResponsable === i.nombre ? 'bg-[#EAB308]/15' : 'hover:bg-gray-800'}`}
                        >
                          <div>
                            <div className="text-xs font-bold text-white">{i.nombre}</div>
                            <div className="text-[11px] text-gray-400">{i.especialidad}</div>
                          </div>
                          {visResponsable === i.nombre && <Check className="w-3.5 h-3.5 text-[#EAB308]" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div><label className="block text-xs font-semibold text-gray-300 mb-1.5">Motivo / Título de Visita *</label><input type="text" required value={visTitulo} onChange={(e) => setVisTitulo(e.target.value)} placeholder="Ej. Visita #14: Replanteo de carpinterías y niveles" className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500" /></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="block text-xs font-semibold text-gray-300 mb-1.5">Fecha *</label><input type="date" required value={visFecha} onChange={(e) => setVisFecha(e.target.value)} className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white [color-scheme:dark]" /></div>
                <div><label className="block text-xs font-semibold text-gray-300 mb-1.5">Horario</label><input type="time" value={visHorario} onChange={(e) => setVisHorario(e.target.value)} className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white [color-scheme:dark]" /></div>
                <div><label className="block text-xs font-semibold text-gray-300 mb-1.5">Estado</label><select value={visEstado} onChange={(e) => setVisEstado(e.target.value)} className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white">{ESTADOS_VISITA.map((est) => <option key={est} value={est}>{est}</option>)}</select></div>
              </div>

              <div className="bg-[#151515] border border-gray-800 rounded-xl p-4 space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <Bell className={`w-4 h-4 ${visAlarmaActiva ? 'text-[#EAB308]' : 'text-gray-400'}`} />
                    <div>
                      <div className="text-xs font-bold text-white">Alarma / Recordatorio</div>
                      <div className="text-[11px] text-gray-400">Programá una fecha y horario para recibir un aviso</div>
                    </div>
                  </div>
                  <input type="checkbox" checked={visAlarmaActiva} onChange={(e) => setVisAlarmaActiva(e.target.checked)} className="w-4 h-4 accent-[#EAB308] cursor-pointer" />
                </label>
                {visAlarmaActiva && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-800/80">
                    <div><label className="block text-xs font-semibold text-gray-300 mb-1.5">Fecha de la alarma</label><input type="date" required value={visAlarmaFecha} onChange={(e) => setVisAlarmaFecha(e.target.value)} className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2 text-sm text-white [color-scheme:dark]" /></div>
                    <div><label className="block text-xs font-semibold text-gray-300 mb-1.5">Horario de la alarma</label><input type="time" required value={visAlarmaHorario} onChange={(e) => setVisAlarmaHorario(e.target.value)} className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2 text-sm text-white [color-scheme:dark]" /></div>
                  </div>
                )}
              </div>

              <div><label className="block text-xs font-semibold text-gray-300 mb-1.5">Acta de Visita / Acuerdos de Obra</label><textarea rows={3} value={visActa} onChange={(e) => setVisActa(e.target.value)} placeholder="Minuta técnica o acuerdos convenidos..." className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 resize-none" /></div>
              <div className="flex justify-between items-center pt-3">
                <div>
                  {visitaEditando && (
                    <button type="button" onClick={eliminarVisita} disabled={cargando} className="border border-transparent hover:border-red-500/40 hover:bg-red-500/15 text-red-500 px-4 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 cursor-pointer">
                      <Trash2 className="w-4 h-4" /> Eliminar visita
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setModalVisita(false)} className="border border-transparent hover:border-gray-500/40 hover:bg-gray-500/15 text-gray-300 hover:text-white px-4 py-2.5 rounded-lg font-medium text-sm cursor-pointer">Cancelar</button>
                  <button type="submit" disabled={cargando} className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-5 py-2.5 rounded-lg font-bold text-sm cursor-pointer">{cargando ? 'Guardando...' : visitaEditando ? 'Guardar Cambios' : 'Agendar Visita'}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CAMBIAR PORTADA */}
      {modalPortada && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-white">Imagen de Portada</h3>
              <button onClick={() => setModalPortada(false)} className="text-gray-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {portadaUrl && <button type="button" onClick={() => setPortadaUrl('')} className="border border-red-900/60 bg-red-950/30 text-red-400 px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /> Eliminar imagen</button>}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => leerImagen(e, setPortadaUrl)} className="hidden" />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="border border-dashed border-[#EAB308]/50 bg-[#EAB308]/5 text-[#EAB308] px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer"><Upload className="w-3.5 h-3.5" /> Subir foto / render</button>
            </div>
            {portadaUrl && <div className="rounded-xl overflow-hidden border border-gray-800"><img src={portadaUrl} alt="Vista previa" className="w-full h-40 object-cover" /></div>}
            <input type="text" value={portadaUrl.startsWith('data:image') ? '' : portadaUrl} onChange={(e) => setPortadaUrl(e.target.value)} placeholder="O pegá aquí el enlace directo de la imagen (https://...)" className="w-full bg-[#121212] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white" />
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setModalPortada(false)} className="text-gray-300 hover:text-white px-4 py-2 text-xs font-medium cursor-pointer">Cancelar</button>
              <button onClick={guardarPortada} disabled={cargando} className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-5 py-2 rounded-lg text-xs font-bold cursor-pointer">{cargando ? 'Guardando...' : 'Guardar Portada'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ELIMINAR PROYECTO */}
      {modalEliminar && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-[#1A1A1A] border border-red-900/40 rounded-2xl w-full max-w-md p-6 text-center shadow-2xl">
            <div className="w-14 h-14 bg-red-950/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-900/50"><AlertOctagon className="w-7 h-7 text-red-500" /></div>
            <h3 className="text-lg font-bold text-white mb-2">¿Eliminar {proyecto.nombre}?</h3>
            <p className="text-xs text-gray-400 mb-6">Esta acción eliminará el proyecto de la base de datos.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setModalEliminar(false)} className="px-5 py-2 rounded-lg bg-[#121212] border border-gray-700 text-xs font-semibold text-gray-300 cursor-pointer">Cancelar</button>
              <button onClick={eliminarProyecto} disabled={cargando} className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-bold text-white cursor-pointer">{cargando ? 'Eliminando...' : 'Sí, eliminar'}</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#161616] border border-gray-700/80 shadow-2xl rounded-xl px-5 py-3.5 flex items-center gap-3 z-50">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-semibold text-white">{toast}</span>
        </div>
      )}
    </div>
  );
}