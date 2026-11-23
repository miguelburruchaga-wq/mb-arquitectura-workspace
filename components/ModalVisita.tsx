"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { moverAPapelera } from '@/lib/papelera';
import { X, Bell, Trash2 } from 'lucide-react';

export const CATEGORIAS_VISITA = [
  'Visita de obra',
  'Reunión con cliente',
  'Coordinación de gremios',
  'Relevamiento técnico',
  'Entrega de documentación',
];

export const ESTADOS_VISITA = ['Programada', 'Realizada', 'Cancelada'];

const INTEGRANTES_DEFAULT = [
  'Alejandro Fego',
  'Arq. Joana Cuevas',
  'Lautaro Godoy',
  'Equipo MB',
];

export default function ModalVisita({
  abierto,
  onClose,
  onGuardado,
  visitaEditando = null,
  proyectos = [],
  equipo = [],
  proyectoFijoCodigo = '',
}: {
  abierto: boolean;
  onClose: () => void;
  onGuardado: (mensaje: string) => void;
  visitaEditando?: any | null;
  proyectos?: any[];
  equipo?: any[];
  proyectoFijoCodigo?: string;
}) {
  const [montado, setMontado] = useState(false);
  const [cargando, setCargando] = useState(false);

  const hoyClave = new Date().toISOString().split('T')[0];

  const [proyectoCodigo, setProyectoCodigo] = useState(
    proyectoFijoCodigo || proyectos[0]?.codigo || ''
  );
  const [categoria, setCategoria] = useState('Visita de obra');
  const [responsable, setResponsable] = useState('Alejandro Fego');
  const [titulo, setTitulo] = useState('');
  const [fecha, setFecha] = useState(hoyClave);
  const [horario, setHorario] = useState('10:00');
  const [estado, setEstado] = useState('Programada');
  const [acta, setActa] = useState('');
  const [alarmaActiva, setAlarmaActiva] = useState(false);
  const [alarmaFecha, setAlarmaFecha] = useState(hoyClave);
  const [alarmaHorario, setAlarmaHorario] = useState('09:00');

  useEffect(() => {
    setMontado(true);
  }, []);

  const listaIntegrantes =
    equipo.length > 0 ? equipo.map((m) => m.nombre) : INTEGRANTES_DEFAULT;

  useEffect(() => {
    if (!abierto) return;
    const hoy = new Date().toISOString().split('T')[0];

    if (visitaEditando) {
      setProyectoCodigo(
        visitaEditando.proyecto_codigo || proyectoFijoCodigo || proyectos[0]?.codigo || ''
      );
      setCategoria(visitaEditando.categoria || 'Visita de obra');
      setResponsable(visitaEditando.responsable || listaIntegrantes[0] || 'Alejandro Fego');
      setTitulo(visitaEditando.titulo || visitaEditando.motivo || '');
      setFecha(visitaEditando.fecha || hoy);
      setHorario(visitaEditando.horario || visitaEditando.hora || '10:00');
      setEstado(visitaEditando.estado || 'Programada');
      setActa(visitaEditando.acta || '');
      setAlarmaActiva(Boolean(visitaEditando.alarma_activa));
      setAlarmaFecha(visitaEditando.alarma_fecha || visitaEditando.fecha || hoy);
      setAlarmaHorario(visitaEditando.alarma_horario || '09:00');
    } else {
      setProyectoCodigo(proyectoFijoCodigo || proyectos[0]?.codigo || '');
      setCategoria('Visita de obra');
      setResponsable(listaIntegrantes[0] || 'Alejandro Fego');
      setTitulo('');
      setFecha(hoy);
      setHorario('10:00');
      setEstado('Programada');
      setActa('');
      setAlarmaActiva(false);
      setAlarmaFecha(hoy);
      setAlarmaHorario('09:00');
    }
  }, [abierto, visitaEditando, proyectoFijoCodigo]);

  if (!abierto || !montado) return null;

  const guardarVisita = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);

    const proy = proyectos.find((p) => p.codigo === proyectoCodigo);

    const datos = {
      proyecto_codigo: proy?.codigo || proyectoCodigo || null,
      proyecto_nombre: proy?.nombre || visitaEditando?.proyecto_nombre || null,
      proyecto_estado: proy?.estado || visitaEditando?.proyecto_estado || 'En Diseño',
      categoria,
      responsable,
      titulo: titulo.trim(),
      fecha,
      horario,
      estado,
      acta: acta.trim() || null,
      alarma_activa: alarmaActiva,
      alarma_fecha: alarmaActiva ? alarmaFecha : null,
      alarma_horario: alarmaActiva ? alarmaHorario : null,
    };

    const { error } = visitaEditando
      ? await supabase.from('visitas').update(datos).eq('id', visitaEditando.id)
      : await supabase.from('visitas').insert([datos]);

    setCargando(false);

    if (!error) {
      onClose();
      onGuardado(
        visitaEditando ? 'Cambios guardados en la visita' : 'Visita agendada correctamente'
      );
    } else {
      alert('Error al guardar visita: ' + error.message);
    }
  };

  const eliminarVisita = async () => {
    if (!visitaEditando) return;
    setCargando(true);
    try {
      await moverAPapelera({
        tabla: 'visitas',
        modulo: 'Visitas y Agenda',
        titulo: visitaEditando.titulo || visitaEditando.motivo || 'Visita sin título',
        subtitulo: `${visitaEditando.fecha || ''} ${
          visitaEditando.horario || visitaEditando.hora || ''
        }`.trim(),
        registro: visitaEditando,
      });
      onClose();
      onGuardado('Visita enviada a papelera');
    } catch (error: any) {
      alert('Error al mover visita a papelera: ' + error.message);
    } finally {
      setCargando(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
      <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="px-6 pt-6 pb-4 flex justify-between items-start border-b border-gray-800/80">
          <div>
            <h2 className="text-lg font-bold text-white">
              {visitaEditando ? 'Editar Visita / Reunión' : 'Agendar Nueva Visita / Reunión'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Inspección de obra, reunión con cliente o coordinación de gremios
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={guardarVisita} className="px-6 py-5 overflow-y-auto space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Corresponde al Proyecto / Obra
            </label>
            <select
              value={proyectoCodigo}
              onChange={(e) => setProyectoCodigo(e.target.value)}
              disabled={Boolean(proyectoFijoCodigo)}
              className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white disabled:opacity-90"
            >
              {!proyectoFijoCodigo && (
                <option value="">General (Sin proyecto específico)</option>
              )}
              {proyectos.map((p) => (
                <option key={p.codigo} value={p.codigo}>
                  {p.codigo} · {p.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Categoría</label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white"
              >
                {CATEGORIAS_VISITA.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Responsable / Participante
              </label>
              <select
                value={responsable}
                onChange={(e) => setResponsable(e.target.value)}
                className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white"
              >
                {responsable && !listaIntegrantes.includes(responsable) && (
                  <option value={responsable}>{responsable}</option>
                )}
                {listaIntegrantes.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Motivo / Título de Visita *
            </label>
            <input
              type="text"
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej. Visita de obra - Replanteo"
              className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Fecha *</label>
              <input
                type="date"
                required
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Horario</label>
              <input
                type="time"
                value={horario}
                onChange={(e) => setHorario(e.target.value)}
                className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Estado</label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white"
              >
                {ESTADOS_VISITA.map((est) => (
                  <option key={est} value={est}>
                    {est}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Alarma / Recordatorio */}
          <div className="bg-[#151515] border border-gray-800 rounded-xl p-4 space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2.5">
                <Bell
                  className={`w-4 h-4 ${alarmaActiva ? 'text-[#EAB308]' : 'text-gray-400'}`}
                />
                <div>
                  <div className="text-xs font-bold text-white">Alarma / Recordatorio</div>
                  <div className="text-[11px] text-gray-400">
                    Seleccioná fecha y horario para recibir aviso
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={alarmaActiva}
                onChange={(e) => setAlarmaActiva(e.target.checked)}
                className="w-4 h-4 accent-[#EAB308] cursor-pointer"
              />
            </label>

            {alarmaActiva && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-800/80">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Fecha de la alarma
                  </label>
                  <input
                    type="date"
                    required
                    value={alarmaFecha}
                    onChange={(e) => setAlarmaFecha(e.target.value)}
                    className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2 text-sm text-white [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Horario de la alarma
                  </label>
                  <input
                    type="time"
                    required
                    value={alarmaHorario}
                    onChange={(e) => setAlarmaHorario(e.target.value)}
                    className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2 text-sm text-white [color-scheme:dark]"
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              {visitaEditando ? 'Acta de Visita / Acuerdos de Obra' : 'Notas / Temario previo'}
            </label>
            <textarea
              rows={2}
              value={acta}
              onChange={(e) => setActa(e.target.value)}
              placeholder={
                visitaEditando
                  ? 'Minuta técnica o acuerdos convenidos...'
                  : 'Puntos a revisar en la visita...'
              }
              className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 resize-none"
            />
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-gray-800/80">
            <div>
              {visitaEditando && (
                <button
                  type="button"
                  onClick={eliminarVisita}
                  disabled={cargando}
                  className="border border-transparent hover:border-red-500/40 hover:bg-red-500/15 text-red-500 hover:text-red-400 px-4 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" /> Enviar a papelera
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="text-gray-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={cargando}
                className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-5 py-2.5 rounded-lg font-bold text-sm cursor-pointer disabled:opacity-50"
              >
                {cargando
                  ? 'Guardando...'
                  : visitaEditando
                  ? 'Guardar Cambios'
                  : 'Agendar Visita'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}