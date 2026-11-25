"use client";

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, Settings2, Image as ImageIcon, Eye, EyeOff } from 'lucide-react';

const CONFIG_REPORTE_STORAGE_KEY = 'mb_config_reporte_cliente';

const CONFIG_DEFAULT = {
  estudioNombre: 'MB ARQUITECTURA S.A.',
  estudioSubtitulo: 'Diseño - Construcción',
  logoUrl: '',
  direccion: 'Calle 145 N°636 Berazategui Buenos Aires CP 1884',
  email: 'info@mbarquitectura.com.ar',
  telefono: '(011) 2098-7166',
  web: 'www.mbarquitectura.com.ar',
  notaPie: 'Documento informativo de avance y estado de obra emitido por MB Arquitectura S.A.',
};

interface ReporteClienteModalProps {
  abierto: boolean;
  onClose: () => void;
  proyecto: any;
  cliente?: any;
  etapaActual: string;
  etapasLista: string[];
  tareas?: any[];
  visitas?: any[];
  movimientos?: any[];
  presupuestoUsd?: number;
  cobradoUsd?: number;
  gastosUsd?: number;
}

export default function ReporteClienteModal({
  abierto,
  onClose,
  proyecto,
  cliente,
  etapaActual,
  etapasLista,
  tareas = [],
  visitas = [],
  presupuestoUsd = 0,
  cobradoUsd = 0,
  gastosUsd = 0,
}: ReporteClienteModalProps) {
  const [montado, setMontado] = useState(false);
  const [config, setConfig] = useState(CONFIG_DEFAULT);
  const [editandoMembrete, setEditandoMembrete] = useState(false);
  const [incluirFinanzas, setIncluirFinanzas] = useState(true);
  const [incluirFotos, setIncluirFotos] = useState(true);
  const [observacionesReporte, setObservacionesReporte] = useState('');

  useEffect(() => {
    setMontado(true);
    try {
      const saved = localStorage.getItem(CONFIG_REPORTE_STORAGE_KEY);
      if (saved) {
        setConfig({ ...CONFIG_DEFAULT, ...JSON.parse(saved) });
      }
    } catch {
      // Silencioso
    }
  }, []);

  const guardarConfigMembrete = (nueva: typeof CONFIG_DEFAULT) => {
    setConfig(nueva);
    try {
      localStorage.setItem(CONFIG_REPORTE_STORAGE_KEY, JSON.stringify(nueva));
    } catch {
      // Silencioso
    }
  };

  const subirLogoMembrete = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      guardarConfigMembrete({ ...config, logoUrl: String(reader.result || '') });
    };
    reader.readAsDataURL(file);
  };

  if (!abierto || !montado) return null;

  const idxEtapa = Math.max(0, etapasLista.indexOf(etapaActual));
  const avanceEtapaPct = Math.round(((idxEtapa + 1) / Math.max(1, etapasLista.length)) * 100);

  const tareasCompletadas = tareas.filter((t) =>
    ['finalizado', 'completada'].includes(String(t.estado || '').toLowerCase())
  ).length;

  const fotosObra = visitas.flatMap((v) =>
    Array.isArray(v.fotos)
      ? v.fotos.map((f: any) => ({
          ...f,
          fechaVisita: v.fecha,
          tituloVisita: v.titulo || v.motivo || 'Registro de Obra',
        }))
      : []
  );

  const saldoUsd = Math.max(0, presupuestoUsd - cobradoUsd);
  const hoyTexto = new Date().toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const formatearFecha = (iso: string) => {
    if (!iso) return '—';
    const [y, m, d] = String(iso).split('T')[0].split('-');
    return y && m && d ? `${d}/${m}/${y}` : iso;
  };

  const imprimirReporte = () => {
    window.print();
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/85 z-[9999] overflow-y-auto p-3 md:p-6 print:p-0 print:bg-white">
      {/* ESTILOS DE IMPRESIÓN SOLO PARA ESTE REPORTE */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #reporte-cliente-imprimible, #reporte-cliente-imprimible * { visibility: visible !important; }
          #reporte-cliente-imprimible {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            margin: 0 !important;
            padding: 16mm !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* BARRA DE HERRAMIENTAS SUPERIOR (NO SE IMPRIME) */}
      <div className="no-print max-w-4xl mx-auto mb-4 bg-[#181818] border border-gray-800 rounded-2xl p-4 flex flex-wrap justify-between items-center gap-3 shadow-2xl">
        <div>
          <h3 className="text-sm font-bold text-white">Vista Previa · Reporte Ejecutivo para el Cliente</h3>
          <p className="text-xs text-gray-400">
            Personalizá el encabezado/pie de página y descargalo como PDF desde Imprimir
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIncluirFinanzas(!incluirFinanzas)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5 cursor-pointer ${
              incluirFinanzas
                ? 'bg-emerald-950/60 border-emerald-700/50 text-emerald-400'
                : 'bg-[#222] border-gray-700 text-gray-400'
            }`}
          >
            {incluirFinanzas ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            Estado Económico
          </button>

          <button
            type="button"
            onClick={() => setIncluirFotos(!incluirFotos)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5 cursor-pointer ${
              incluirFotos
                ? 'bg-emerald-950/60 border-emerald-700/50 text-emerald-400'
                : 'bg-[#222] border-gray-700 text-gray-400'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" /> Fotos ({fotosObra.length})
          </button>

          <button
            type="button"
            onClick={() => setEditandoMembrete(!editandoMembrete)}
            className="px-3 py-1.5 rounded-xl bg-[#242424] hover:bg-gray-800 border border-gray-700 text-xs font-bold text-gray-200 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Settings2 className="w-3.5 h-3.5 text-[#EAB308]" /> Encabezado y Pie
          </button>

          <button
            type="button"
            onClick={imprimirReporte}
            className="px-4 py-2 rounded-xl bg-[#EAB308] hover:bg-[#CA9A04] text-black text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> Imprimir / Guardar PDF
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CONFIGURACIÓN DE ENCABEZADO Y PIE DE PÁGINA (NO SE IMPRIME) */}
      {editandoMembrete && (
        <div className="no-print max-w-4xl mx-auto mb-4 bg-[#181818] border border-[#EAB308]/40 rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#EAB308]">
              Configuración de Encabezado y Pie de Página del Estudio
            </h4>
            <label className="px-3 py-1.5 rounded-lg bg-[#EAB308]/15 border border-[#EAB308]/40 text-[#EAB308] text-xs font-bold cursor-pointer">
              + Subir Logo del Estudio
              <input type="file" accept="image/*" onChange={subirLogoMembrete} className="hidden" />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-gray-400 mb-1">Nombre del Estudio</label>
              <input
                type="text"
                value={config.estudioNombre}
                onChange={(e) => guardarConfigMembrete({ ...config, estudioNombre: e.target.value })}
                className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-gray-400 mb-1">Bajada / Rubro</label>
              <input
                type="text"
                value={config.estudioSubtitulo}
                onChange={(e) =>
                  guardarConfigMembrete({ ...config, estudioSubtitulo: e.target.value })
                }
                className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-gray-400 mb-1">Teléfono</label>
              <input
                type="text"
                value={config.telefono}
                onChange={(e) => guardarConfigMembrete({ ...config, telefono: e.target.value })}
                className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-gray-400 mb-1">Dirección (Pie de página)</label>
              <input
                type="text"
                value={config.direccion}
                onChange={(e) => guardarConfigMembrete({ ...config, direccion: e.target.value })}
                className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-gray-400 mb-1">Correo electrónico</label>
              <input
                type="text"
                value={config.email}
                onChange={(e) => guardarConfigMembrete({ ...config, email: e.target.value })}
                className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-gray-400 mb-1">Sitio Web</label>
              <input
                type="text"
                value={config.web}
                onChange={(e) => guardarConfigMembrete({ ...config, web: e.target.value })}
                className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Nota o comentario ejecutivo para este reporte (opcional)
            </label>
            <input
              type="text"
              value={observacionesReporte}
              onChange={(e) => setObservacionesReporte(e.target.value)}
              placeholder="Ej. Informe correspondiente a la certificación de etapa y avance semanal de obra..."
              className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white"
            />
          </div>
        </div>
      )}

      {/* HOJA EDITORIAL IMPRIMIBLE (FONDO BLANCO) */}
      <div
        id="reporte-cliente-imprimible"
        className="max-w-4xl mx-auto bg-white text-zinc-900 rounded-2xl shadow-2xl p-8 md:p-12 space-y-7 font-sans"
      >
        {/* ENCABEZADO INSTITUCIONAL */}
        <header className="flex justify-between items-start border-b-2 border-zinc-900 pb-5">
          <div className="flex items-center gap-4">
            {config.logoUrl ? (
              <img src={config.logoUrl} alt="Logo" className="h-14 w-auto object-contain" />
            ) : (
              <div className="w-12 h-12 bg-zinc-900 text-[#EAB308] font-black text-xl flex items-center justify-center rounded-lg">
                MB
              </div>
            )}
            <div>
              <div className="text-xl font-black tracking-tight text-zinc-900 uppercase">
                {config.estudioNombre}
              </div>
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
                {config.estudioSubtitulo}
              </div>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-block bg-zinc-900 text-white text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded">
              Informe de Avance de Obra
            </span>
            <div className="text-xs text-zinc-500 mt-1.5">
              Emisión: <strong className="text-zinc-800">{hoyTexto}</strong>
            </div>
            <div className="text-xs text-zinc-500">
              Código: <strong className="text-zinc-800">{proyecto.codigo}</strong>
            </div>
          </div>
        </header>

        {/* DATOS DE LA OBRA Y COMITENTE */}
        <section className="bg-zinc-50 border border-zinc-200 rounded-xl p-5">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1">
            Proyecto / Obra
          </div>
          <h1 className="text-2xl font-black text-zinc-900">{proyecto.nombre}</h1>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-zinc-200 text-xs">
            <div>
              <span className="text-zinc-400 block">Comitente</span>
              <strong className="text-zinc-900">
                {cliente?.nombre || proyecto.cliente_nombre || 'Particular'}
              </strong>
            </div>
            <div>
              <span className="text-zinc-400 block">Tipología</span>
              <strong className="text-zinc-900">{proyecto.tipologia || 'Arquitectura'}</strong>
            </div>
            <div>
              <span className="text-zinc-400 block">Dirección de Obra</span>
              <strong className="text-zinc-900">{proyecto.responsable || 'MB Arquitectura'}</strong>
            </div>
            <div>
              <span className="text-zinc-400 block">Avance General</span>
              <strong className="text-emerald-700">{avanceEtapaPct}% ({etapaActual})</strong>
            </div>
          </div>
          {observacionesReporte && (
            <p className="mt-4 pt-3 border-t border-zinc-200 text-xs text-zinc-700 italic">
              {observacionesReporte}
            </p>
          )}
        </section>

        {/* AVANCE POR ETAPAS */}
        <section>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-zinc-800">
              1. Cronograma de Etapas del Proyecto
            </h2>
            <span className="text-xs font-bold text-zinc-600">
              Tareas completadas: {tareasCompletadas} de {tareas.length}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {etapasLista.map((et, i) => {
              const completada = i < idxEtapa;
              const actual = i === idxEtapa;
              return (
                <div
                  key={et}
                  className={`p-3 rounded-lg border text-xs ${
                    actual
                      ? 'border-amber-500 bg-amber-50'
                      : completada
                      ? 'border-emerald-300 bg-emerald-50/60'
                      : 'border-zinc-200 bg-white text-zinc-400'
                  }`}
                >
                  <div className="flex justify-between items-center font-bold mb-1">
                    <span>Etapa {i + 1}</span>
                    <span className="text-[10px] uppercase">
                      {actual ? 'En curso' : completada ? 'Completada' : 'Pendiente'}
                    </span>
                  </div>
                  <div className="font-semibold text-zinc-900">{et}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* RESUMEN ECONÓMICO (OPCIONAL) */}
        {incluirFinanzas && (
          <section>
            <h2 className="text-xs font-black uppercase tracking-wider text-zinc-800 mb-3">
              2. Resumen Económico Consolidado (USD)
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="border border-zinc-200 rounded-xl p-3.5">
                <span className="text-[11px] text-zinc-500 block">Presupuesto Pactado</span>
                <strong className="text-base font-black text-zinc-900">
                  USD ${presupuestoUsd.toLocaleString('es-AR')}
                </strong>
              </div>
              <div className="border border-zinc-200 rounded-xl p-3.5">
                <span className="text-[11px] text-zinc-500 block">Total Abonado</span>
                <strong className="text-base font-black text-emerald-700">
                  USD ${cobradoUsd.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                </strong>
              </div>
              <div className="border border-zinc-200 rounded-xl p-3.5">
                <span className="text-[11px] text-zinc-500 block">Saldo Pendiente</span>
                <strong className="text-base font-black text-amber-700">
                  USD ${saldoUsd.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                </strong>
              </div>
              <div className="border border-zinc-200 rounded-xl p-3.5">
                <span className="text-[11px] text-zinc-500 block">Ejecutado en Obra</span>
                <strong className="text-base font-black text-zinc-800">
                  USD ${gastosUsd.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                </strong>
              </div>
            </div>
          </section>
        )}

        {/* BITÁCORA DE VISITAS Y REGISTRO FOTOGRÁFICO */}
        {incluirFotos && (
          <section>
            <h2 className="text-xs font-black uppercase tracking-wider text-zinc-800 mb-3">
              {incluirFinanzas ? '3.' : '2.'} Registro Fotográfico y Bitácora de Obra
            </h2>

            {fotosObra.length === 0 ? (
              <p className="text-xs text-zinc-500 border border-dashed border-zinc-300 rounded-xl p-4">
                No se adjuntaron fotografías de obra en las visitas registradas hasta la fecha.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {fotosObra.map((foto: any, idx: number) => (
                  <div
                    key={idx}
                    className="border border-zinc-200 rounded-xl overflow-hidden bg-zinc-50 break-inside-avoid"
                  >
                    <img
                      src={foto.url}
                      alt={foto.etiqueta || 'Registro de obra'}
                      className="w-full h-40 object-cover"
                    />
                    <div className="p-2.5 text-[11px]">
                      <div className="flex justify-between items-center font-bold text-zinc-900">
                        <span className="px-2 py-0.5 rounded bg-zinc-900 text-white text-[10px]">
                          {foto.etiqueta || 'En Obra'}
                        </span>
                        <span className="text-zinc-500">{formatearFecha(foto.fechaVisita)}</span>
                      </div>
                      <div className="text-zinc-600 mt-1 truncate">{foto.tituloVisita}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* PIE DE PÁGINA INSTITUCIONAL */}
        <footer className="pt-5 border-t-2 border-zinc-900 flex flex-wrap justify-between items-center gap-3 text-[11px] text-zinc-600">
          <div>
            <strong className="text-zinc-900">{config.direccion}</strong>
            <div>{config.notaPie}</div>
          </div>
          <div className="text-right font-semibold text-zinc-800">
            <div>{config.email}</div>
            <div>
              {config.telefono} · {config.web}
            </div>
          </div>
        </footer>
      </div>
    </div>,
    document.body
  );
}