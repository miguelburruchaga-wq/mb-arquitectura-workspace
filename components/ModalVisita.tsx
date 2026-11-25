"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { moverAPapelera } from '@/lib/papelera';
import { X, Bell, Trash2, Camera, Loader2 } from 'lucide-react';

export const CATEGORIAS_VISITA = [
  'Visita de obra',
  'Reunión con cliente',
  'Coordinación de gremios',
  'Relevamiento técnico',
  'Entrega de documentación',
];

export const ESTADOS_VISITA = ['Programada', 'Realizada', 'Cancelada'];

export const ETIQUETAS_FOTO = ['Antes', 'En Obra', 'Final de Obra'] as const;

export interface FotoVisita {
  id: string;
  url: string;
  etiqueta: 'Antes' | 'En Obra' | 'Final de Obra';
  nombre?: string;
}

const INTEGRANTES_DEFAULT = [
  'Alejandro Fego',
  'Arq. Ariel Gissi',
  'Miguel Burruchaga',
  'Equipo MB',
];

// Comprime cualquier foto de celular/cámara a máx 1400px y JPEG 80% antes de subirla
async function comprimirImagenWeb(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const maxDim = 1400;
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          resolve(blob || file);
        },
        'image/jpeg',
        0.8
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

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
  const [subiendoFotos, setSubiendoFotos] = useState(false);

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

  // Bitácora fotográfica
  const [fotos, setFotos] = useState<FotoVisita[]>([]);
  const [etiquetaDefecto, setEtiquetaDefecto] = useState<'Antes' | 'En Obra' | 'Final de Obra'>('En Obra');

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
      setFotos(Array.isArray(visitaEditando.fotos) ? visitaEditando.fotos : []);
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
      setFotos([]);
    }
  }, [abierto, visitaEditando, proyectoFijoCodigo]);

  if (!abierto || !montado) return null;

  const manejarSubidaFotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivos = Array.from(e.target.files || []);
    if (archivos.length === 0) return;

    setSubiendoFotos(true);
    const nuevasFotos: FotoVisita[] = [];

    for (const file of archivos) {
      try {
        const comprimido = await comprimirImagenWeb(file);
        const nombreLimpio = file.name.replace(/\.[^.]+$/, '').replace(/\s+/g, '_');
        const ruta = `${proyectoCodigo || 'general'}/${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 7)}_${nombreLimpio}.jpg`;

        const { error: upErr } = await supabase.storage
          .from('visitas')
          .upload(ruta, comprimido, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (!upErr) {
          const { data: pub } = supabase.storage.from('visitas').getPublicUrl(ruta);
          nuevasFotos.push({
            id: `${Date.now()}-${Math.random()}`,
            url: pub.publicUrl,
            etiqueta: etiquetaDefecto,
            nombre: file.name,
          });
        } else {
          // Respaldo DataURL si el bucket aún no tiene permisos
          const reader = new FileReader();
          const dataUrl: string = await new Promise((res) => {
            reader.onload = () => res(String(reader.result || ''));
            reader.readAsDataURL(comprimido);
          });
          if (dataUrl) {
            nuevasFotos.push({
              id: `${Date.now()}-${Math.random()}`,
              url: dataUrl,
              etiqueta: etiquetaDefecto,
              nombre: file.name,
            });
          }
        }
      } catch {
        // Ignorar archivo corrupto
      }
    }

    setFotos((prev) => [...prev, ...nuevasFotos]);
    setSubiendoFotos(false);
    e.target.value = '';
  };

  const cambiarEtiquetaFoto = (id: string, nuevaEtiqueta: 'Antes' | 'En Obra' | 'Final de Obra') => {
    setFotos((prev) =>
      prev.map((f) => (f.id === id ? { ...f, etiqueta: nuevaEtiqueta } : f))
    );
  };

  const quitarFoto = (id: string) => {
    setFotos((prev) => prev.filter((f) => f.id !== id));
  };

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
      fotos,
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
              Inspección de obra, reunión con cliente, acta y registro fotográfico
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

          {/* REGISTRO FOTOGRÁFICO DE OBRA (ANTES / EN OBRA / FINAL DE OBRA) */}
          <div className="bg-[#151515] border border-gray-800 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#EAB308]" />
                <div>
                  <div className="text-xs font-bold text-white">
                    Bitácora Fotográfica de Obra ({fotos.length})
                  </div>
                  <div className="text-[11px] text-gray-400">
                    Se optimizan automáticamente antes de guardar en Supabase (bucket visitas)
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={etiquetaDefecto}
                  onChange={(e) => setEtiquetaDefecto(e.target.value as any)}
                  className="bg-[#121212] border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-200"
                  title="Etiqueta para las próximas fotos que subas"
                >
                  {ETIQUETAS_FOTO.map((et) => (
                    <option key={et} value={et}>
                      Etiqueta: {et}
                    </option>
                  ))}
                </select>

                <label className="bg-[#EAB308]/15 hover:bg-[#EAB308]/25 border border-[#EAB308]/50 text-[#EAB308] px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer">
                  {subiendoFotos ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Optimizando...
                    </>
                  ) : (
                    <>
                      <Camera className="w-3.5 h-3.5" /> + Agregar fotos
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={subiendoFotos}
                    onChange={manejarSubidaFotos}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {fotos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                {fotos.map((f) => (
                  <div
                    key={f.id}
                    className="bg-[#121212] border border-gray-800 rounded-xl overflow-hidden flex flex-col"
                  >
                    <div className="relative h-28 bg-black">
                      <img
                        src={f.url}
                        alt={f.etiqueta}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => quitarFoto(f.id)}
                        className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/75 hover:bg-rose-600 text-white cursor-pointer"
                        title="Eliminar foto"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="p-2">
                      <select
                        value={f.etiqueta}
                        onChange={(e) => cambiarEtiquetaFoto(f.id, e.target.value as any)}
                        className={`w-full rounded-lg px-2 py-1 text-[11px] font-bold border cursor-pointer ${
                          f.etiqueta === 'Antes'
                            ? 'bg-gray-800 border-gray-700 text-gray-200'
                            : f.etiqueta === 'Final de Obra'
                            ? 'bg-emerald-950/80 border-emerald-700/60 text-emerald-400'
                            : 'bg-amber-950/80 border-amber-700/60 text-[#EAB308]'
                        }`}
                      >
                        {ETIQUETAS_FOTO.map((et) => (
                          <option key={et} value={et}>
                            {et}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                disabled={cargando || subiendoFotos}
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