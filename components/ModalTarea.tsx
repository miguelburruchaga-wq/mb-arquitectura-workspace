"use client";

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Trash2, ChevronDown, User } from 'lucide-react';

export const RUBROS_TAREAS = [
  'Proyecto y Diseño',
  'Documentación / Planos',
  'Trámites y Permisos Municipales',
  'Movimiento de Suelos y Demolición',
  'Estructuras y Hormigón',
  'Albañilería y Mampostería',
  'Instalación Eléctrica',
  'Instalación Sanitaria y Gas',
  'Termomecánica y Climatización (HVAC)',
  'Aberturas y Carpintería de Aluminio / PVC',
  'Carpintería de Madera y Mobiliario',
  'Herrería y Estructuras Metálicas',
  'Construcción en Seco (Durlock / Steel Frame)',
  'Impermeabilizaciones y Techos',
  'Pisos, Porcelanatos y Revestimientos',
  'Pintura y Revestimientos Plásticos',
  'Iluminación y Artefactos',
  'Vidriería y Cristales',
  'Marmolería y Mesadas',
  'Paisajismo y Exteriores',
  'Compras, Logística y Varios',
];

export default function ModalTarea({
  abierto,
  onClose,
  onGuardado,
  tareaEditando = null,
  proyectos = [],
  equipo = [],
  proyectoFijoCodigo = '',
}: {
  abierto: boolean;
  onClose: () => void;
  onGuardado: (mensaje: string) => void;
  tareaEditando?: any | null;
  proyectos?: any[];
  equipo?: any[];
  proyectoFijoCodigo?: string;
}) {
  const [cargando, setCargando] = useState(false);
  const [dropdownProyAbierto, setDropdownProyAbierto] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [proyectoCodigo, setProyectoCodigo] = useState(proyectoFijoCodigo);
  const [titulo, setTitulo] = useState('');
  const [rubro, setRubro] = useState(RUBROS_TAREAS[0]);
  const [estado, setEstado] = useState('Por Realizar');
  const [prioridad, setPrioridad] = useState('Media');
  const [fechaInicio, setFechaInicio] = useState(() => new Date().toISOString().split('T')[0]);
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [responsable, setResponsable] = useState('');
  const [descripcion, setDescripcion] = useState('');

  useEffect(() => {
    if (!abierto) return;
    const hoy = new Date().toISOString().split('T')[0];

    if (tareaEditando) {
      setProyectoCodigo(tareaEditando.proyecto_codigo || proyectoFijoCodigo || '');
      setTitulo(tareaEditando.titulo || '');
      setRubro(tareaEditando.rubro || RUBROS_TAREAS[0]);
      setEstado(tareaEditando.estado || 'Por Realizar');
      setPrioridad(tareaEditando.prioridad || 'Media');
      setFechaInicio(tareaEditando.fecha_inicio || hoy);
      setFechaVencimiento(tareaEditando.fecha_vencimiento || '');
      setResponsable(tareaEditando.responsable || equipo[0]?.nombre || '');
      setDescripcion(tareaEditando.descripcion || '');
    } else {
      const codInicial = proyectoFijoCodigo || proyectos[0]?.codigo || '';
      const proyBase = proyectos.find((p) => p.codigo === codInicial);
      setProyectoCodigo(codInicial);
      setTitulo('');
      setRubro(RUBROS_TAREAS[0]);
      setEstado('Por Realizar');
      setPrioridad('Media');
      setFechaInicio(hoy);
      setFechaVencimiento('');
      setResponsable(proyBase?.responsable || equipo[0]?.nombre || '');
      setDescripcion('');
    }
    setDropdownProyAbierto(false);
  }, [abierto, tareaEditando, proyectoFijoCodigo]);

  useEffect(() => {
    const manejarClickAfuera = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownProyAbierto(false);
      }
    };
    document.addEventListener('mousedown', manejarClickAfuera);
    return () => document.removeEventListener('mousedown', manejarClickAfuera);
  }, []);

  if (!abierto) return null;

  const proyectoSeleccionado = proyectos.find((p) => p.codigo === proyectoCodigo);

  const guardarTarea = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);

    const proy = proyectos.find((p) => p.codigo === proyectoCodigo);

    const datos = {
      titulo: titulo.trim(),
      rubro,
      proyecto_codigo: proy?.codigo || proyectoCodigo || null,
      proyecto_nombre: proy?.nombre || null,
      responsable: responsable || 'Sin asignar',
      prioridad,
      estado,
      fecha_inicio: fechaInicio || null,
      fecha_vencimiento: fechaVencimiento || null,
      descripcion: descripcion.trim() || null,
    };

    const { error } = tareaEditando
      ? await supabase.from('tareas').update(datos).eq('id', tareaEditando.id)
      : await supabase.from('tareas').insert([datos]);

    setCargando(false);

    if (!error) {
      onClose();
      onGuardado(
        tareaEditando
          ? 'Tarea actualizada'
          : proy
          ? `Tarea creada y vinculada a ${proy.nombre}`
          : 'Tarea creada correctamente'
      );
    } else {
      alert('Error al guardar tarea: ' + error.message);
    }
  };

  const eliminarTarea = async () => {
    if (!tareaEditando) return;
    setCargando(true);
    const { error } = await supabase.from('tareas').delete().eq('id', tareaEditando.id);
    setCargando(false);

    if (!error) {
      onClose();
      onGuardado('Tarea eliminada');
    } else {
      alert('Error al eliminar tarea: ' + error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800 w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* CABECERA */}
        <div className="px-6 pt-6 pb-4 flex justify-between items-start border-b border-gray-800/80">
          <div>
            <h2 className="text-lg font-bold text-white">
              {tareaEditando ? 'Editar Tarea de Proyecto' : 'Nueva Tarea de Proyecto'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Entregable técnico vinculado a un proyecto y al cronograma
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={guardarTarea} className="px-6 py-5 overflow-y-auto space-y-4">
          {/* CORRESPONDE AL PROYECTO / OBRA * (Selector con badges) */}
          <div ref={dropdownRef} className="relative">
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Corresponde al Proyecto / Obra <span className="text-[#EAB308]">*</span>
            </label>
            <button
              type="button"
              onClick={() => setDropdownProyAbierto(!dropdownProyAbierto)}
              className="w-full bg-[#121212] border border-gray-700/80 hover:border-gray-600 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-left cursor-pointer transition-colors"
            >
              <div className="flex flex-wrap items-center gap-2">
                {proyectoSeleccionado ? (
                  <>
                    <span className="bg-[#EAB308]/15 border border-[#EAB308]/40 text-[#EAB308] px-2 py-0.5 rounded-md text-[11px] font-extrabold">
                      {proyectoSeleccionado.codigo}
                    </span>
                    <span className="text-sm font-bold text-white">
                      {proyectoSeleccionado.nombre}
                    </span>
                    {proyectoSeleccionado.estado && (
                      <span className="bg-cyan-950/70 border border-cyan-700/50 text-cyan-300 px-2 py-0.5 rounded-md text-[11px] font-semibold">
                        {proyectoSeleccionado.estado}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-sm text-gray-400">General (Sin proyecto específico)</span>
                )}
              </div>
              <ChevronDown
                className={`w-4 h-4 text-gray-400 transition-transform ${
                  dropdownProyAbierto ? 'rotate-180' : ''
                }`}
              />
            </button>

            {dropdownProyAbierto && (
              <div className="absolute z-20 mt-1.5 w-full bg-[#161616] border border-gray-700 rounded-xl shadow-2xl max-h-52 overflow-y-auto py-1">
                <button
                  type="button"
                  onClick={() => {
                    setProyectoCodigo('');
                    setDropdownProyAbierto(false);
                  }}
                  className="w-full px-3.5 py-2.5 text-left text-xs text-gray-400 hover:bg-[#222222] cursor-pointer"
                >
                  General (Sin proyecto específico)
                </button>
                {proyectos.map((p) => (
                  <button
                    key={p.codigo}
                    type="button"
                    onClick={() => {
                      setProyectoCodigo(p.codigo);
                      if (p.responsable && !responsable) setResponsable(p.responsable);
                      setDropdownProyAbierto(false);
                    }}
                    className={`w-full px-3.5 py-2.5 flex items-center gap-2 text-left hover:bg-[#222222] cursor-pointer ${
                      proyectoCodigo === p.codigo ? 'bg-[#EAB308]/10' : ''
                    }`}
                  >
                    <span className="bg-[#EAB308]/15 border border-[#EAB308]/40 text-[#EAB308] px-2 py-0.5 rounded text-[10px] font-extrabold">
                      {p.codigo}
                    </span>
                    <span className="text-xs font-bold text-white truncate">{p.nombre}</span>
                    {p.estado && (
                      <span className="bg-cyan-950/70 border border-cyan-700/50 text-cyan-300 px-2 py-0.5 rounded text-[10px] font-semibold ml-auto">
                        {p.estado}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* TÍTULO DE LA TAREA * */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Título de la Tarea <span className="text-[#EAB308]">*</span>
            </label>
            <input
              type="text"
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej. Chequeo de armaduras en losa sobre subsuelo"
              className="w-full bg-[#121212] border border-gray-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500"
            />
          </div>

          {/* RUBRO / ESPECIALIDAD (21 RUBROS) */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Rubro / Especialidad
            </label>
            <select
              value={rubro}
              onChange={(e) => setRubro(e.target.value)}
              className="w-full bg-[#121212] border border-gray-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white"
            >
              {RUBROS_TAREAS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* ESTADO + PRIORIDAD */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Estado</label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full bg-[#121212] border border-gray-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white"
              >
                <option value="Por Realizar">Por Realizar</option>
                <option value="En Curso">En Curso</option>
                <option value="Finalizado">Finalizado</option>
                <option value="En Revisión">En Revisión</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Prioridad</label>
              <select
                value={prioridad}
                onChange={(e) => setPrioridad(e.target.value)}
                className="w-full bg-[#121212] border border-gray-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white"
              >
                <option value="Alta">Alta</option>
                <option value="Media">Media</option>
                <option value="Baja">Baja</option>
              </select>
            </div>
          </div>

          {/* FECHA INICIO (CRONOGRAMA) + FECHA FIN / ENTREGA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Fecha Inicio (Cronograma)
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full bg-[#121212] border border-gray-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white [color-scheme:dark]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Fecha Fin / Entrega
              </label>
              <input
                type="date"
                value={fechaVencimiento}
                onChange={(e) => setFechaVencimiento(e.target.value)}
                className="w-full bg-[#121212] border border-gray-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white [color-scheme:dark]"
              />
            </div>
          </div>

          {/* RESPONSABLE DE LA TAREA */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Responsable de la Tarea
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#EAB308] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={responsable}
                onChange={(e) => setResponsable(e.target.value)}
                className="w-full bg-[#121212] border border-gray-700/80 rounded-xl pl-10 pr-3.5 py-2.5 text-sm font-semibold text-white"
              >
                <option value="">Sin asignar</option>
                {equipo.map((m) => (
                  <option key={m.id} value={m.nombre}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* DETALLE TÉCNICO / NOTAS */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Detalle Técnico / Notas
            </label>
            <textarea
              rows={3}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Especificaciones o indicaciones para el equipo..."
              className="w-full bg-[#121212] border border-gray-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 resize-none"
            />
          </div>

          {/* PIE */}
          <div className="flex justify-between items-center pt-3 border-t border-gray-800/80">
            <div>
              {tareaEditando && (
                <button
                  type="button"
                  onClick={eliminarTarea}
                  disabled={cargando}
                  className="text-red-500 hover:bg-red-500/15 px-3.5 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" /> Eliminar
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="text-gray-300 hover:text-white px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={cargando}
                className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-5 py-2.5 rounded-xl font-bold text-xs cursor-pointer"
              >
                {cargando ? 'Guardando...' : tareaEditando ? 'Guardar Cambios' : 'Crear Tarea'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}