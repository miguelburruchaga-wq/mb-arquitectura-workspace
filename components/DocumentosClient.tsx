"use client";

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import ModalDocumento, { CATEGORIAS_DOCUMENTOS } from '@/components/ModalDocumento';
import VisorArchivoModal from '@/components/VisorArchivoModal';
import {
  Plus,
  Search,
  Upload,
  Download,
  Lock,
  Calendar,
  FileText,
  ExternalLink,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

export default function DocumentosClient({
  documentosIniciales = [],
  proyectos = [],
}: {
  documentosIniciales: any[];
  proyectos?: any[];
}) {
  const router = useRouter();

  const [busqueda, setBusqueda] = useState('');
  const [filtroObra, setFiltroObra] = useState('Todas');
  const [filtroCategoria, setFiltroCategoria] = useState('Todas');
  const [filtroPeriodo, setFiltroPeriodo] = useState('Todos');
  const [vistaRestringida, setVistaRestringida] = useState(false);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [docEditando, setDocEditando] = useState<any | null>(null);
  const [visorArchivo, setVisorArchivo] = useState<{ url: string; titulo: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const mostrarToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const formatearFecha = (iso: string) => {
    if (!iso) return '—';
    const [y, m, d] = String(iso).split('T')[0].split('-');
    if (!y || !m || !d) return iso;
    return `${d}/${m}/${y}`;
  };

  const documentosFiltrados = useMemo(() => {
    const hoy = new Date();
    const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
    const anioActual = String(hoy.getFullYear());

    return documentosIniciales.filter((d) => {
      const q = busqueda.toLowerCase().trim();
      const coincideBusq =
        !q ||
        (d.codigo_lamina || '').toLowerCase().includes(q) ||
        (d.titulo || '').toLowerCase().includes(q) ||
        (d.proyecto_codigo || '').toLowerCase().includes(q) ||
        (d.proyecto_nombre || '').toLowerCase().includes(q) ||
        (d.categoria || '').toLowerCase().includes(q);

      const coincideObra = filtroObra === 'Todas' || d.proyecto_codigo === filtroObra;
      const coincideCat = filtroCategoria === 'Todas' || d.categoria === filtroCategoria;

      let coincidePeriodo = true;
      if (filtroPeriodo === 'Este mes' && d.fecha_emision) {
        coincidePeriodo = String(d.fecha_emision).startsWith(mesActual);
      } else if (filtroPeriodo === 'Este año' && d.fecha_emision) {
        coincidePeriodo = String(d.fecha_emision).startsWith(anioActual);
      }

      return coincideBusq && coincideObra && coincideCat && coincidePeriodo;
    });
  }, [documentosIniciales, busqueda, filtroObra, filtroCategoria, filtroPeriodo]);

  const exportarCsv = () => {
    const encabezados = [
      'Codigo',
      'Titulo',
      'Proyecto',
      'Categoria',
      'Formato',
      'Escala',
      'Revision',
      'Fecha',
      'Estado',
    ];
    const filas = documentosFiltrados.map((d) => [
      d.codigo_lamina || '',
      `"${String(d.titulo || '').replace(/"/g, '""')}"`,
      `"${d.proyecto_codigo ? `${d.proyecto_codigo} · ${d.proyecto_nombre}` : 'General'}"`,
      `"${d.categoria || ''}"`,
      d.formato || '',
      d.escala || '',
      d.revision || '',
      d.fecha_emision || '',
      d.estado || '',
    ]);
    const csv = [encabezados.join(','), ...filas.map((f) => f.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `documentos_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white p-8 font-sans">
      {/* CABECERA */}
      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Documentos y Planos
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Planos, moodboards de interiorismo, propuestas de paisajismo, modelos 3D y carpetas Drive
            por proyecto
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setDocEditando(null);
            setModalAbierto(true);
          }}
          className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors shadow-[0_0_20px_rgba(234,179,8,0.2)] cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" /> Nuevo documento
        </button>
      </div>

      {/* PANEL DE BÚSQUEDA Y FILTROS */}
      <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-4 mb-6 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar documento por código de lámina (LAM-01), título, obra o categoría..."
              className="w-full bg-[#121212] border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-600"
            />
          </div>

          <select
            value={filtroObra}
            onChange={(e) => setFiltroObra(e.target.value)}
            className="bg-[#121212] border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs font-medium text-gray-200"
          >
            <option value="Todas">Obra: Todas</option>
            {proyectos.map((p) => (
              <option key={p.codigo} value={p.codigo}>
                {p.codigo} · {p.nombre}
              </option>
            ))}
          </select>

          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="bg-[#121212] border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs font-medium text-gray-200 max-w-[220px]"
          >
            <option value="Todas">Categoría: Todas</option>
            {CATEGORIAS_DOCUMENTOS.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <div className="w-px h-6 bg-gray-800 hidden xl:block" />

          <button
            type="button"
            onClick={() => {
              setDocEditando(null);
              setModalAbierto(true);
            }}
            className="bg-[#181818] hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" /> Importar
          </button>

          <button
            type="button"
            onClick={exportarCsv}
            className="bg-[#181818] hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Exportar
          </button>

          <div className="w-px h-6 bg-gray-800 hidden xl:block" />

          <button
            type="button"
            onClick={() => setVistaRestringida(!vistaRestringida)}
            className={`border px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2 cursor-pointer ${
              vistaRestringida
                ? 'bg-[#EAB308]/15 border-[#EAB308]/40 text-[#EAB308]'
                : 'bg-[#181818] hover:bg-gray-800 border-gray-800 text-gray-300 hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" /> Restringir vista
          </button>
        </div>

        <div className="flex items-center gap-2.5 text-xs text-gray-400">
          <Calendar className="w-4 h-4 text-[#EAB308]" />
          <span>Filtrar planos y documentos por fecha:</span>
          <select
            value={filtroPeriodo}
            onChange={(e) => setFiltroPeriodo(e.target.value)}
            className="bg-[#121212] border border-gray-800 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-200"
          >
            <option value="Todos">Período: Todos</option>
            <option value="Este mes">Período: Este mes</option>
            <option value="Este año">Período: Este año</option>
          </select>
        </div>
      </div>

      {/* TABLA / LISTADO DE DOCUMENTOS */}
      <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-5 shadow-xl">
        <h2 className="text-sm font-bold text-white mb-4">
          Documentos y planos ({documentosFiltrados.length})
        </h2>

        {documentosFiltrados.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-400">
            No se encontraron documentos registrados con ese filtro.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  <th className="py-3 px-3">LÁMINA / DOCUMENTO</th>
                  <th className="py-3 px-3">PROYECTO</th>
                  <th className="py-3 px-3">CATEGORÍA / REV.</th>
                  <th className="py-3 px-3">EMISIÓN</th>
                  <th className="py-3 px-3">ESTADO</th>
                  <th className="py-3 px-3 text-right">ARCHIVO / ACCIÓN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/70 text-sm">
                {documentosFiltrados.map((d) => {
                  const esListo =
                    d.estado === 'Listo / Aprobado' || d.estado === 'Entregado / Visado';

                  return (
                    <tr
                      key={d.id}
                      onClick={() => {
                        setDocEditando(d);
                        setModalAbierto(true);
                      }}
                      className="hover:bg-[#202020] transition-colors cursor-pointer"
                    >
                      <td className="py-4 px-3">
                        <div className="flex items-center gap-2">
                          {d.codigo_lamina && (
                            <span className="bg-[#EAB308]/15 border border-[#EAB308]/40 text-[#EAB308] px-2 py-0.5 rounded text-[10px] font-extrabold">
                              {d.codigo_lamina}
                            </span>
                          )}
                          <span className="font-bold text-white text-xs">{d.titulo}</span>
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {d.formato || 'PDF'} {d.escala ? `· Esc. ${d.escala}` : ''}
                        </div>
                      </td>

                      <td className="py-4 px-3 text-xs font-semibold text-gray-200">
                        {d.proyecto_codigo
                          ? `${d.proyecto_codigo} · ${d.proyecto_nombre || ''}`
                          : 'General'}
                      </td>

                      <td className="py-4 px-3 text-xs">
                        <div className="text-gray-200">{d.categoria}</div>
                        <div className="text-[11px] text-gray-400">{d.revision || 'Rev. 01'}</div>
                      </td>

                      <td className="py-4 px-3 text-xs text-gray-300">
                        {formatearFecha(d.fecha_emision)}
                      </td>

                      <td className="py-4 px-3 text-xs">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${
                            esListo
                              ? 'bg-emerald-950/70 border-emerald-700/50 text-emerald-400'
                              : 'bg-amber-950/70 border-amber-700/50 text-[#EAB308]'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              esListo ? 'bg-emerald-400' : 'bg-[#EAB308]'
                            }`}
                          />
                          {d.estado}
                        </span>
                      </td>

                      <td className="py-4 px-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          {d.archivo_url && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setVisorArchivo({
                                  url: d.archivo_url,
                                  titulo: d.codigo_lamina
                                    ? `${d.codigo_lamina} · ${d.titulo}`
                                    : d.titulo,
                                });
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-blue-500/15 border border-blue-500/40 text-blue-400 hover:bg-blue-500/25 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
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
                              className="px-2.5 py-1.5 rounded-lg bg-gray-800 text-gray-200 hover:text-white text-xs font-semibold inline-flex items-center gap-1"
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> Drive
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDocEditando(d);
                              setModalAbierto(true);
                            }}
                            className="px-3 py-1.5 rounded-xl border border-gray-700 hover:bg-gray-800 text-xs font-semibold text-white inline-flex items-center gap-1 cursor-pointer"
                          >
                            Editar <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* VISOR MODAL INTEGRADO */}
      <VisorArchivoModal
        abierto={Boolean(visorArchivo)}
        url={visorArchivo?.url || ''}
        titulo={visorArchivo?.titulo}
        onClose={() => setVisorArchivo(null)}
      />

      {/* MODAL COMPARTIDO */}
      <ModalDocumento
        abierto={modalAbierto}
        onClose={() => {
          setModalAbierto(false);
          setDocEditando(null);
        }}
        onGuardado={(msg) => {
          mostrarToast(msg);
          router.refresh();
        }}
        docEditando={docEditando}
        proyectos={proyectos}
      />

      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#161616] border border-gray-700/80 shadow-2xl rounded-xl px-5 py-3.5 flex items-center gap-3 z-50">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-semibold text-white">{toast}</span>
        </div>
      )}
    </div>
  );
}