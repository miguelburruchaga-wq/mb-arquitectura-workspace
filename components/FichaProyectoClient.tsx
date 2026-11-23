"use client";

import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { moverAPapelera } from '@/lib/papelera';
import ModalMovimientoFinanciero from '@/components/ModalMovimientoFinanciero';
import ModalCompraPedido from '@/components/ModalCompraPedido';
import ModalTarea from '@/components/ModalTarea';
import ModalDocumento from '@/components/ModalDocumento';
import ModalVisita from '@/components/ModalVisita';
import {
  ArrowLeft,
  User,
  MapPin,
  ExternalLink,
  Image as ImageIcon,
  Edit3,
  Trash2,
  Plus,
  CheckCircle2,
  CircleDollarSign,
  Calendar,
  CheckSquare,
  ShoppingCart,
  FileText,
  FolderOpen,
  Users,
  MessageSquare,
  X,
  Check,
  Tag,
} from 'lucide-react';

const ETAPAS_PROYECTO = [
  'Relevamiento y Concepto',
  'Anteproyecto y Diseño',
  'Proyecto Ejecutivo y Detalles',
  'Presupuesto y Compras',
  'Ejecución / Obra / Montaje',
  'Entrega Final',
];

export default function FichaProyectoClient({
  proyecto,
  clientes = [],
  movimientos = [],
  visitas = [],
  tareas = [],
  compras = [],
  proveedores = [],
  equipo = [],
  documentos = [],
}: {
  proyecto: any;
  clientes?: any[];
  movimientos?: any[];
  visitas?: any[];
  tareas?: any[];
  compras?: any[];
  proveedores?: any[];
  equipo?: any[];
  documentos?: any[];
}) {
  const router = useRouter();
  const [montado, setMontado] = useState(false);

  const [pestanaActiva, setPestanaActiva] = useState<
    'resumen' | 'tareas' | 'visitas' | 'documentos' | 'compras' | 'finanzas' | 'comentarios'
  >('resumen');
  const [estadoProyecto, setEstadoProyecto] = useState(proyecto.estado || 'En Diseño');
  const [etapaActual, setEtapaActual] = useState(
    proyecto.etapa_actual || 'Relevamiento y Concepto'
  );
  const [toast, setToast] = useState<string | null>(null);

  // Confirmación Papelera del Proyecto
  const [confirmarPapelera, setConfirmarPapelera] = useState(false);
  const [enviandoPapelera, setEnviandoPapelera] = useState(false);

  const [equipoAsignado, setEquipoAsignado] = useState<string[]>(() => {
    const base = Array.isArray(proyecto.equipo_asignado) ? [...proyecto.equipo_asignado] : [];
    if (proyecto.responsable && !base.includes(proyecto.responsable)) {
      base.unshift(proyecto.responsable);
    }
    return base;
  });

  const [comentarios, setComentarios] = useState<any[]>(
    Array.isArray(proyecto.comentarios) ? proyecto.comentarios : []
  );
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [enviandoComentario, setEnviandoComentario] = useState(false);

  const [filtroTareaResumen, setFiltroTareaResumen] = useState<
    'todas' | 'atrasadas' | 'por_realizar' | 'en_curso' | 'completadas'
  >('todas');

  // Modales compartidos
  const [modalCompra, setModalCompra] = useState(false);
  const [compraEditando, setCompraEditando] = useState<any | null>(null);
  const [modalMovimiento, setModalMovimiento] = useState(false);
  const [movEditando, setMovEditando] = useState<any | null>(null);
  const [modalTarea, setModalTarea] = useState(false);
  const [tareaEditando, setTareaEditando] = useState<any | null>(null);
  const [modalDocumento, setModalDocumento] = useState(false);
  const [docEditando, setDocEditando] = useState<any | null>(null);
  const [modalVisita, setModalVisita] = useState(false);
  const [visitaEditando, setVisitaEditando] = useState<any | null>(null);

  // Modal Editar Proyecto
  const [modalEditarProy, setModalEditarProy] = useState(false);
  const [editNombre, setEditNombre] = useState(proyecto.nombre || '');
  const [editTipologia, setEditTipologia] = useState(proyecto.tipologia || '');
  const [editResponsable, setEditResponsable] = useState(proyecto.responsable || '');
  const [editClienteId, setEditClienteId] = useState(
    proyecto.cliente_id ? String(proyecto.cliente_id) : ''
  );
  const [editUbicacion, setEditUbicacion] = useState(proyecto.ubicacion || '');
  const [editSuperficie, setEditSuperficie] = useState(proyecto.superficie || '');
  const [editPresupuesto, setEditPresupuesto] = useState(String(proyecto.presupuesto || ''));
  const [editFechaInicio, setEditFechaInicio] = useState(proyecto.fecha_inicio || '');
  const [editFechaEntrega, setEditFechaEntrega] = useState(proyecto.fecha_entrega || '');
  const [editDriveUrl, setEditDriveUrl] = useState(proyecto.drive_url || '');
  const [editDescripcion, setEditDescripcion] = useState(proyecto.descripcion || '');
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  useEffect(() => {
    setMontado(true);
  }, []);

  useEffect(() => {
    if (Array.isArray(proyecto.comentarios)) {
      setComentarios(proyecto.comentarios);
    }
  }, [proyecto.comentarios]);

  const mostrarToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const clienteAsociado = useMemo(() => {
    return clientes.find((c) => String(c.id) === String(proyecto.cliente_id));
  }, [clientes, proyecto.cliente_id]);

  const formatearFechaCorta = (iso: string) => {
    if (!iso) return '—';
    const [y, m, d] = String(iso).split('T')[0].split('-');
    if (!y || !m || !d) return iso;
    return `${d}/${m}/${y}`;
  };

  const abrirArchivoAdjunto = (url: string) => {
    if (!url) return;
    if (url.startsWith('data:')) {
      const win = window.open();
      if (win) {
        win.document.write(
          `<iframe src="${url}" frameborder="0" style="border:0;width:100%;height:100vh;" allowfullscreen></iframe>`
        );
      }
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const enviarProyectoAPapelera = async () => {
    setEnviandoPapelera(true);
    try {
      await moverAPapelera({
        tabla: 'proyectos',
        modulo: 'Proyectos',
        titulo: proyecto.nombre || 'Proyecto sin nombre',
        subtitulo: `${proyecto.codigo || ''} ${
          clienteAsociado?.nombre
            ? `· ${clienteAsociado.nombre}`
            : proyecto.cliente_nombre
            ? `· ${proyecto.cliente_nombre}`
            : ''
        }`.trim(),
        registro: proyecto,
      });
      setConfirmarPapelera(false);
      router.push('/proyectos');
      router.refresh();
    } catch (error: any) {
      alert('Error al enviar el proyecto a papelera: ' + error.message);
      setEnviandoPapelera(false);
    }
  };

  const seleccionarEtapa = async (nuevaEtapa: string) => {
    setEtapaActual(nuevaEtapa);
    await supabase.from('proyectos').update({ etapa_actual: nuevaEtapa }).eq('id', proyecto.id);
    mostrarToast(`Etapa actualizada: ${nuevaEtapa}`);
    router.refresh();
  };

  const cambiarEstadoProyecto = async (nuevoEstado: string) => {
    setEstadoProyecto(nuevoEstado);
    await supabase.from('proyectos').update({ estado: nuevoEstado }).eq('id', proyecto.id);
    mostrarToast(`Estado actualizado a ${nuevoEstado}`);
    router.refresh();
  };

  const manejarCambioPortada = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result || '');
      await supabase.from('proyectos').update({ portada_url: dataUrl }).eq('id', proyecto.id);
      mostrarToast('Portada actualizada');
      router.refresh();
    };
    reader.readAsDataURL(file);
  };

  const toggleIntegranteEquipo = async (nombreIntegrante: string) => {
    const yaEsta = equipoAsignado.includes(nombreIntegrante);
    const actualizado = yaEsta
      ? equipoAsignado.filter((n) => n !== nombreIntegrante)
      : [...equipoAsignado, nombreIntegrante];

    setEquipoAsignado(actualizado);
    await supabase
      .from('proyectos')
      .update({ equipo_asignado: actualizado })
      .eq('id', proyecto.id);
    mostrarToast(
      yaEsta
        ? `${nombreIntegrante} quitado del proyecto`
        : `${nombreIntegrante} asignado al proyecto`
    );
    router.refresh();
  };

  const publicarComentario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoComentario.trim()) return;
    setEnviandoComentario(true);

    let autorNombre = 'Alejandro Fego';
    try {
      const saved = localStorage.getItem('mb_sesion_usuario');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.nombre) autorNombre = parsed.nombre;
      }
    } catch {
      // Silencioso
    }

    const item = {
      id: Date.now(),
      autor: autorNombre,
      texto: nuevoComentario.trim(),
      fecha: new Date().toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    const listaActualizada = [item, ...comentarios];

    const { error } = await supabase
      .from('proyectos')
      .update({ comentarios: listaActualizada })
      .eq('id', proyecto.id);

    setEnviandoComentario(false);

    if (!error) {
      setComentarios(listaActualizada);
      setNuevoComentario('');
      mostrarToast('Comentario guardado en el proyecto');
      router.refresh();
    } else {
      alert('Error al guardar comentario: ' + error.message);
    }
  };

  const eliminarComentario = async (comentarioId: number) => {
    const listaActualizada = comentarios.filter((c) => c.id !== comentarioId);
    const { error } = await supabase
      .from('proyectos')
      .update({ comentarios: listaActualizada })
      .eq('id', proyecto.id);

    if (!error) {
      setComentarios(listaActualizada);
      mostrarToast('Comentario eliminado');
      router.refresh();
    } else {
      alert('Error al eliminar comentario: ' + error.message);
    }
  };

  const guardarEdicionProyecto = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoEdicion(true);

    const presNum = parseFloat(String(editPresupuesto).replace(/\./g, '').replace(',', '.')) || 0;

    const { error } = await supabase
      .from('proyectos')
      .update({
        nombre: editNombre.trim(),
        tipologia: editTipologia.trim() || null,
        responsable: editResponsable.trim() || null,
        cliente_id: editClienteId ? Number(editClienteId) : null,
        ubicacion: editUbicacion.trim() || null,
        superficie: editSuperficie.trim() || null,
        presupuesto: presNum,
        fecha_inicio: editFechaInicio || null,
        fecha_entrega: editFechaEntrega || null,
        drive_url: editDriveUrl.trim() || null,
        descripcion: editDescripcion.trim() || null,
      })
      .eq('id', proyecto.id);

    setGuardandoEdicion(false);
    if (!error) {
      setModalEditarProy(false);
      mostrarToast('Datos del proyecto actualizados');
      router.refresh();
    } else {
      alert('Error al actualizar proyecto: ' + error.message);
    }
  };

  const toggleCompletarTarea = async (tarea: any) => {
    const nuevoEstado = tarea.estado === 'Finalizado' ? 'Por realizar' : 'Finalizado';
    await supabase.from('tareas').update({ estado: nuevoEstado }).eq('id', tarea.id);
    mostrarToast(`Tarea marcada como ${nuevoEstado}`);
    router.refresh();
  };

  const cambiarEstadoMovimientoRapido = async (movId: number, nuevoEstado: string) => {
    await supabase.from('movimientos').update({ estado: nuevoEstado }).eq('id', movId);
    mostrarToast(`Movimiento marcado como ${nuevoEstado}`);
    router.refresh();
  };

  const obtenerUsdEquivalente = (m: any) => {
    const mon = String(m.moneda || 'USD').toUpperCase();
    const impOriginal = Number(m.importe ?? 0) || Number(m.monto ?? 0);
    if (mon === 'USD') return impOriginal;
    const impUsd = Number(m.importe_usd ?? 0);
    if (impUsd > 0) return impUsd;
    const cot = Number(m.valor_usd ?? 0);
    return cot > 0 ? impOriginal / cot : 0;
  };

  const esEgresoMov = (m: any) => {
    const t = String(m.tipo || '').toLowerCase();
    return t === 'egreso' || t === 'gasto' || t === 'compra';
  };

  const esAbonadoMov = (est: string) => {
    const e = String(est || '').toLowerCase();
    return e === 'abonado' || e === 'cobrado' || e === 'pagado' || e === 'finalizado';
  };

  const presupuestoUsd = Number(proyecto.presupuesto || 0);

  const ingresosCobradosUsd = useMemo(() => {
    return movimientos
      .filter((m) => !esEgresoMov(m) && esAbonadoMov(m.estado))
      .reduce((acc, m) => acc + obtenerUsdEquivalente(m), 0);
  }, [movimientos]);

  const egresosProyectoUsd = useMemo(() => {
    return movimientos
      .filter((m) => esEgresoMov(m))
      .reduce((acc, m) => acc + obtenerUsdEquivalente(m), 0);
  }, [movimientos]);

  const pendienteCobroUsd = Math.max(0, presupuestoUsd - ingresosCobradosUsd);
  const resultadoNetoUsd = ingresosCobradosUsd - egresosProyectoUsd;
  const porcentajeCobrado =
    presupuestoUsd > 0 ? Math.min(100, Math.round((ingresosCobradosUsd / presupuestoUsd) * 100)) : 0;

  const statsTareas = useMemo(() => {
    const hoyIso = new Date().toISOString().split('T')[0];
    let atrasadas = 0;
    let porRealizar = 0;
    let enCurso = 0;
    let completadas = 0;

    for (const t of tareas) {
      const est = String(t.estado || '').toLowerCase();
      if (est === 'finalizado' || est === 'completada') {
        completadas++;
      } else {
        if (est === 'en curso') enCurso++;
        else porRealizar++;
        if (t.fecha_vencimiento && t.fecha_vencimiento < hoyIso) {
          atrasadas++;
        }
      }
    }

    return { atrasadas, porRealizar, enCurso, completadas };
  }, [tareas]);

  const tareasFiltradasResumen = useMemo(() => {
    const hoyIso = new Date().toISOString().split('T')[0];
    return tareas.filter((t) => {
      const est = String(t.estado || '').toLowerCase();
      const esComp = est === 'finalizado' || est === 'completada';
      if (filtroTareaResumen === 'completadas') return esComp;
      if (filtroTareaResumen === 'en_curso') return est === 'en curso';
      if (filtroTareaResumen === 'por_realizar') return !esComp && est !== 'en curso';
      if (filtroTareaResumen === 'atrasadas')
        return !esComp && Boolean(t.fecha_vencimiento && t.fecha_vencimiento < hoyIso);
      return true;
    });
  }, [tareas, filtroTareaResumen]);

  const proximaVisita = useMemo(() => {
    const hoyIso = new Date().toISOString().split('T')[0];
    const futuras = visitas.filter((v) => v.fecha && v.fecha >= hoyIso && v.estado !== 'Finalizado');
    return futuras[0] || null;
  }, [visitas]);

  const docsListos = useMemo(() => {
    return documentos.filter(
      (d) => d.estado === 'Listo / Aprobado' || d.estado === 'Entregado / Visado'
    ).length;
  }, [documentos]);

  const docsEnDesarrollo = Math.max(0, documentos.length - docsListos);

  // Bloque reutilizable de Comentarios y Menciones (usado en Resumen General y en la pestaña Comentarios)
  const renderTarjetaComentarios = (alturaMaximaLista = 'max-h-60') => (
    <div className="bg-[#242424] border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col">
      <div className="mb-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#EAB308]" />
          Comentarios del Proyecto y Menciones (@Nombre) ({comentarios.length})
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Dejá notas sobre el proyecto o tocá el nombre de un integrante para etiquetarlo
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <span className="text-xs text-gray-400 mr-1">Mencionar a:</span>
        {equipo.map((miembro) => (
          <button
            key={miembro.id}
            type="button"
            onClick={() =>
              setNuevoComentario((prev) =>
                `${prev}${prev && !prev.endsWith(' ') ? ' ' : ''}@${miembro.nombre} `
              )
            }
            className="bg-blue-950/70 hover:bg-blue-900/70 border border-blue-800/60 text-blue-300 px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer transition-colors"
          >
            @{miembro.nombre}
          </button>
        ))}
      </div>

      <form onSubmit={publicarComentario} className="flex gap-2 mb-4">
        <input
          type="text"
          value={nuevoComentario}
          onChange={(e) => setNuevoComentario(e.target.value)}
          placeholder="Escribí un comentario o actualización sobre el proyecto..."
          className="flex-1 bg-[#181818] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-[#EAB308]/60"
        />
        <button
          type="submit"
          disabled={enviandoComentario || !nuevoComentario.trim()}
          className="bg-[#EAB308] hover:bg-[#CA9A04] disabled:opacity-50 text-black px-4 py-2.5 rounded-xl font-bold text-xs cursor-pointer flex-shrink-0"
        >
          {enviandoComentario ? 'Guardando...' : 'Publicar'}
        </button>
      </form>

      <div className={`space-y-2.5 flex-1 overflow-y-auto ${alturaMaximaLista}`}>
        {comentarios.length === 0 ? (
          <p className="text-xs text-gray-400">
            Aún no hay comentarios cargados en este proyecto.
          </p>
        ) : (
          comentarios.map((c) => (
            <div
              key={c.id}
              className="bg-[#181818] border border-white/10 rounded-xl p-3.5 text-xs flex justify-between items-start gap-3"
            >
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#EAB308]">{c.autor}</span>
                  <span className="text-[10px] text-gray-500">· {c.fecha}</span>
                </div>
                <p className="text-gray-200 leading-relaxed whitespace-pre-wrap break-words">
                  {c.texto}
                </p>
              </div>
              <button
                type="button"
                onClick={() => eliminarComentario(c.id)}
                title="Eliminar comentario"
                className="text-gray-500 hover:text-rose-400 p-1 rounded-lg hover:bg-rose-950/50 transition-colors cursor-pointer flex-shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen text-white p-8 font-sans">
      {/* BARRA SUPERIOR */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <Link
          href="/proyectos"
          className="bg-[#242424] hover:bg-white/10 border border-white/10 text-gray-200 px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Volver a Proyectos
        </Link>

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs text-gray-300">Estado:</span>
          <select
            value={estadoProyecto}
            onChange={(e) => cambiarEstadoProyecto(e.target.value)}
            className="bg-[#242424] border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-white cursor-pointer"
          >
            <option value="En Diseño">En Diseño</option>
            <option value="En Obra">En Obra</option>
            <option value="En Pausa">En Pausa</option>
            <option value="Finalizado">Finalizado</option>
          </select>

          <button
            type="button"
            onClick={() => window.print()}
            className="bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-600/30 px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" /> Reporte para el cliente
          </button>

          <label className="bg-[#242424] hover:bg-white/10 border border-white/10 text-gray-200 px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">
            <ImageIcon className="w-3.5 h-3.5 text-[#EAB308]" /> Portada
            <input type="file" accept="image/*" onChange={manejarCambioPortada} className="hidden" />
          </label>

          <button
            type="button"
            onClick={() => setModalEditarProy(true)}
            className="bg-[#242424] hover:bg-white/10 border border-white/10 text-gray-200 px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#EAB308]" /> Editar proyecto
          </button>

          <button
            type="button"
            onClick={() => setConfirmarPapelera(true)}
            className="bg-rose-950/75 hover:bg-rose-900/80 border border-rose-800/60 text-rose-400 px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Papelera
          </button>
        </div>
      </div>

      {/* BANNER PRINCIPAL */}
      <div className="bg-[#242424] border border-white/10 rounded-2xl overflow-hidden shadow-2xl mb-6">
        <div
          className="h-44 bg-cover bg-center relative"
          style={{
            backgroundImage: proyecto.portada_url
              ? `url(${proyecto.portada_url})`
              : 'linear-gradient(135deg, #27272a 0%, #18181b 100%)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[#1E1E1E] via-[#1E1E1E]/40 to-transparent" />
          <label className="absolute top-3 right-3 bg-black/75 hover:bg-black border border-gray-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">
            <ImageIcon className="w-3.5 h-3.5 text-[#EAB308]" /> Cambiar portada
            <input type="file" accept="image/*" onChange={manejarCambioPortada} className="hidden" />
          </label>
        </div>

        <div className="px-6 pb-6 -mt-8 relative z-10">
          <div className="flex flex-wrap justify-between items-end gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="bg-[#EAB308]/15 border border-[#EAB308]/40 text-[#EAB308] px-2.5 py-0.5 rounded-md text-xs font-extrabold">
                  {proyecto.codigo}
                </span>
                {proyecto.tipologia && (
                  <span className="text-xs font-semibold text-gray-300">{proyecto.tipologia}</span>
                )}
                {proyecto.responsable && (
                  <span className="bg-[#181818] border border-white/10 text-gray-300 px-2.5 py-0.5 rounded-md text-xs">
                    Responsable: <strong>{proyecto.responsable}</strong>
                  </span>
                )}
                <span className="bg-cyan-950/70 border border-cyan-700/50 text-cyan-300 px-2.5 py-0.5 rounded-md text-xs font-semibold">
                  {estadoProyecto}
                </span>
              </div>

              <h1 className="text-3xl font-extrabold text-white tracking-tight">{proyecto.nombre}</h1>

              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-300 mt-2">
                <span className="inline-flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#EAB308]" />
                  Cliente:{' '}
                  <strong className="text-white">{clienteAsociado?.nombre || 'Sin cliente'}</strong>
                </span>

                {proyecto.ubicacion && (
                  <a
                    href={
                      /^https?:\/\//i.test(proyecto.ubicacion)
                        ? proyecto.ubicacion
                        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            proyecto.ubicacion
                          )}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-gray-300 hover:text-[#EAB308] hover:underline"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#EAB308]" /> {proyecto.ubicacion}
                  </a>
                )}
              </div>
            </div>

            {proyecto.drive_url && (
              <a
                href={proyecto.drive_url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/40 text-blue-400 px-4 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-colors"
              >
                Abrir Carpeta Drive <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-white/10">
            {[
              { id: 'resumen', label: 'Resumen General' },
              { id: 'tareas', label: `Tareas (${tareas.length})` },
              { id: 'visitas', label: `Visitas y Bitácora (${visitas.length})` },
              { id: 'documentos', label: `Documentos (${documentos.length})` },
              { id: 'compras', label: `Compras (${compras.length})` },
              { id: 'finanzas', label: `Finanzas (${movimientos.length})` },
              { id: 'comentarios', label: `Comentarios (${comentarios.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setPestanaActiva(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  pestanaActiva === tab.id
                    ? 'bg-[#EAB308] text-black shadow-[0_0_15px_rgba(234,179,8,0.25)]'
                    : 'bg-[#181818] text-gray-300 hover:text-white border border-white/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* PESTAÑA: RESUMEN GENERAL */}
      {pestanaActiva === 'resumen' && (
        <div className="space-y-6">
          {/* 1. ETAPA Y AVANCE */}
          <div className="bg-[#242424] border border-white/10 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-wrap justify-between items-start gap-4 mb-5">
              <div>
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-300">
                  ETAPA Y AVANCE DEL PROYECTO
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Tocá cualquier etapa para actualizar en qué fase se encuentra el proyecto
                </p>
              </div>
              <span className="bg-[#EAB308]/15 border border-[#EAB308]/40 text-[#EAB308] px-3.5 py-1.5 rounded-full text-xs font-bold">
                Etapa actual: {etapaActual}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              {ETAPAS_PROYECTO.map((etapa, idx) => {
                const esActual = etapaActual === etapa;
                return (
                  <button
                    key={etapa}
                    type="button"
                    onClick={() => seleccionarEtapa(etapa)}
                    className={`text-left p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between min-h-[96px] ${
                      esActual
                        ? 'bg-[#EAB308]/10 border-[#EAB308] shadow-[0_0_18px_rgba(234,179,8,0.18)]'
                        : 'bg-[#181818] border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-3">
                      <span
                        className={`w-6 h-6 rounded-full text-xs font-extrabold flex items-center justify-center ${
                          esActual ? 'bg-[#EAB308] text-black' : 'bg-gray-800 text-gray-300'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      {esActual && (
                        <span className="text-[10px] font-extrabold tracking-wider text-[#EAB308]">
                          ACTUAL
                        </span>
                      )}
                    </div>
                    <div
                      className={`text-xs font-bold leading-snug ${
                        esActual ? 'text-white' : 'text-gray-300'
                      }`}
                    >
                      {etapa}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. DATOS PRINCIPALES + ESTADO ECONÓMICO Y VISITAS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-[#242424] border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-300">
                    DATOS PRINCIPALES DEL PROYECTO
                  </h2>
                  <button
                    type="button"
                    onClick={() => setModalEditarProy(true)}
                    className="text-xs font-bold text-[#EAB308] hover:underline cursor-pointer"
                  >
                    Editar datos →
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <div className="bg-[#181818] border border-white/10 rounded-xl p-3.5">
                    <div className="text-[11px] text-gray-400">Cliente</div>
                    <div className="text-xs font-bold text-white mt-1">
                      {clienteAsociado?.nombre || 'Sin cliente'}
                    </div>
                  </div>
                  <div className="bg-[#181818] border border-white/10 rounded-xl p-3.5">
                    <div className="text-[11px] text-gray-400">Tipología</div>
                    <div className="text-xs font-bold text-white mt-1">
                      {proyecto.tipologia || '—'}
                    </div>
                  </div>
                  <div className="bg-[#181818] border border-white/10 rounded-xl p-3.5">
                    <div className="text-[11px] text-gray-400">Responsable</div>
                    <div className="text-xs font-bold text-white mt-1">
                      {proyecto.responsable || 'Sin asignar'}
                    </div>
                  </div>
                  <div className="bg-[#181818] border border-white/10 rounded-xl p-3.5">
                    <div className="text-[11px] text-gray-400">Superficie</div>
                    <div className="text-xs font-bold text-white mt-1">
                      {proyecto.superficie || '—'}
                    </div>
                  </div>
                  <div className="bg-[#181818] border border-white/10 rounded-xl p-3.5">
                    <div className="text-[11px] text-gray-400">Inicio / Entrega</div>
                    <div className="text-xs font-bold text-white mt-1">
                      {formatearFechaCorta(proyecto.fecha_inicio)} →{' '}
                      {formatearFechaCorta(proyecto.fecha_entrega)}
                    </div>
                  </div>
                  <div className="bg-[#181818] border border-white/10 rounded-xl p-3.5">
                    <div className="text-[11px] text-gray-400">Próxima Visita</div>
                    <div className="text-xs font-bold text-[#EAB308] mt-1">
                      {proximaVisita ? formatearFechaCorta(proximaVisita.fecha) : 'Sin agendar'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#181818] border border-white/10 rounded-xl p-4">
                <div className="text-[11px] text-gray-400 mb-1">
                  Descripción y Notas del Proyecto:
                </div>
                <div className="text-xs text-gray-200">
                  {proyecto.descripcion || 'Sin notas adicionales cargadas en la ficha.'}
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 bg-[#242424] border border-white/10 rounded-2xl p-6 shadow-xl space-y-5">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-300">
                    ESTADO ECONÓMICO (USD)
                  </h2>
                  <button
                    type="button"
                    onClick={() => setPestanaActiva('finanzas')}
                    className="text-xs font-bold text-[#EAB308] hover:underline cursor-pointer"
                  >
                    Ver Finanzas →
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#181818] border border-white/10 rounded-xl p-3.5">
                    <div className="text-[11px] text-gray-400">Presupuesto / Honorarios</div>
                    <div className="text-base font-extrabold text-white mt-1">
                      USD $
                      {presupuestoUsd.toLocaleString('es-AR', {
                        minimumFractionDigits: presupuestoUsd % 1 === 0 ? 0 : 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                  <div className="bg-[#181818] border border-white/10 rounded-xl p-3.5">
                    <div className="text-[11px] text-gray-400">Cobrado</div>
                    <div className="text-base font-extrabold text-emerald-400 mt-1">
                      USD $
                      {ingresosCobradosUsd.toLocaleString('es-AR', {
                        minimumFractionDigits: ingresosCobradosUsd % 1 === 0 ? 0 : 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                  <div className="bg-[#181818] border border-white/10 rounded-xl p-3.5">
                    <div className="text-[11px] text-gray-400">Saldo por cobrar</div>
                    <div className="text-base font-extrabold text-[#EAB308] mt-1">
                      USD $
                      {pendienteCobroUsd.toLocaleString('es-AR', {
                        minimumFractionDigits: pendienteCobroUsd % 1 === 0 ? 0 : 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                  <div className="bg-[#181818] border border-white/10 rounded-xl p-3.5">
                    <div className="text-[11px] text-gray-400">Gastos / Compras</div>
                    <div className="text-base font-extrabold text-rose-500 mt-1">
                      USD $
                      {egresosProyectoUsd.toLocaleString('es-AR', {
                        minimumFractionDigits: egresosProyectoUsd % 1 === 0 ? 0 : 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#EAB308]" />
                    Visitas y Reuniones ({visitas.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setVisitaEditando(null);
                      setModalVisita(true);
                    }}
                    className="text-xs font-bold text-[#EAB308] hover:underline cursor-pointer"
                  >
                    + Agendar visita
                  </button>
                </div>

                {visitas.length === 0 ? (
                  <p className="text-xs text-gray-400">No hay visitas agendadas para este proyecto.</p>
                ) : (
                  <div className="space-y-2">
                    {visitas.slice(0, 3).map((v) => (
                      <div
                        key={v.id}
                        onClick={() => {
                          setVisitaEditando(v);
                          setModalVisita(true);
                        }}
                        className="bg-[#181818] border border-white/10 hover:border-white/25 rounded-xl px-4 py-3 flex justify-between items-center cursor-pointer transition-colors"
                      >
                        <div>
                          <div className="text-xs font-bold text-white">
                            {v.titulo || v.motivo || 'Visita'}
                          </div>
                          <div className="text-[11px] text-gray-400 mt-0.5">
                            {formatearFechaCorta(v.fecha)}{' '}
                            {v.horario || v.hora ? `· ${v.horario || v.hora} hs` : ''}
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-emerald-950/70 border border-emerald-700/50 text-emerald-400 text-[11px] font-semibold">
                          {v.estado || 'Programada'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. TAREAS + DOCUMENTACIÓN Y ENTREGAS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-[#242424] border border-white/10 rounded-2xl p-6 shadow-xl">
              <div className="mb-4">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-[#EAB308]" />
                  Estado de Tareas y Responsables ({tareas.length})
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Quién está a cargo de cada entrega y qué tareas están en curso, atrasadas o completadas
                </p>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setTareaEditando(null);
                    setModalTarea(true);
                  }}
                  className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-4 py-2 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Nueva tarea
                </button>
                <button
                  type="button"
                  onClick={() => setPestanaActiva('tareas')}
                  className="text-xs font-bold text-[#EAB308] hover:underline cursor-pointer"
                >
                  Ver todas →
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
                <button
                  type="button"
                  onClick={() =>
                    setFiltroTareaResumen(
                      filtroTareaResumen === 'atrasadas' ? 'todas' : 'atrasadas'
                    )
                  }
                  className={`bg-[#181818] border rounded-xl px-3.5 py-2.5 flex justify-between items-center text-xs font-bold cursor-pointer ${
                    filtroTareaResumen === 'atrasadas' ? 'border-rose-500' : 'border-white/10'
                  }`}
                >
                  <span className="text-rose-400">Atrasadas</span>
                  <span className="text-rose-400">{statsTareas.atrasadas}</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFiltroTareaResumen(
                      filtroTareaResumen === 'por_realizar' ? 'todas' : 'por_realizar'
                    )
                  }
                  className={`bg-[#181818] border rounded-xl px-3.5 py-2.5 flex justify-between items-center text-xs font-bold cursor-pointer ${
                    filtroTareaResumen === 'por_realizar' ? 'border-[#EAB308]' : 'border-white/10'
                  }`}
                >
                  <span className="text-[#EAB308]">Por realizar</span>
                  <span className="text-[#EAB308]">{statsTareas.porRealizar}</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFiltroTareaResumen(
                      filtroTareaResumen === 'en_curso' ? 'todas' : 'en_curso'
                    )
                  }
                  className={`bg-[#181818] border rounded-xl px-3.5 py-2.5 flex justify-between items-center text-xs font-bold cursor-pointer ${
                    filtroTareaResumen === 'en_curso' ? 'border-cyan-400' : 'border-white/10'
                  }`}
                >
                  <span className="text-cyan-400">En curso</span>
                  <span className="text-cyan-400">{statsTareas.enCurso}</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFiltroTareaResumen(
                      filtroTareaResumen === 'completadas' ? 'todas' : 'completadas'
                    )
                  }
                  className={`bg-[#181818] border rounded-xl px-3.5 py-2.5 flex justify-between items-center text-xs font-bold cursor-pointer ${
                    filtroTareaResumen === 'completadas' ? 'border-emerald-400' : 'border-white/10'
                  }`}
                >
                  <span className="text-emerald-400">Completadas</span>
                  <span className="text-emerald-400">{statsTareas.completadas}</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {tareasFiltradasResumen.length === 0 ? (
                  <p className="text-xs text-gray-400 py-4 text-center">
                    No hay tareas en esta categoría.
                  </p>
                ) : (
                  tareasFiltradasResumen.slice(0, 5).map((t) => {
                    const completada =
                      t.estado === 'Finalizado' || t.estado === 'Completada';
                    const hoyIso = new Date().toISOString().split('T')[0];
                    const atrasada =
                      !completada && t.fecha_vencimiento && t.fecha_vencimiento < hoyIso;

                    return (
                      <div
                        key={t.id}
                        onClick={() => {
                          setTareaEditando(t);
                          setModalTarea(true);
                        }}
                        className="bg-[#181818] border border-white/10 hover:border-white/25 rounded-xl p-3.5 flex flex-wrap justify-between items-center gap-3 cursor-pointer transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCompletarTarea(t);
                            }}
                            className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center cursor-pointer ${
                              completada
                                ? 'bg-emerald-500 border-emerald-500 text-black'
                                : 'border-gray-500 hover:border-[#EAB308]'
                            }`}
                          >
                            {completada && <Check className="w-3 h-3 stroke-[3]" />}
                          </button>

                          <div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`text-xs font-bold ${
                                  completada ? 'line-through text-gray-400' : 'text-white'
                                }`}
                              >
                                {t.titulo}
                              </span>
                              {t.rubro && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-950/70 border border-purple-700/50 text-purple-300 text-[10px] font-bold">
                                  <Tag className="w-2.5 h-2.5" /> {t.rubro}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] mt-0.5 flex flex-wrap items-center gap-1.5">
                              <span className="text-[#EAB308] font-semibold">
                                Responsable: {t.responsable || 'Sin asignar'}
                              </span>
                              <span>·</span>
                              <span className={atrasada ? 'text-rose-400 font-semibold' : 'text-gray-400'}>
                                Vence:{' '}
                                {t.fecha_vencimiento
                                  ? formatearFechaCorta(t.fecha_vencimiento)
                                  : 'Sin fecha'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-[10px] font-bold">
                          {atrasada && (
                            <span className="px-2 py-0.5 rounded bg-rose-950/80 border border-rose-800/60 text-rose-400">
                              Atrasada
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded border ${
                              t.prioridad === 'Alta'
                                ? 'bg-amber-950/80 border-amber-700/60 text-[#EAB308]'
                                : 'bg-cyan-950/70 border-cyan-800/60 text-cyan-300'
                            }`}
                          >
                            {t.prioridad || 'Media'}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded border ${
                              completada
                                ? 'bg-emerald-950/70 border-emerald-700/50 text-emerald-400'
                                : 'bg-blue-950/70 border-blue-800/60 text-blue-300'
                            }`}
                          >
                            {t.estado || 'Por realizar'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* DOCUMENTACIÓN Y ENTREGAS CONECTADA */}
            <div className="lg:col-span-5 bg-[#242424] border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start gap-3 mb-4">
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#EAB308]" />
                      Documentación y Entregas ({documentos.length})
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Qué planos o propuestas están listos y cuáles faltan terminar
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setDocEditando(null);
                      setModalDocumento(true);
                    }}
                    className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-3.5 py-2 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer flex-shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Subir
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-[#181818] border border-white/10 rounded-xl p-4">
                    <div className="text-xs font-bold text-emerald-400">Listos / Aprobados</div>
                    <div className="text-2xl font-extrabold text-emerald-400 mt-1">{docsListos}</div>
                    <div className="text-[11px] text-gray-400 mt-1">Entregados o visados</div>
                  </div>
                  <div className="bg-[#181818] border border-white/10 rounded-xl p-4">
                    <div className="text-xs font-bold text-[#EAB308]">En Desarrollo / Faltan</div>
                    <div className="text-2xl font-extrabold text-[#EAB308] mt-1">
                      {docsEnDesarrollo}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1">Borradores o pendientes</div>
                  </div>
                </div>

                {documentos.length === 0 ? (
                  <div className="bg-[#181818] border border-white/10 rounded-xl p-6 text-center text-xs text-gray-400">
                    Aún no hay planos, moodboards ni documentos cargados en este proyecto.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documentos.slice(0, 3).map((d) => (
                      <div
                        key={d.id}
                        onClick={() => {
                          setDocEditando(d);
                          setModalDocumento(true);
                        }}
                        className="bg-[#181818] border border-white/10 hover:border-white/25 rounded-xl px-3.5 py-2.5 flex justify-between items-center gap-2 cursor-pointer"
                      >
                        <div className="truncate">
                          <div className="text-xs font-bold text-white truncate">
                            {d.codigo_lamina ? `${d.codigo_lamina} · ` : ''}
                            {d.titulo}
                          </div>
                          <div className="text-[11px] text-gray-400">{d.categoria}</div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-800 text-gray-200 flex-shrink-0">
                          {d.revision || 'Rev. 01'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setPestanaActiva('documentos')}
                  className="text-xs font-bold text-[#EAB308] hover:underline cursor-pointer"
                >
                  Abrir todos los documentos y carpeta Drive →
                </button>
              </div>
            </div>
          </div>

          {/* 4. EQUIPO + COMENTARIOS (EN RESUMEN GENERAL) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 bg-[#242424] border border-white/10 rounded-2xl p-6 shadow-xl">
              <div className="flex justify-between items-start gap-3 mb-4">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#EAB308]" />
                    Equipo y Responsables
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Profesionales que participan en este proyecto
                  </p>
                </div>

                <Link
                  href="/equipo"
                  className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-3.5 py-2 rounded-xl font-bold text-xs inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Sumar / Invitar
                </Link>
              </div>

              <div className="space-y-2.5">
                {equipo.map((miembro) => {
                  const asignado = equipoAsignado.includes(miembro.nombre);
                  const esResponsablePrincipal = proyecto.responsable === miembro.nombre;
                  const iniciales = miembro.nombre
                    .replace(/^Arq\.\s*/i, '')
                    .split(' ')
                    .map((p: string) => p[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <div
                      key={miembro.id}
                      className={`rounded-xl p-3.5 border flex items-center justify-between gap-3 transition-colors ${
                        asignado
                          ? 'bg-[#EAB308]/5 border-[#EAB308]/50'
                          : 'bg-[#181818] border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gray-800 text-[#EAB308] font-extrabold text-xs flex items-center justify-center flex-shrink-0">
                          {iniciales}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{miembro.nombre}</span>
                            {esResponsablePrincipal && (
                              <span className="bg-[#EAB308] text-black px-2 py-0.5 rounded text-[10px] font-extrabold">
                                Responsable
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-400 mt-0.5">{miembro.rol}</div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleIntegranteEquipo(miembro.nombre)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer transition-colors ${
                          asignado
                            ? 'bg-emerald-950/70 border-emerald-700/60 text-emerald-400'
                            : 'bg-[#242424] border-white/15 text-gray-200 hover:border-white/30'
                        }`}
                      >
                        {asignado ? '✓ Asignado' : '+ Asignar'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-6">{renderTarjetaComentarios('max-h-60')}</div>
          </div>
        </div>
      )}

      {/* PESTAÑA: COMENTARIOS Y MENCIONES (@NOMBRE) */}
      {pestanaActiva === 'comentarios' && renderTarjetaComentarios('max-h-[520px]')}

      {/* PESTAÑA: FINANZAS */}
      {pestanaActiva === 'finanzas' && (
        <>
          <div className="bg-[#242424] border border-white/10 rounded-2xl p-6 shadow-xl mb-6">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <CircleDollarSign className="w-4 h-4 text-[#EAB308]" />
                  Balance Financiero del Proyecto (USD)
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Comparativa de honorarios pactados, cobrados, pendientes y gastos/compras del proyecto
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMovEditando(null);
                  setModalMovimiento(true);
                }}
                className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-4 py-2 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Nuevo movimiento
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#181818] border border-white/10 rounded-xl p-4">
                  <div className="text-xs text-gray-400">Presupuesto / Honorarios</div>
                  <div className="text-2xl font-extrabold text-white mt-1">
                    USD ${presupuestoUsd.toLocaleString('es-AR')}
                  </div>
                </div>
                <div className="bg-[#181818] border border-white/10 rounded-xl p-4">
                  <div className="text-xs text-gray-400">Ingresos Cobrados</div>
                  <div className="text-2xl font-extrabold text-emerald-400 mt-1">
                    USD $
                    {ingresosCobradosUsd.toLocaleString('es-AR', {
                      minimumFractionDigits: ingresosCobradosUsd % 1 === 0 ? 0 : 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
                <div className="bg-[#181818] border border-white/10 rounded-xl p-4">
                  <div className="text-xs text-gray-400">Pendiente de Cobro</div>
                  <div className="text-2xl font-extrabold text-[#EAB308] mt-1">
                    USD $
                    {pendienteCobroUsd.toLocaleString('es-AR', {
                      minimumFractionDigits: pendienteCobroUsd % 1 === 0 ? 0 : 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
                <div className="bg-[#181818] border border-white/10 rounded-xl p-4">
                  <div className="text-xs text-gray-400">Resultado Neto</div>
                  <div className="text-2xl font-extrabold text-emerald-400 mt-1">
                    USD $
                    {resultadoNetoUsd.toLocaleString('es-AR', {
                      minimumFractionDigits: resultadoNetoUsd % 1 === 0 ? 0 : 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
              </div>

              <div className="bg-[#181818] border border-white/10 rounded-xl p-5 flex flex-col justify-center space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-gray-300">Presupuesto / Honorarios</span>
                    <span>USD ${presupuestoUsd.toLocaleString('es-AR')}</span>
                  </div>
                  <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-400 w-full rounded-full" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-gray-300">Ingresos Cobrados</span>
                    <span className="text-emerald-400">
                      USD $
                      {ingresosCobradosUsd.toLocaleString('es-AR', {
                        minimumFractionDigits: ingresosCobradosUsd % 1 === 0 ? 0 : 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full transition-all"
                      style={{ width: `${porcentajeCobrado}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-gray-300">Pendiente de Cobro</span>
                    <span className="text-[#EAB308]">
                      USD $
                      {pendienteCobroUsd.toLocaleString('es-AR', {
                        minimumFractionDigits: pendienteCobroUsd % 1 === 0 ? 0 : 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#EAB308] rounded-full transition-all"
                      style={{ width: `${100 - porcentajeCobrado}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-gray-300">Gastos Directos y Compras</span>
                    <span className="text-rose-400">
                      USD $
                      {egresosProyectoUsd.toLocaleString('es-AR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full transition-all"
                      style={{
                        width: `${
                          presupuestoUsd > 0
                            ? Math.min(100, Math.round((egresosProyectoUsd / presupuestoUsd) * 100))
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#242424] border border-white/10 rounded-2xl p-6 shadow-xl mb-6">
            <h3 className="text-sm font-bold text-white mb-4">
              Historial de Movimientos del Proyecto ({movimientos.length})
            </h3>
            {movimientos.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">
                No hay movimientos financieros vinculados a este proyecto todavía.
              </p>
            ) : (
              <div className="space-y-3">
                {movimientos.map((m) => {
                  const esEg = esEgresoMov(m);
                  const mon = String(m.moneda || 'USD').toUpperCase();
                  const impOriginal = Number(m.importe ?? 0) || Number(m.monto ?? 0);
                  const equivUsd = obtenerUsdEquivalente(m);
                  const abonado = esAbonadoMov(m.estado);

                  return (
                    <div
                      key={m.id}
                      onClick={() => {
                        setMovEditando(m);
                        setModalMovimiento(true);
                      }}
                      className="bg-[#181818] border border-white/10 hover:border-white/25 rounded-xl p-4 flex flex-wrap justify-between items-center gap-4 transition-colors cursor-pointer"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-white">{m.concepto}</span>
                          {m.tipo_comprobante && (
                            <span className="bg-blue-950/80 border border-blue-800/60 text-blue-400 px-2 py-0.5 rounded text-[10px] font-bold">
                              {m.tipo_comprobante}
                            </span>
                          )}
                          {m.archivo_url && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                abrirArchivoAdjunto(m.archivo_url);
                              }}
                              className="bg-amber-950/70 border border-amber-700/60 text-[#EAB308] hover:bg-amber-900/50 px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <FileText className="w-3 h-3" /> PDF
                            </button>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 flex flex-wrap items-center gap-1.5">
                          <span>{m.categoria || 'Movimiento'}</span>
                          <span>·</span>
                          <span>{formatearFechaCorta(m.fecha)}</span>
                          {m.comprobante && (
                            <>
                              <span>·</span>
                              <span>{m.comprobante}</span>
                            </>
                          )}
                          {mon === 'ARS' && Number(m.valor_usd || 0) > 0 && (
                            <>
                              <span>·</span>
                              <span className="text-[#EAB308] font-semibold">
                                Cotiz. USD ${Number(m.valor_usd).toLocaleString('es-AR')}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <select
                          value={m.estado || (abonado ? 'Abonado' : 'Resta abonar')}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => cambiarEstadoMovimientoRapido(m.id, e.target.value)}
                          className={`px-3 py-1 rounded-full text-xs font-bold border cursor-pointer ${
                            abonado
                              ? 'bg-emerald-950/70 border-emerald-700/50 text-emerald-400'
                              : 'bg-rose-950/70 border-rose-800/60 text-rose-400'
                          }`}
                        >
                          <option value="Abonado">Abonado</option>
                          <option value="Resta abonar">Resta abonar</option>
                        </select>

                        <div className="text-right">
                          <div
                            className={`text-sm font-extrabold ${
                              esEg ? 'text-rose-400' : 'text-emerald-400'
                            }`}
                          >
                            {esEg ? '-' : '+'}
                            {mon} $
                            {impOriginal.toLocaleString('es-AR', {
                              minimumFractionDigits: impOriginal % 1 === 0 ? 0 : 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                          {mon === 'ARS' && equivUsd > 0 && (
                            <div className="text-[11px] font-semibold text-[#EAB308]">
                              ≈ USD $
                              {equivUsd.toLocaleString('es-AR', {
                                minimumFractionDigits: equivUsd % 1 === 0 ? 0 : 2,
                                maximumFractionDigits: 2,
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* PESTAÑA: COMPRAS */}
      {pestanaActiva === 'compras' && (
        <div className="bg-[#242424] border border-white/10 rounded-2xl p-6 shadow-xl mb-6">
          <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-[#EAB308]" />
                Compras y Facturas del Proyecto ({compras.length})
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Pedidos vinculados a {proyecto.codigo} · {proyecto.nombre}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setCompraEditando(null);
                setModalCompra(true);
              }}
              className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-4 py-2 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Nueva compra / factura
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  <th className="py-3 px-3">FECHA / FACTURA</th>
                  <th className="py-3 px-3">PROVEEDOR / CONCEPTO</th>
                  <th className="py-3 px-3">IMPORTE ORIGINAL</th>
                  <th className="py-3 px-3">EQUIV. USD</th>
                  <th className="py-3 px-3">ESTADO</th>
                  <th className="py-3 px-3 text-right">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-sm">
                {compras.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400 text-xs">
                      Aún no hay compras cargadas en este proyecto.
                    </td>
                  </tr>
                ) : (
                  compras.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => {
                        setCompraEditando(c);
                        setModalCompra(true);
                      }}
                      className="hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-3 text-xs">
                        <div className="font-semibold text-white">{c.fecha || '—'}</div>
                        <div className="text-[11px] text-gray-400">{c.nro_orden || '—'}</div>
                      </td>
                      <td className="py-3 px-3 text-xs">
                        <div className="font-bold text-white">{c.proveedor}</div>
                        <div className="text-gray-400">{c.concepto}</div>
                      </td>
                      <td className="py-3 px-3 text-xs font-bold text-white">
                        {c.moneda === 'USD' ? 'USD $' : '$ '}
                        {Number(c.importe || 0).toLocaleString('es-AR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-3 px-3 text-xs font-extrabold text-[#EAB308]">
                        USD $
                        {Number(
                          c.moneda === 'USD' ? c.importe || 0 : c.importe_usd || 0
                        ).toLocaleString('es-AR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-3 px-3 text-xs">
                        <span className="px-2.5 py-0.5 rounded-full bg-gray-800 text-gray-200 font-semibold text-[11px]">
                          {c.estado}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-xs">
                        {c.archivo_url && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              abrirArchivoAdjunto(c.archivo_url);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-blue-500/15 border border-blue-500/40 text-blue-400 hover:bg-blue-500/25 font-semibold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" /> Ver
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PESTAÑA: TAREAS */}
      {pestanaActiva === 'tareas' && (
        <div className="bg-[#242424] border border-white/10 rounded-2xl p-6 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-[#EAB308]" /> Tareas vinculadas ({tareas.length})
            </h2>
            <button
              type="button"
              onClick={() => {
                setTareaEditando(null);
                setModalTarea(true);
              }}
              className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-4 py-2 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Nueva tarea
            </button>
          </div>
          {tareas.length === 0 ? (
            <p className="text-xs text-gray-400">No hay tareas registradas para este proyecto.</p>
          ) : (
            <div className="space-y-2.5">
              {tareas.map((t) => {
                const completada = t.estado === 'Finalizado' || t.estado === 'Completada';
                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      setTareaEditando(t);
                      setModalTarea(true);
                    }}
                    className="bg-[#181818] border border-white/10 hover:border-white/25 rounded-xl p-3.5 flex flex-wrap justify-between items-center gap-3 text-xs cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCompletarTarea(t);
                        }}
                        className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center cursor-pointer ${
                          completada
                            ? 'bg-emerald-500 border-emerald-500 text-black'
                            : 'border-gray-500 hover:border-[#EAB308]'
                        }`}
                      >
                        {completada && <Check className="w-3 h-3 stroke-[3]" />}
                      </button>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`font-bold ${
                              completada ? 'line-through text-gray-400' : 'text-white'
                            }`}
                          >
                            {t.titulo}
                          </span>
                          {t.rubro && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-950/70 border border-purple-700/50 text-purple-300 text-[10px] font-bold">
                              <Tag className="w-2.5 h-2.5" /> {t.rubro}
                            </span>
                          )}
                        </div>
                        <div className="text-gray-400 mt-0.5">
                          {t.responsable || 'Sin asignar'} · Vence:{' '}
                          {t.fecha_vencimiento ? formatearFechaCorta(t.fecha_vencimiento) : 'Sin fecha'}
                        </div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-gray-800 text-gray-200 font-semibold">
                      {t.estado}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA: VISITAS */}
      {pestanaActiva === 'visitas' && (
        <div className="bg-[#242424] border border-white/10 rounded-2xl p-6 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#EAB308]" /> Visitas y Bitácora ({visitas.length})
            </h2>
            <button
              type="button"
              onClick={() => {
                setVisitaEditando(null);
                setModalVisita(true);
              }}
              className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-4 py-2 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Agendar visita
            </button>
          </div>
          {visitas.length === 0 ? (
            <p className="text-xs text-gray-400">No hay visitas registradas para este proyecto.</p>
          ) : (
            <div className="space-y-2">
              {visitas.map((v) => (
                <div
                  key={v.id}
                  onClick={() => {
                    setVisitaEditando(v);
                    setModalVisita(true);
                  }}
                  className="bg-[#181818] border border-white/10 hover:border-white/25 rounded-xl p-3.5 flex justify-between items-center text-xs cursor-pointer transition-colors"
                >
                  <div>
                    <div className="font-bold text-white">{v.titulo || v.motivo}</div>
                    <div className="text-gray-400 mt-0.5">
                      {formatearFechaCorta(v.fecha)}{' '}
                      {v.horario || v.hora ? `· ${v.horario || v.hora} hs` : ''}
                      {v.responsable ? ` · ${v.responsable}` : ''}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-gray-800 text-gray-200 font-semibold">
                    {v.estado || 'Programada'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA: DOCUMENTOS DEL PROYECTO */}
      {pestanaActiva === 'documentos' && (
        <div className="bg-[#242424] border border-white/10 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-[#EAB308]" />
                Documentos y Planos ({documentos.length})
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Láminas, moodboards, renders y enlaces Drive vinculados a {proyecto.nombre}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setDocEditando(null);
                setModalDocumento(true);
              }}
              className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-4 py-2 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Nuevo documento
            </button>
          </div>

          {documentos.length === 0 ? (
            <div className="text-center py-10 text-xs text-gray-400">
              Aún no hay documentos cargados en este proyecto. Tocá &quot;+ Nuevo documento&quot; para
              subir el primero.
            </div>
          ) : (
            <div className="space-y-2.5">
              {documentos.map((d) => {
                const esListo =
                  d.estado === 'Listo / Aprobado' || d.estado === 'Entregado / Visado';
                return (
                  <div
                    key={d.id}
                    onClick={() => {
                      setDocEditando(d);
                      setModalDocumento(true);
                    }}
                    className="bg-[#181818] border border-white/10 hover:border-white/25 rounded-xl p-4 flex flex-wrap justify-between items-center gap-3 cursor-pointer transition-colors"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        {d.codigo_lamina && (
                          <span className="bg-[#EAB308]/15 border border-[#EAB308]/40 text-[#EAB308] px-2 py-0.5 rounded text-[10px] font-extrabold">
                            {d.codigo_lamina}
                          </span>
                        )}
                        <span className="text-sm font-bold text-white">{d.titulo}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1 flex flex-wrap items-center gap-2">
                        <span>{d.categoria}</span>
                        <span>·</span>
                        <span>{d.formato || 'PDF'}</span>
                        {d.escala && (
                          <>
                            <span>·</span>
                            <span>Esc. {d.escala}</span>
                          </>
                        )}
                        <span>·</span>
                        <span>{d.revision || 'Rev. 01'}</span>
                        <span>·</span>
                        <span>{formatearFechaCorta(d.fecha_emision)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold ${
                          esListo
                            ? 'bg-emerald-950/70 border-emerald-700/50 text-emerald-400'
                            : 'bg-amber-950/70 border-amber-700/50 text-[#EAB308]'
                        }`}
                      >
                        {d.estado}
                      </span>

                      {d.archivo_url && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            abrirArchivoAdjunto(d.archivo_url);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-blue-500/15 border border-blue-500/40 text-blue-400 hover:bg-blue-500/25 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" /> Ver
                        </button>
                      )}

                      {d.enlace_externo && (
                        <a
                          href={d.enlace_externo}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="px-2.5 py-1 rounded-lg bg-gray-800 text-gray-200 hover:text-white text-xs font-semibold inline-flex items-center gap-1"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Drive
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL EDITAR DATOS DEL PROYECTO */}
      {modalEditarProy &&
        montado &&
        createPortal(
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4">
            <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800 w-full max-w-2xl shadow-2xl p-6 space-y-4 max-h-[92vh] overflow-y-auto">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-white">Editar Datos del Proyecto</h3>
                <button
                  onClick={() => setModalEditarProy(false)}
                  className="text-gray-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={guardarEdicionProyecto} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Nombre *</label>
                    <input
                      type="text"
                      required
                      value={editNombre}
                      onChange={(e) => setEditNombre(e.target.value)}
                      className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Tipología</label>
                    <input
                      type="text"
                      value={editTipologia}
                      onChange={(e) => setEditTipologia(e.target.value)}
                      className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Cliente</label>
                    <select
                      value={editClienteId}
                      onChange={(e) => setEditClienteId(e.target.value)}
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
                      Responsable
                    </label>
                    <select
                      value={editResponsable}
                      onChange={(e) => setEditResponsable(e.target.value)}
                      className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white"
                    >
                      <option value="">Sin asignar</option>
                      {equipo.map((m) => (
                        <option key={m.id} value={m.nombre}>
                          {m.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Superficie</label>
                    <input
                      type="text"
                      value={editSuperficie}
                      onChange={(e) => setEditSuperficie(e.target.value)}
                      placeholder="Ej. 450 m²"
                      className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Presupuesto USD
                    </label>
                    <input
                      type="text"
                      value={editPresupuesto}
                      onChange={(e) => setEditPresupuesto(e.target.value)}
                      className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Fecha Inicio
                    </label>
                    <input
                      type="date"
                      value={editFechaInicio}
                      onChange={(e) => setEditFechaInicio(e.target.value)}
                      className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Fecha Entrega
                    </label>
                    <input
                      type="date"
                      value={editFechaEntrega}
                      onChange={(e) => setEditFechaEntrega(e.target.value)}
                      className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white [color-scheme:dark]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Ubicación / Maps
                    </label>
                    <input
                      type="text"
                      value={editUbicacion}
                      onChange={(e) => setEditUbicacion(e.target.value)}
                      className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Carpeta Google Drive
                    </label>
                    <input
                      type="text"
                      value={editDriveUrl}
                      onChange={(e) => setEditDriveUrl(e.target.value)}
                      className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Descripción y Notas del Proyecto
                  </label>
                  <textarea
                    rows={3}
                    value={editDescripcion}
                    onChange={(e) => setEditDescripcion(e.target.value)}
                    className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white resize-none"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalEditarProy(false)}
                    className="px-4 py-2 rounded-lg text-xs text-gray-300 hover:text-white cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={guardandoEdicion}
                    className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-5 py-2 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    {guardandoEdicion ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* MODAL CONFIRMAR ENVÍO A PAPELERA */}
      {confirmarPapelera &&
        montado &&
        createPortal(
          <div
            onClick={() => !enviandoPapelera && setConfirmarPapelera(false)}
            className="fixed inset-0 bg-black/75 flex items-center justify-center z-[9999] p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1A1A1A] border border-gray-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-white">Enviar proyecto a papelera</h3>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    ¿Querés mover <strong className="text-white">{proyecto.nombre}</strong> ({proyecto.codigo}) a la papelera? Podrás restaurarlo luego si lo necesitás.
                  </p>
                </div>
              </div>

              <div className="flex justify-end items-center gap-2 pt-2 border-t border-gray-800/80">
                <button
                  type="button"
                  disabled={enviandoPapelera}
                  onClick={() => setConfirmarPapelera(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={enviandoPapelera}
                  onClick={enviarProyectoAPapelera}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  {enviandoPapelera ? 'Moviendo...' : 'Enviar a papelera'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* MODALES COMPARTIDOS */}
      <ModalVisita
        abierto={modalVisita}
        onClose={() => {
          setModalVisita(false);
          setVisitaEditando(null);
        }}
        onGuardado={(msg) => {
          mostrarToast(msg);
          router.refresh();
        }}
        visitaEditando={visitaEditando}
        proyectos={[proyecto]}
        equipo={equipo}
        proyectoFijoCodigo={proyecto.codigo}
      />

      <ModalDocumento
        abierto={modalDocumento}
        onClose={() => {
          setModalDocumento(false);
          setDocEditando(null);
        }}
        onGuardado={(msg) => {
          mostrarToast(msg);
          router.refresh();
        }}
        docEditando={docEditando}
        proyectos={[proyecto]}
        proyectoFijoCodigo={proyecto.codigo}
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
        proyectos={[proyecto]}
        equipo={equipo}
        proyectoFijoCodigo={proyecto.codigo}
      />

      <ModalCompraPedido
        abierto={modalCompra}
        onClose={() => {
          setModalCompra(false);
          setCompraEditando(null);
        }}
        onGuardado={(msg) => {
          mostrarToast(msg);
          router.refresh();
        }}
        compraEditando={compraEditando}
        proyectos={[proyecto]}
        proveedores={proveedores}
        proyectoFijoCodigo={proyecto.codigo}
      />

      <ModalMovimientoFinanciero
        abierto={modalMovimiento}
        onClose={() => {
          setModalMovimiento(false);
          setMovEditando(null);
        }}
        onGuardado={(msg) => {
          mostrarToast(msg);
          router.refresh();
        }}
        movEditando={movEditando}
        proyectos={[proyecto]}
        clientes={clientes}
        proveedores={proveedores}
        proyectoFijoCodigo={proyecto.codigo}
        monedaInicial="ARS"
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