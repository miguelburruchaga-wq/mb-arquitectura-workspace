"use client";

import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { moverAPapelera } from '@/lib/papelera';
import {
  Plus,
  Lock,
  Users,
  Mail,
  Phone,
  CheckSquare,
  Copy,
  MessageCircle,
  Edit3,
  Trash2,
  X,
  Upload,
  CheckCircle2,
  Compass,
  ArrowRight,
} from 'lucide-react';

const ROLES_EQUIPO = [
  'Arquitecto Director · Proyecto y Obra',
  'Arquitecto Proyectista',
  'Diseñador/a de Interiores e Interiorismo',
  'Paisajista y Diseño de Exteriores',
  'Coordinador/a BIM y Documentación',
  'Jefe de Obra / Sobrestante',
  'Cómputos, Presupuestos y Compras',
  'Asesor Estructural / Instalaciones',
  'Dibujante Técnico / Renderista',
];

export default function EquipoClient({
  equipoInicial = [],
  proyectos = [],
  tareas = [],
  nombreEstudio = 'MB Arquitectura SA',
}: {
  equipoInicial: any[];
  proyectos?: any[];
  tareas?: any[];
  nombreEstudio?: string;
}) {
  const router = useRouter();
  const [montado, setMontado] = useState(false);

  const [vistaRestringida, setVistaRestringida] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [filasPorPagina, setFilasPorPagina] = useState(10);

  // Modal Sumar / Editar Integrante
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<any | null>(null);
  const [cargando, setCargando] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Modal Confirmar Envío a Papelera
  const [integranteAEliminar, setIntegranteAEliminar] = useState<any | null>(null);
  const [eliminando, setEliminando] = useState(false);

  // Campos del formulario
  const [fotoUrl, setFotoUrl] = useState('');
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState('Arquitecto Proyectista');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [proyectosSeleccionados, setProyectosSeleccionados] = useState<string[]>([]);

  useEffect(() => {
    setMontado(true);
  }, []);

  const mostrarToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 5000);
  };

  const esMiembroTitular = (m: any) => {
    if (!m) return false;
    return (
      String(m.tipo_acceso || '').toLowerCase().includes('titular') ||
      (m.email && m.email.toLowerCase().trim() === 'alejandrofego1986@gmail.com')
    );
  };

  const obtenerIniciales = (nom: string) => {
    const limpio = String(nom || 'A').replace(/^Arq\.\s*|^Dis\.\s*|^Ing\.\s*/i, '').trim();
    const partes = limpio.split(/\s+/);
    if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase();
    return limpio.slice(0, 2).toUpperCase() || 'A';
  };

  const obtenerProyectosDeIntegrante = (nombreIntegrante: string) => {
    return proyectos.filter(
      (p) =>
        p.responsable === nombreIntegrante ||
        (Array.isArray(p.equipo_asignado) && p.equipo_asignado.includes(nombreIntegrante))
    );
  };

  const contarTareasActivas = (nombreIntegrante: string) => {
    return tareas.filter((t) => {
      const est = String(t.estado || '').toLowerCase();
      return (
        t.responsable === nombreIntegrante &&
        est !== 'finalizado' &&
        est !== 'completada'
      );
    }).length;
  };

  const generarMensajeInvitacion = (m: any) => {
    const origin = 'https://mb-arquitectura-workspace.vercel.app';
    const enlaceDirecto = `${origin}/?invitado=${encodeURIComponent(m.email || '')}&rol=${encodeURIComponent(m.rol || '')}`;

    return `Hola ${m.nombre}, te invitamos a unirte al equipo de ${nombreEstudio} como ${m.rol || 'Arquitecto Proyectista'}. Ingresá con tu correo ${m.email || 'asignado'} desde este enlace directo y aguardá la confirmación del titular: ${enlaceDirecto}`;
  };

  const copiarInvitacion = async (m: any) => {
    const mensaje = generarMensajeInvitacion(m);
    try {
      await navigator.clipboard.writeText(mensaje);
      mostrarToast(`Invitación y enlace copiados para ${m.nombre}`);
    } catch {
      mostrarToast(`Enlace generado para ${m.nombre}`);
    }
  };

  const enviarWhatsapp = (m: any) => {
    const mensaje = generarMensajeInvitacion(m);
    const soloNumeros = String(m.telefono || '').replace(/\D/g, '');
    const numeroFinal = soloNumeros.length === 10 ? `549${soloNumeros}` : soloNumeros;
    const url = numeroFinal
      ? `https://wa.me/${numeroFinal}?text=${encodeURIComponent(mensaje)}`
      : `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const enviarGmail = (m: any) => {
    const mensaje = generarMensajeInvitacion(m);
    const asunto = `Invitación al equipo de ${nombreEstudio}`;
    const url = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(
      m.email || ''
    )}&su=${encodeURIComponent(asunto)}&body=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const abrirModalNuevo = () => {
    setEditando(null);
    setFotoUrl('');
    setNombre('');
    setRol('Arquitecto Proyectista');
    setEmail('');
    setTelefono('');
    setProyectosSeleccionados([]);
    setModalAbierto(true);
  };

  const abrirModalEditar = (m: any) => {
    setEditando(m);
    setFotoUrl(m.foto_url || '');
    setNombre(m.nombre || '');
    setRol(m.rol || 'Arquitecto Proyectista');
    setEmail(m.email || '');
    setTelefono(m.telefono || '');
    const asignados = obtenerProyectosDeIntegrante(m.nombre).map((p) => p.codigo);
    setProyectosSeleccionados(asignados);
    setModalAbierto(true);
  };

  const manejarSubidaFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setFotoUrl(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const toggleProyectoSeleccionado = (codigo: string) => {
    setProyectosSeleccionados((prev) =>
      prev.includes(codigo) ? prev.filter((c) => c !== codigo) : [...prev, codigo]
    );
  };

  const guardarIntegrante = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);

    const nombreLimpio = nombre.trim();
    const datos = {
      nombre: nombreLimpio,
      rol: rol.trim() || 'Arquitecto Proyectista',
      email: email.trim(),
      telefono: telefono.trim() || null,
      foto_url: fotoUrl.trim() || null,
      tipo_acceso: editando?.tipo_acceso || 'Invitado',
      estado: editando?.estado || 'Invitado',
    };

    const { error } = editando
      ? await supabase.from('equipo').update(datos).eq('id', editando.id)
      : await supabase.from('equipo').insert([datos]);

    if (!error) {
      for (const p of proyectos) {
        const actual = Array.isArray(p.equipo_asignado) ? [...p.equipo_asignado] : [];
        const debeEstar = proyectosSeleccionados.includes(p.codigo);
        const yaEsta = actual.includes(nombreLimpio);

        if (debeEstar && !yaEsta) {
          await supabase
            .from('proyectos')
            .update({ equipo_asignado: [...actual, nombreLimpio] })
            .eq('id', p.id);
        } else if (!debeEstar && yaEsta) {
          await supabase
            .from('proyectos')
            .update({ equipo_asignado: actual.filter((n) => n !== nombreLimpio) })
            .eq('id', p.id);
        }
      }

      setCargando(false);
      setModalAbierto(false);
      mostrarToast(
        editando
          ? `Datos actualizados para ${nombreLimpio}`
          : `Invitación lista para ${nombreLimpio}`
      );
      router.refresh();
    } else {
      setCargando(false);
      alert('Error al guardar integrante: ' + error.message);
    }
  };

  const eliminarIntegrante = (m: any) => {
    setModalAbierto(false);
    setIntegranteAEliminar(m);
  };

  const confirmarEliminacion = async () => {
    if (!integranteAEliminar) return;
    setEliminando(true);
    try {
      await moverAPapelera({
        tabla: 'equipo',
        modulo: 'Equipo',
        titulo: integranteAEliminar.nombre || 'Integrante sin nombre',
        subtitulo: `${integranteAEliminar.rol || ''} ${
          integranteAEliminar.email ? `· ${integranteAEliminar.email}` : ''
        }`.trim(),
        registro: integranteAEliminar,
      });
      const nombreElim = integranteAEliminar.nombre;
      setIntegranteAEliminar(null);
      mostrarToast(`${nombreElim} enviado a papelera`);
      router.refresh();
    } catch (error: any) {
      alert('Error al mover a papelera: ' + error.message);
    } finally {
      setEliminando(false);
    }
  };

  const totalPaginas = Math.max(1, Math.ceil(equipoInicial.length / filasPorPagina));
  const inicio = (pagina - 1) * filasPorPagina;
  const equipoPaginado = useMemo(
    () => equipoInicial.slice(inicio, inicio + filasPorPagina),
    [equipoInicial, inicio, filasPorPagina]
  );

  return (
    <div className="min-h-screen text-white p-8 font-sans">
      {/* CABECERA */}
      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Equipo e Integrantes del Estudio
          </h1>
          <p className="text-sm text-gray-300 mt-1">
            Identificá a cada profesional con su foto y rol para asignarlos como responsables en
            obras, tareas y mencionarlos con @Nombre en los proyectos
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setVistaRestringida(!vistaRestringida)}
            className={`border px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors ${
              vistaRestringida
                ? 'bg-[#EAB308]/15 border-[#EAB308]/40 text-[#EAB308]'
                : 'bg-[#242424]/85 hover:bg-white/10 border-white/10 text-gray-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" /> Restringir vista
          </button>

          <button
            type="button"
            onClick={abrirModalNuevo}
            className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors shadow-[0_0_20px_rgba(234,179,8,0.2)] cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" /> Sumar integrante / Invitar
          </button>
        </div>
      </div>

      {/* DIRECTORIO DE INTEGRANTES */}
      <div className="bg-[#242424]/85 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl">
        <div className="mb-5">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-[#EAB308]" />
            Directorio de Integrantes, Responsables e Invitados ({equipoInicial.length})
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Cada integrante queda identificado por su foto y rol en los proyectos, tareas y
            comentarios con @Nombre
          </p>
        </div>

        <div className="divide-y divide-white/10">
          {equipoPaginado.length === 0 ? (
            <div className="py-10 text-center text-xs text-gray-400">
              Aún no hay integrantes cargados. Tocá &quot;+ Sumar integrante / Invitar&quot; para
              agregar el primero.
            </div>
          ) : (
            equipoPaginado.map((m) => {
              const obrasAsignadas = obtenerProyectosDeIntegrante(m.nombre);
              const tareasActivas = contarTareasActivas(m.nombre);
              const esTitular = esMiembroTitular(m);
              const esActivo = String(m.estado || 'Activo').toLowerCase() === 'activo';

              return (
                <div
                  key={m.id}
                  onClick={() => abrirModalEditar(m)}
                  className="py-4 px-3 -mx-3 rounded-xl hover:bg-[#EAB308]/10 hover:outline hover:outline-1 hover:-outline-offset-1 hover:outline-[#EAB308]/60 transition-all cursor-pointer flex flex-wrap justify-between items-center gap-4"
                >
                  {/* IZQUIERDA: AVATAR + INFO */}
                  <div className="flex items-start gap-4">
                    {m.foto_url ? (
                      <img
                        src={m.foto_url}
                        alt={m.nombre}
                        className="w-11 h-11 rounded-full object-cover border border-gray-700 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-[#181818] border border-white/15 text-[#EAB308] font-extrabold text-sm flex items-center justify-center flex-shrink-0">
                        {obtenerIniciales(m.nombre)}
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-white">{m.nombre}</span>

                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            esTitular
                              ? 'bg-[#EAB308]/15 border-[#EAB308]/40 text-[#EAB308]'
                              : 'bg-indigo-950/70 border-indigo-700/50 text-indigo-300'
                          }`}
                        >
                          {esTitular ? 'Titular del Estudio' : 'Invitado'}
                        </span>

                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EAB308]/10 border border-[#EAB308]/30 text-[#EAB308]">
                          {m.rol || 'Arquitecto Proyectista'}
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            esActivo
                              ? 'bg-emerald-950/70 border-emerald-700/50 text-emerald-400'
                              : 'bg-amber-950/70 border-amber-700/50 text-[#EAB308]'
                          }`}
                        >
                          {m.estado || 'Activo'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-300">
                        {m.email && (
                          <span className="inline-flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-gray-400" />
                            {vistaRestringida ? '••••••@••••.com' : m.email}
                          </span>
                        )}
                        {m.telefono && (
                          <span className="inline-flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-[#EAB308]" />
                            {vistaRestringida ? '••••••••' : m.telefono}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1.5 text-gray-200">
                          <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                          {tareasActivas} {tareasActivas === 1 ? 'tarea activa' : 'tareas activas'}
                        </span>
                      </div>

                      {obrasAsignadas.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
                          <span className="text-gray-400 inline-flex items-center gap-1">
                            <Compass className="w-3.5 h-3.5 text-[#EAB308]" /> Obras asignadas:
                          </span>
                          {obrasAsignadas.map((p) => (
                            <Link
                              key={p.codigo}
                              href={`/proyectos/${encodeURIComponent(p.codigo)}`}
                              onClick={(e) => e.stopPropagation()}
                              className="px-2.5 py-0.5 rounded-full bg-[#181818] border border-white/15 hover:border-[#EAB308] text-gray-200 hover:text-[#EAB308] text-[11px] font-semibold inline-flex items-center gap-1 transition-colors"
                            >
                              {p.nombre} <ArrowRight className="w-3 h-3" />
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* DERECHA: BOTONES DE INVITACIÓN Y EDICIÓN */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        copiarInvitacion(m);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#181818] hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-200 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5 text-[#EAB308]" /> Copiar link
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        enviarWhatsapp(m);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#181818] hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-200 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-400" /> WhatsApp
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        enviarGmail(m);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#181818] hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-200 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5 text-[#EAB308]" /> Gmail
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        abrirModalEditar(m);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#181818] hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-200 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#EAB308]" /> Foto y Rol
                    </button>

                    {!esTitular && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          eliminarIntegrante(m);
                        }}
                        className="p-2 rounded-xl hover:bg-rose-950/60 text-rose-500 hover:text-rose-400 cursor-pointer transition-colors"
                        title="Enviar integrante a papelera"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* PAGINACIÓN */}
        <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap justify-between items-center gap-4 text-xs text-gray-300">
          <div className="flex items-center gap-3">
            <span>
              Mostrando{' '}
              <strong className="text-white">
                {equipoInicial.length === 0 ? 0 : inicio + 1}–
                {Math.min(inicio + filasPorPagina, equipoInicial.length)}
              </strong>{' '}
              de <strong className="text-white">{equipoInicial.length}</strong>
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
      </div>

      {/* MODAL: SUMAR NUEVO INTEGRANTE O INVITADO */}
      {modalAbierto &&
        montado &&
        createPortal(
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
            <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800 w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
              <div className="px-6 pt-6 pb-4 flex justify-between items-start border-b border-gray-800">
                <div>
                  <span className="inline-block bg-[#EAB308]/15 border border-[#EAB308]/40 text-[#EAB308] px-2.5 py-0.5 rounded text-[10px] font-extrabold tracking-wider uppercase mb-2">
                    IDENTIFICACIÓN DE EQUIPO Y RESPONSABLES
                  </span>
                  <h2 className="text-lg font-bold text-white">
                    {editando ? 'Editar Foto, Rol y Proyectos' : 'Sumar Nuevo Integrante o Invitado'}
                  </h2>
                </div>
                <button
                  onClick={() => setModalAbierto(false)}
                  className="text-gray-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={guardarIntegrante} className="px-6 py-5 overflow-y-auto space-y-4">
                <div className="bg-[#121212] border border-gray-800 rounded-xl p-4 flex items-center gap-4">
                  {fotoUrl ? (
                    <img
                      src={fotoUrl}
                      alt="Avatar"
                      className="w-12 h-12 rounded-xl object-cover border border-gray-700 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-[#1E293B] border border-blue-900/60 text-[#EAB308] font-extrabold text-lg flex items-center justify-center flex-shrink-0">
                      {obtenerIniciales(nombre || 'A')}
                    </div>
                  )}

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white">
                        Foto de Perfil del Integrante (Opcional)
                      </span>
                      <label className="px-3 py-1 rounded-lg border border-[#EAB308]/50 hover:bg-[#EAB308]/10 text-[#EAB308] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer">
                        <Upload className="w-3.5 h-3.5" /> Subir foto
                        <input
                          type="file"
                          accept="image/*"
                          onChange={manejarSubidaFoto}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <input
                      type="text"
                      value={fotoUrl}
                      onChange={(e) => setFotoUrl(e.target.value)}
                      placeholder="O pegá un enlace directo a la foto (https://...)"
                      className="w-full bg-[#1A1A1A] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Nombre y Apellido / Título *
                    </label>
                    <input
                      type="text"
                      required
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Ej. Arq. Sofía Méndez / Dis. Lucas Paz"
                      className="w-full bg-[#121212] border border-gray-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Rol o Especialidad para Identificarlo *
                    </label>
                    <select
                      required
                      value={rol}
                      onChange={(e) => setRol(e.target.value)}
                      className="w-full bg-[#121212] border border-gray-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white cursor-pointer"
                    >
                      {rol && !ROLES_EQUIPO.includes(rol) && (
                        <option value={rol}>{rol}</option>
                      )}
                      {ROLES_EQUIPO.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Correo Electrónico *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="profesional@estudio.com"
                      className="w-full bg-[#121212] border border-gray-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      WhatsApp / Teléfono
                    </label>
                    <input
                      type="text"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder="+54 9 11 ..."
                      className="w-full bg-[#121212] border border-gray-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500"
                    />
                  </div>
                </div>

                <div className="bg-[#121212] border border-gray-800 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-white">
                      Obras y Proyectos donde participa este integrante:
                    </span>
                    <span className="text-gray-400">
                      {proyectosSeleccionados.length} seleccionadas
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {proyectos.map((p) => {
                      const marcado = proyectosSeleccionados.includes(p.codigo);
                      return (
                        <label
                          key={p.codigo}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                            marcado
                              ? 'bg-[#EAB308]/10 border-[#EAB308]/50 text-white'
                              : 'bg-[#1A1A1A] border-gray-800 text-gray-300 hover:border-gray-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={marcado}
                            onChange={() => toggleProyectoSeleccionado(p.codigo)}
                            className="accent-[#EAB308] w-4 h-4"
                          />
                          <span className="truncate">{p.nombre}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-gray-800/80">
                  <div>
                    {editando && !esMiembroTitular(editando) && (
                      <button
                        type="button"
                        onClick={() => eliminarIntegrante(editando)}
                        className="text-red-500 hover:bg-red-500/15 px-3.5 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" /> Enviar a papelera
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setModalAbierto(false)}
                      className="text-gray-300 hover:text-white px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={cargando}
                      className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-5 py-2.5 rounded-xl font-bold text-xs cursor-pointer"
                    >
                      {cargando
                        ? 'Guardando...'
                        : editando
                        ? 'Guardar Cambios'
                        : '+ Sumar al Equipo'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* MODAL COMPACTO: CONFIRMAR ENVÍO A PAPELERA */}
      {integranteAEliminar &&
        montado &&
        createPortal(
          <div
            onClick={() => !eliminando && setIntegranteAEliminar(null)}
            className="fixed inset-0 bg-black/75 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm"
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
                  <h3 className="text-sm font-bold text-white">Enviar integrante a papelera</h3>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    ¿Querés mover a{' '}
                    <strong className="text-white">{integranteAEliminar.nombre}</strong> a la
                    papelera? Podrás restaurarlo luego si lo necesitás.
                  </p>
                </div>
              </div>

              <div className="flex justify-end items-center gap-2 pt-2 border-t border-gray-800/80">
                <button
                  type="button"
                  disabled={eliminando}
                  onClick={() => setIntegranteAEliminar(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={eliminando}
                  onClick={confirmarEliminacion}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  {eliminando ? 'Moviendo...' : 'Enviar a papelera'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* TOAST INFERIOR */}
      {toast &&
        montado &&
        createPortal(
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#161616] border border-gray-700/80 shadow-2xl rounded-xl px-5 py-3.5 flex items-center gap-3 z-[9999]">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span className="text-sm font-semibold text-white">{toast}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-gray-400 hover:text-white ml-2 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}