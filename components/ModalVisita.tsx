"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { moverAPapelera } from '@/lib/papelera';
import { X, Trash2, Camera, Upload, Loader2, Bell, Volume2 } from 'lucide-react';

export const TONOS_ALARMA = [
  'Campana Suave',
  'Alerta Doble',
  'Melodía Estudio',
  'Urgente',
] as const;

export function reproducirSonidoAlarmaVisita(
  tono: string = 'Campana Suave',
  volumenPct: number = 80
) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const vol = Math.max(0.02, Math.min(1, Number(volumenPct || 80) / 100));

    const secuencias: Record<
      string,
      { freq: number; delay: number; dur: number; type: OscillatorType }[]
    > = {
      'Campana Suave': [
        { freq: 880, delay: 0, dur: 0.35, type: 'sine' },
        { freq: 1174.66, delay: 0.28, dur: 0.45, type: 'sine' },
      ],
      'Alerta Doble': [
        { freq: 987.77, delay: 0, dur: 0.16, type: 'triangle' },
        { freq: 987.77, delay: 0.22, dur: 0.16, type: 'triangle' },
        { freq: 1318.5, delay: 0.45, dur: 0.3, type: 'triangle' },
      ],
      'Melodía Estudio': [
        { freq: 523.25, delay: 0, dur: 0.18, type: 'sine' },
        { freq: 659.25, delay: 0.18, dur: 0.18, type: 'sine' },
        { freq: 783.99, delay: 0.36, dur: 0.18, type: 'sine' },
        { freq: 1046.5, delay: 0.54, dur: 0.35, type: 'sine' },
      ],
      Urgente: [
        { freq: 1046.5, delay: 0, dur: 0.12, type: 'sawtooth' },
        { freq: 880, delay: 0.15, dur: 0.12, type: 'sawtooth' },
        { freq: 1046.5, delay: 0.3, dur: 0.12, type: 'sawtooth' },
        { freq: 1318.5, delay: 0.45, dur: 0.25, type: 'sawtooth' },
      ],
    };

    const notas = secuencias[tono] || secuencias['Campana Suave'];

    notas.forEach((n) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = n.type;
      osc.frequency.setValueAtTime(n.freq, ctx.currentTime + n.delay);
      gain.gain.setValueAtTime(vol * 0.45, ctx.currentTime + n.delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + n.delay + n.dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + n.delay);
      osc.stop(ctx.currentTime + n.delay + n.dur + 0.02);
    });
  } catch {
    // Silencioso si el navegador bloquea audio sin interacción previa
  }
}

export function lanzarNotificacionSistema(titulo: string, cuerpo: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;

  const mostrar = () => {
    try {
      const notif = new Notification(titulo, {
        body: cuerpo,
        requireInteraction: true,
        tag: 'mb-arquitectos-alarma',
      });
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    } catch {
      // Silencioso si el SO bloquea notificaciones
    }
  };

  if (Notification.permission === 'granted') {
    mostrar();
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then((perm) => {
      if (perm === 'granted') mostrar();
    });
  }
}

export default function ModalVisita({
  abierto,
  onClose,
  onGuardado,
  visitaEditando = null,
  proyectos = [],
  equipo = [],
  proyectoFijoCodigo = '',
  fechaInicial = '',
}: {
  abierto: boolean;
  onClose: () => void;
  onGuardado: (mensaje: string) => void;
  visitaEditando?: any | null;
  proyectos?: any[];
  equipo?: any[];
  proyectoFijoCodigo?: string;
  fechaInicial?: string;
}) {
  const [montado, setMontado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [subiendoFotos, setSubiendoFotos] = useState(false);

  const hoy = new Date().toISOString().split('T')[0];

  const [proyectoCodigo, setProyectoCodigo] = useState(
    proyectoFijoCodigo || proyectos[0]?.codigo || ''
  );
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState('Visita de obra');
  const [fecha, setFecha] = useState(fechaInicial || hoy);
  const [horario, setHorario] = useState('10:00');
  const [responsable, setResponsable] = useState('');
  const [estado, setEstado] = useState('Programada');
  const [acta, setActa] = useState('');
  const [fotos, setFotos] = useState<any[]>([]);
  const [etiquetaFoto, setEtiquetaFoto] = useState<'Antes' | 'En Obra' | 'Final de Obra'>('En Obra');

  const [alarmaActiva, setAlarmaActiva] = useState(false);
  const [alarmaFecha, setAlarmaFecha] = useState(fechaInicial || hoy);
  const [alarmaHora, setAlarmaHora] = useState('09:00');
  const [alarmaTono, setAlarmaTono] = useState<string>('Campana Suave');
  const [alarmaVolumen, setAlarmaVolumen] = useState<number>(80);

  useEffect(() => {
    setMontado(true);
  }, []);

  useEffect(() => {
    if (!abierto) return;
    const baseFecha = fechaInicial || new Date().toISOString().split('T')[0];

    if (visitaEditando) {
      setProyectoCodigo(visitaEditando.proyecto_codigo || proyectoFijoCodigo || '');
      setTitulo(visitaEditando.titulo || visitaEditando.motivo || '');
      setTipo(visitaEditando.tipo || 'Visita de obra');
      setFecha(visitaEditando.fecha || baseFecha);
      setHorario(visitaEditando.horario || visitaEditando.hora || '10:00');
      setResponsable(visitaEditando.responsable || '');
      setEstado(visitaEditando.estado || 'Programada');
      setActa(visitaEditando.acta || '');
      setFotos(Array.isArray(visitaEditando.fotos) ? visitaEditando.fotos : []);
      setAlarmaActiva(Boolean(visitaEditando.alarma_activa));
      setAlarmaFecha(visitaEditando.alarma_fecha || visitaEditando.fecha || baseFecha);
      setAlarmaHora(visitaEditando.alarma_hora || '09:00');
      setAlarmaTono(visitaEditando.alarma_tono || 'Campana Suave');
      setAlarmaVolumen(
        typeof visitaEditando.alarma_volumen === 'number' ? visitaEditando.alarma_volumen : 80
      );
    } else {
      setProyectoCodigo(proyectoFijoCodigo || proyectos[0]?.codigo || '');
      setTitulo('');
      setTipo('Visita de obra');
      setFecha(baseFecha);
      setHorario('10:00');
      setResponsable(equipo[0]?.nombre || 'Alejandro Fego');
      setEstado('Programada');
      setActa('');
      setFotos([]);
      setAlarmaActiva(false);
      setAlarmaFecha(baseFecha);
      setAlarmaHora('09:00');
      setAlarmaTono('Campana Suave');
      setAlarmaVolumen(80);
    }
  }, [abierto, visitaEditando, proyectoFijoCodigo, fechaInicial]);

  if (!abierto || !montado) return null;

  const subirFotosObra = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setSubiendoFotos(true);
    try {
      for (const file of files) {
        const ruta = `visitas/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        const { error } = await supabase.storage
          .from('documentos')
          .upload(ruta, file, { upsert: true });

        if (!error) {
          const { data } = supabase.storage.from('documentos').getPublicUrl(ruta);
          setFotos((prev) => [
            ...prev,
            { id: Date.now() + Math.random(), url: data.publicUrl, etiqueta: etiquetaFoto },
          ]);
        } else {
          const reader = new FileReader();
          reader.onload = () => {
            setFotos((prev) => [
              ...prev,
              {
                id: Date.now() + Math.random(),
                url: String(reader.result || ''),
                etiqueta: etiquetaFoto,
              },
            ]);
          };
          reader.readAsDataURL(file);
        }
      }
    } finally {
      setSubiendoFotos(false);
    }
  };

  const guardarVisita = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cargando) return;
    setCargando(true);

    try {
      const proy = proyectos.find((p) => p.codigo === proyectoCodigo);
      const payload: Record<string, any> = {
        proyecto_codigo: proy?.codigo || proyectoCodigo || null,
        proyecto_nombre: proy?.nombre || null,
        titulo: titulo.trim() || tipo,
        tipo,
        fecha,
        horario,
        responsable: responsable || null,
        estado,
        acta: acta.trim() || null,
        fotos,
        alarma_activa: alarmaActiva,
        alarma_fecha: alarmaActiva ? alarmaFecha || fecha : null,
        alarma_hora: alarmaActiva ? alarmaHora || '09:00' : null,
        alarma_tono: alarmaTono,
        alarma_volumen: alarmaVolumen,
      };

      const { error } = visitaEditando
        ? await supabase.from('visitas').update(payload).eq('id', visitaEditando.id)
        : await supabase.from('visitas').insert([payload]);

      if (error) {
        alert('Error al guardar visita: ' + error.message);
        return;
      }

      onClose();
      onGuardado(visitaEditando ? 'Visita actualizada' : 'Visita agendada correctamente');
    } catch (err: any) {
      alert('Error inesperado: ' + (err?.message || 'Sin conexión'));
    } finally {
      setCargando(false);
    }
  };

  const eliminarVisita = async () => {
    if (!visitaEditando) return;
    setCargando(true);
    try {
      await moverAPapelera({
        tabla: 'visitas',
        modulo: 'Visitas y Agenda',
        titulo: visitaEditando.titulo || visitaEditando.motivo || 'Visita',
        subtitulo: visitaEditando.fecha || '',
        registro: visitaEditando,
      });
      onClose();
      onGuardado('Visita enviada a papelera');
    } catch (err: any) {
      alert('Error al eliminar: ' + err.message);
    } finally {
      setCargando(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
      <div className="bg-[#161616] border border-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="px-6 pt-5 pb-4 border-b border-gray-800 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-extrabold text-white">
              {visitaEditando ? 'Editar Visita / Evento' : 'Agendar Visita o Reunión'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Coordinación de obra, bitácora fotográfica, acta y alarma recordatoria
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-200 mb-1.5">Proyecto / Obra</label>
              <select
                value={proyectoCodigo}
                disabled={Boolean(proyectoFijoCodigo)}
                onChange={(e) => setProyectoCodigo(e.target.value)}
                className="w-full bg-[#1C1C1C] border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white"
              >
                <option value="">General del Estudio</option>
                {proyectos.map((p) => (
                  <option key={p.codigo} value={p.codigo}>
                    {p.codigo} · {p.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-200 mb-1.5">Tipo de Evento</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full bg-[#1C1C1C] border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white"
              >
                <option value="Visita de obra">Visita de obra</option>
                <option value="Reunión con cliente">Reunión con cliente</option>
                <option value="Coordinación gremios">Coordinación gremios</option>
                <option value="Entrega de obra">Entrega de obra</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-200 mb-1.5">
              Título / Motivo *
            </label>
            <input
              type="text"
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej. Replanteo de instalaciones y control de avance"
              className="w-full bg-[#1C1C1C] border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-200 mb-1.5">Fecha *</label>
              <input
                type="date"
                required
                value={fecha}
                onChange={(e) => {
                  setFecha(e.target.value);
                  if (!alarmaFecha) setAlarmaFecha(e.target.value);
                }}
                className="w-full bg-[#1C1C1C] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white [color-scheme:dark]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-200 mb-1.5">Horario</label>
              <input
                type="time"
                value={horario}
                onChange={(e) => setHorario(e.target.value)}
                className="w-full bg-[#1C1C1C] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white [color-scheme:dark]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-200 mb-1.5">Responsable</label>
              <select
                value={responsable}
                onChange={(e) => setResponsable(e.target.value)}
                className="w-full bg-[#1C1C1C] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white"
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
              <label className="block text-xs font-bold text-gray-200 mb-1.5">Estado</label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full bg-[#1C1C1C] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="Programada">Programada</option>
                <option value="Realizada">Realizada</option>
                <option value="Reprogramada">Reprogramada</option>
              </select>
            </div>
          </div>

          {/* ALARMA PROGRAMABLE CON TONO Y VOLUMEN */}
          <div className="bg-[#1C1C1C] border border-gray-800 rounded-2xl p-4 space-y-3">
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
                      onMouseUp={() => reproducirSonidoAlarmaVisita(alarmaTono, alarmaVolumen)}
                      className="w-full accent-[#EAB308] cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* BITÁCORA FOTOGRÁFICA */}
          <div className="bg-[#1C1C1C] border border-gray-800 rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-[#EAB308]" />
                Bitácora Fotográfica de Obra ({fotos.length})
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-400">Etiqueta:</span>
                <select
                  value={etiquetaFoto}
                  onChange={(e) => setEtiquetaFoto(e.target.value as any)}
                  className="bg-[#141414] border border-gray-700 rounded-lg px-2.5 py-1 text-xs font-bold text-white"
                >
                  <option value="Antes">Antes</option>
                  <option value="En Obra">En Obra</option>
                  <option value="Final de Obra">Final de Obra</option>
                </select>
              </div>
            </div>

            <label className="border-2 border-dashed border-gray-700 hover:border-[#EAB308] rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer bg-[#151515]">
              {subiendoFotos ? (
                <Loader2 className="w-5 h-5 text-[#EAB308] animate-spin mb-1" />
              ) : (
                <Upload className="w-5 h-5 text-[#EAB308] mb-1" />
              )}
              <span className="text-xs font-extrabold text-[#EAB308]">
                {subiendoFotos
                  ? 'Subiendo fotografías...'
                  : 'Hacé clic aquí para adjuntar fotos de obra (JPG, PNG, WEBP)'}
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={subirFotosObra}
                className="hidden"
              />
            </label>

            {fotos.length > 0 && (
              <div className="grid grid-cols-4 gap-2 pt-1">
                {fotos.map((f, idx) => (
                  <div
                    key={f.id || idx}
                    className="relative rounded-lg overflow-hidden h-16 border border-gray-700"
                  >
                    <img src={f.url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setFotos((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 bg-black/80 text-rose-400 rounded-full p-0.5 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-200 mb-1.5">
              Acta / Notas de Visita
            </label>
            <textarea
              rows={2}
              value={acta}
              onChange={(e) => setActa(e.target.value)}
              placeholder="Decisiones tomadas en obra, pendientes de gremios..."
              className="w-full bg-[#1C1C1C] border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white resize-none"
            />
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-gray-800">
            <div>
              {visitaEditando && (
                <button
                  type="button"
                  onClick={eliminarVisita}
                  disabled={cargando}
                  className="text-rose-400 hover:text-rose-300 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Enviar a papelera
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={cargando}
                className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-5 py-2.5 rounded-xl text-xs font-extrabold cursor-pointer disabled:opacity-50"
              >
                {cargando ? 'Guardando...' : 'Guardar Visita'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}