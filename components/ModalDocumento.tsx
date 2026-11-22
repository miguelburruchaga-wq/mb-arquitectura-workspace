"use client";

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Upload, ChevronDown, Trash2, Loader2 } from 'lucide-react';

export const CATEGORIAS_DOCUMENTOS = [
  'Planos Municipales',
  'Proyecto Ejecutivo',
  'Anteproyecto y Diseño',
  'Estructuras',
  'Instalaciones (Eléctrica / Sanitaria / Gas)',
  'Moodboard / Interiorismo',
  'Paisajismo',
  'Modelo 3D / Renders',
  'Cómputo y Presupuesto',
  'Documentación Legal / Contratos',
  'Otros Documentos',
];

export default function ModalDocumento({
  abierto,
  onClose,
  onGuardado,
  docEditando = null,
  proyectos = [],
  proyectoFijoCodigo = '',
}: {
  abierto: boolean;
  onClose: () => void;
  onGuardado: (mensaje: string) => void;
  docEditando?: any | null;
  proyectos?: any[];
  proyectoFijoCodigo?: string;
}) {
  const [cargando, setCargando] = useState(false);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const [dropdownProyAbierto, setDropdownProyAbierto] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [proyectoCodigo, setProyectoCodigo] = useState(proyectoFijoCodigo);
  const [codigoLamina, setCodigoLamina] = useState('ARQ-PE-01');
  const [titulo, setTitulo] = useState('');
  const [categoria, setCategoria] = useState(CATEGORIAS_DOCUMENTOS[0]);
  const [formato, setFormato] = useState('PDF');
  const [escala, setEscala] = useState('1:50');
  const [revision, setRevision] = useState('Rev. 01');
  const [fechaEmision, setFechaEmision] = useState(() => new Date().toISOString().split('T')[0]);
  const [estado, setEstado] = useState('En Desarrollo / Borrador');
  const [archivoUrl, setArchivoUrl] = useState('');
  const [archivoNombre, setArchivoNombre] = useState('');
  const [enlaceExterno, setEnlaceExterno] = useState('');
  const [enlaceNombre, setEnlaceNombre] = useState('');
  const [observaciones, setObservaciones] = useState('');

  useEffect(() => {
    if (!abierto) return;
    const hoy = new Date().toISOString().split('T')[0];

    if (docEditando) {
      setProyectoCodigo(docEditando.proyecto_codigo || proyectoFijoCodigo || '');
      setCodigoLamina(docEditando.codigo_lamina || '');
      setTitulo(docEditando.titulo || '');
      setCategoria(docEditando.categoria || CATEGORIAS_DOCUMENTOS[0]);
      setFormato(docEditando.formato || 'PDF');
      setEscala(docEditando.escala || '1:50');
      setRevision(docEditando.revision || 'Rev. 01');
      setFechaEmision(docEditando.fecha_emision || hoy);
      setEstado(docEditando.estado || 'En Desarrollo / Borrador');
      setArchivoUrl(docEditando.archivo_url || '');
      setArchivoNombre(docEditando.archivo_nombre || '');
      setEnlaceExterno(docEditando.enlace_externo || '');
      setEnlaceNombre(docEditando.enlace_nombre || '');
      setObservaciones(docEditando.observaciones || '');
    } else {
      setProyectoCodigo(proyectoFijoCodigo || proyectos[0]?.codigo || '');
      setCodigoLamina('ARQ-PE-01');
      setTitulo('');
      setCategoria(CATEGORIAS_DOCUMENTOS[0]);
      setFormato('PDF');
      setEscala('1:50');
      setRevision('Rev. 01');
      setFechaEmision(hoy);
      setEstado('En Desarrollo / Borrador');
      setArchivoUrl('');
      setArchivoNombre('');
      setEnlaceExterno('');
      setEnlaceNombre('');
      setObservaciones('');
    }
    setDropdownProyAbierto(false);
  }, [abierto, docEditando, proyectoFijoCodigo]);

  useEffect(() => {
    const clickAfuera = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownProyAbierto(false);
      }
    };
    document.addEventListener('mousedown', clickAfuera);
    return () => document.removeEventListener('mousedown', clickAfuera);
  }, []);

  if (!abierto) return null;

  const proyectoSeleccionado = proyectos.find((p) => p.codigo === proyectoCodigo);

  const manejarAdjunto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setSubiendoArchivo(true);
    setArchivoNombre(archivo.name);

    const ext = archivo.name.split('.').pop()?.toUpperCase();
    if (ext && ext.length <= 5) setFormato(ext);

    try {
      const ruta = `documentos/${Date.now()}_${archivo.name.replace(/\s+/g, '_')}`;
      const { error: upErr } = await supabase.storage
        .from('comprobantes')
        .upload(ruta, archivo, { upsert: true });

      if (!upErr) {
        const { data: pub } = supabase.storage.from('comprobantes').getPublicUrl(ruta);
        setArchivoUrl(pub.publicUrl);
      } else {
        const reader = new FileReader();
        reader.onload = () => setArchivoUrl(String(reader.result || ''));
        reader.readAsDataURL(archivo);
      }
    } catch {
      const reader = new FileReader();
      reader.onload = () => setArchivoUrl(String(reader.result || ''));
      reader.readAsDataURL(archivo);
    } finally {
      setSubiendoArchivo(false);
    }
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

  const guardarDocumento = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);

    const proy = proyectos.find((p) => p.codigo === proyectoCodigo);

    const datos = {
      proyecto_codigo: proy?.codigo || proyectoCodigo || null,
      proyecto_nombre: proy?.nombre || null,
      codigo_lamina: codigoLamina.trim() || null,
      titulo: titulo.trim(),
      categoria,
      formato: formato.trim() || 'PDF',
      escala: escala.trim() || null,
      revision: revision.trim() || 'Rev. 01',
      fecha_emision: fechaEmision || null,
      estado,
      archivo_url: archivoUrl || null,
      archivo_nombre: archivoNombre || null,
      enlace_externo: enlaceExterno.trim() || null,
      enlace_nombre: enlaceNombre.trim() || null,
      observaciones: observaciones.trim() || null,
    };

    const { error } = docEditando
      ? await supabase.from('documentos').update(datos).eq('id', docEditando.id)
      : await supabase.from('documentos').insert([datos]);

    setCargando(false);

    if (!error) {
      onClose();
      onGuardado(
        docEditando
          ? 'Documento actualizado'
          : proy
          ? `Documento guardado en ${proy.nombre}`
          : 'Documento registrado correctamente'
      );
    } else {
      alert('Error al guardar documento: ' + error.message);
    }
  };

  const eliminarDocumento = async () => {
    if (!docEditando) return;
    setCargando(true);
    const { error } = await supabase.from('documentos').delete().eq('id', docEditando.id);
    setCargando(false);

    if (!error) {
      onClose();
      onGuardado('Documento eliminado');
    } else {
      alert('Error al eliminar documento: ' + error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800 w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* CABECERA */}
        <div className="px-6 pt-6 pb-4 flex justify-between items-start border-b border-gray-800/80">
          <div>
            <h2 className="text-lg font-bold text-white">
              {docEditando ? 'Editar Plano / Documento' : 'Registrar Plano / Documento'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Índice de láminas, propuestas, modelos 3D, archivos y enlaces de Google Drive
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={guardarDocumento} className="px-6 py-5 overflow-y-auto space-y-4">
          {/* FILA 1: Corresponde al Proyecto / Obra * + Código Lámina */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div ref={dropdownRef} className="md:col-span-2 relative">
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Corresponde al Proyecto / Obra <span className="text-[#EAB308]">*</span>
              </label>
              <button
                type="button"
                onClick={() => setDropdownProyAbierto(!dropdownProyAbierto)}
                className="w-full bg-[#121212] border border-gray-700/80 hover:border-gray-600 rounded-xl px-3 py-2.5 flex items-center justify-between text-left cursor-pointer transition-colors"
              >
                <div className="flex flex-wrap items-center gap-2">
                  {proyectoSeleccionado ? (
                    <>
                      <span className="bg-[#EAB308]/15 border border-[#EAB308]/40 text-[#EAB308] px-2 py-0.5 rounded-md text-[11px] font-extrabold">
                        {proyectoSeleccionado.codigo}
                      </span>
                      <span className="text-xs font-bold text-white">
                        {proyectoSeleccionado.nombre}
                      </span>
                      {proyectoSeleccionado.estado && (
                        <span className="bg-cyan-950/70 border border-cyan-700/50 text-cyan-300 px-2 py-0.5 rounded-md text-[10px] font-semibold">
                          {proyectoSeleccionado.estado}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-gray-400">General (Sin proyecto)</span>
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
                    General (Sin proyecto)
                  </button>
                  {proyectos.map((p) => (
                    <button
                      key={p.codigo}
                      type="button"
                      onClick={() => {
                        setProyectoCodigo(p.codigo);
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

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Código Lámina
              </label>
              <input
                type="text"
                value={codigoLamina}
                onChange={(e) => setCodigoLamina(e.target.value)}
                placeholder="ARQ-PE-01"
                className="w-full bg-[#121212] border border-gray-700/80 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500"
              />
            </div>
          </div>

          {/* FILA 2: Título de la Lámina, Carpeta o Documento * */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Título de la Lámina, Carpeta o Documento <span className="text-[#EAB308]">*</span>
            </label>
            <input
              type="text"
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej. Planta Baja, Moodboard de Interiores o Carpeta Ejecutiva"
              className="w-full bg-[#121212] border border-gray-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500"
            />
          </div>

          {/* FILA 3: Categoría + Formato + Escala + Revisión */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Categoría</label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full bg-[#121212] border border-gray-700/80 rounded-xl px-3 py-2.5 text-xs text-white"
              >
                {CATEGORIAS_DOCUMENTOS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Formato</label>
              <input
                type="text"
                value={formato}
                onChange={(e) => setFormato(e.target.value)}
                placeholder="PDF"
                className="w-full bg-[#121212] border border-gray-700/80 rounded-xl px-3 py-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Escala</label>
              <input
                type="text"
                value={escala}
                onChange={(e) => setEscala(e.target.value)}
                placeholder="1:50"
                className="w-full bg-[#121212] border border-gray-700/80 rounded-xl px-3 py-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Revisión</label>
              <input
                type="text"
                value={revision}
                onChange={(e) => setRevision(e.target.value)}
                placeholder="Rev. 01"
                className="w-full bg-[#121212] border border-gray-700/80 rounded-xl px-3 py-2.5 text-xs text-white"
              />
            </div>
          </div>

          {/* FILA 4: Fecha de Emisión + Estado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Fecha de Emisión
              </label>
              <input
                type="date"
                value={fechaEmision}
                onChange={(e) => setFechaEmision(e.target.value)}
                className="w-full bg-[#121212] border border-gray-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white [color-scheme:dark]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Estado</label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full bg-[#121212] border border-gray-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white"
              >
                <option value="En Desarrollo / Borrador">En Desarrollo / Borrador</option>
                <option value="En Revisión">En Revisión</option>
                <option value="Listo / Aprobado">Listo / Aprobado</option>
                <option value="Entregado / Visado">Entregado / Visado</option>
              </select>
            </div>
          </div>

          {/* ARCHIVO ADJUNTO O ENLACE DIRECTO (DRIVE / NUBE) */}
          <div className="bg-[#141414] border border-gray-800 rounded-xl p-4 space-y-3">
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-1.5">
                📎 Archivo Adjunto o Enlace Directo (Drive / Nube)
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Subí un archivo desde tu dispositivo o pegá abajo un enlace externo (Google Drive,
                Dropbox, Nube).
              </p>
            </div>

            <label className="border border-dashed border-gray-700 hover:border-[#EAB308]/60 bg-[#121212] rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-colors">
              {subiendoArchivo ? (
                <div className="flex items-center gap-2 text-xs text-[#EAB308] font-bold">
                  <Loader2 className="w-4 h-4 animate-spin" /> Subiendo archivo...
                </div>
              ) : (
                <>
                  <Upload className="w-5 h-5 text-[#EAB308] mb-2" />
                  <div className="text-sm font-bold text-[#EAB308]">
                    {archivoNombre
                      ? `Adjunto: ${archivoNombre}`
                      : 'Hacé clic aquí para adjuntar un archivo (PDF, imagen, plano, planilla)'}
                  </div>
                  <div className="text-xs text-gray-400 mt-1 max-w-md">
                    Las fotos se optimizan solas. Para archivos pesados (+450 KB), pegá el enlace de
                    Google Drive abajo.
                  </div>
                </>
              )}
              <input
                type="file"
                accept=".pdf,image/*,.xls,.xlsx,.dwg,.dxf,.skp,.rvt"
                onChange={manejarAdjunto}
                className="hidden"
              />
            </label>

            {archivoNombre && (
              <div className="flex items-center justify-between bg-[#1A1A1A] border border-gray-800 rounded-lg px-3 py-2 text-xs">
                <span className="truncate text-gray-200">{archivoNombre}</span>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {archivoUrl && (
                    <button
                      type="button"
                      onClick={() => abrirArchivoAdjunto(archivoUrl)}
                      className="text-blue-400 hover:underline font-semibold cursor-pointer"
                    >
                      Ver archivo
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setArchivoUrl('');
                      setArchivoNombre('');
                    }}
                    className="text-rose-400 hover:underline font-semibold cursor-pointer"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2 pt-1">
              <div className="text-xs text-gray-300 font-medium flex items-center gap-1.5">
                🔗 O pegar enlace externo (Google Drive, Dropbox, OneDrive):
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={enlaceExterno}
                  onChange={(e) => setEnlaceExterno(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="md:col-span-2 bg-[#121212] border border-gray-800 rounded-lg px-3 py-2.5 text-xs text-white placeholder-gray-500"
                />
                <input
                  type="text"
                  value={enlaceNombre}
                  onChange={(e) => setEnlaceNombre(e.target.value)}
                  placeholder="Nombre visible (opcional)"
                  className="bg-[#121212] border border-gray-800 rounded-lg px-3 py-2.5 text-xs text-white placeholder-gray-500"
                />
              </div>
            </div>
          </div>

          {/* OBSERVACIONES TÉCNICAS */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Observaciones Técnicas
            </label>
            <textarea
              rows={3}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Notas de versión, visado o aclaraciones para el equipo..."
              className="w-full bg-[#121212] border border-gray-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 resize-none"
            />
          </div>

          {/* PIE */}
          <div className="flex justify-between items-center pt-3 border-t border-gray-800/80">
            <div>
              {docEditando && (
                <button
                  type="button"
                  onClick={eliminarDocumento}
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
                {cargando
                  ? 'Guardando...'
                  : docEditando
                  ? 'Guardar Cambios'
                  : 'Guardar Documento'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}