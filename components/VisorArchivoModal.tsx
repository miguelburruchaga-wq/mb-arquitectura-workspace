"use client";

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, ExternalLink, FileText, ZoomIn, ZoomOut } from 'lucide-react';

interface VisorArchivoModalProps {
  abierto: boolean;
  url: string;
  titulo?: string;
  onClose: () => void;
}

export default function VisorArchivoModal({
  abierto,
  url,
  titulo = 'Vista previa de documento',
  onClose,
}: VisorArchivoModalProps) {
  const [montado, setMontado] = useState(false);
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    setMontado(true);
  }, []);

  useEffect(() => {
    setZoom(100);
  }, [url, abierto]);

  if (!abierto || !url || !montado) return null;

  const esImagen =
    /^data:image\//i.test(url) ||
    /\.(png|jpe?g|webp|gif|svg|bmp)(\?.*)?$/i.test(url);

  const descargarArchivo = () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = titulo.replace(/\s+/g, '_');
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-[9999] p-3 md:p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#181818] border border-gray-800 rounded-2xl w-full max-w-5xl h-[90vh] shadow-2xl flex flex-col overflow-hidden"
      >
        {/* BARRA SUPERIOR */}
        <div className="px-5 py-3.5 bg-[#141414] border-b border-gray-800 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileText className="w-4 h-4 text-[#EAB308] flex-shrink-0" />
            <span className="text-sm font-bold text-white truncate">{titulo}</span>
          </div>

          <div className="flex items-center gap-2">
            {esImagen && (
              <>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(50, z - 25))}
                  className="p-2 rounded-lg bg-[#222222] hover:bg-gray-800 text-gray-300 hover:text-white cursor-pointer"
                  title="Alejar"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-gray-300 px-1">{zoom}%</span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(250, z + 25))}
                  className="p-2 rounded-lg bg-[#222222] hover:bg-gray-800 text-gray-300 hover:text-white cursor-pointer"
                  title="Acercar"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={descargarArchivo}
              className="px-3 py-1.5 rounded-lg bg-[#222222] hover:bg-gray-800 border border-gray-700 text-xs font-semibold text-gray-200 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#EAB308]" /> Descargar
            </button>

            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-[#222222] hover:bg-gray-800 border border-gray-700 text-xs font-semibold text-gray-200 inline-flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-400" /> Nueva pestaña
            </a>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-rose-950/60 hover:bg-rose-900/70 text-rose-300 cursor-pointer ml-1"
              title="Cerrar visor"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* CONTENIDO DEL VISOR */}
        <div className="flex-1 bg-[#0F0F0F] overflow-auto flex items-center justify-center p-2">
          {esImagen ? (
            <img
              src={url}
              alt={titulo}
              style={{ width: `${zoom}%` }}
              className="max-w-none h-auto object-contain rounded-lg transition-all"
            />
          ) : (
            <iframe
              src={url}
              title={titulo}
              className="w-full h-full rounded-lg border-0 bg-white"
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}