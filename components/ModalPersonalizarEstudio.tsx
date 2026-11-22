"use client";

import { useState, useEffect } from 'react';
import { X, Image as ImageIcon, Upload } from 'lucide-react';

export const PORTADA_DEFAULT =
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80';

export const FONDO_DEFAULT =
  'https://images.unsplash.com/photo-1517581177682-a085bb7ffb15?auto=format&fit=crop&w=1600&q=80';

export const GALERIA_FONDOS = [
  { id: 'sin-foto', nombre: 'Sin foto', url: '' },
  {
    id: 'madera-lino',
    nombre: 'Madera y lino',
    url: 'https://images.unsplash.com/photo-1615873968403-89e068629265?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'plantas-contraluz',
    nombre: 'Plantas al contraluz',
    url: 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'listones-plantas',
    nombre: 'Listones y plantas',
    url: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'sombra-hojas',
    nombre: 'Sombra de hojas',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'hormigon-claro',
    nombre: 'Hormigón claro',
    url: FONDO_DEFAULT,
  },
  {
    id: 'hormigon-calido',
    nombre: 'Hormigón cálido',
    url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'hormigon-oscuro',
    nombre: 'Hormigón oscuro',
    url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'listones-anochecer',
    nombre: 'Listones al anochecer',
    url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'patio-madera',
    nombre: 'Patio de madera',
    url: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'casa-atardecer',
    nombre: 'Casa moderna al atardecer',
    url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
  },
];

export interface AparienciaEstudio {
  portadaUrl: string;
  logoUrl: string;
  fondoUrl: string;
  desenfoque: number;
  oscurecimiento: number;
  rendimiento: 'automatico' | 'liviano' | 'completo';
}

export default function ModalPersonalizarEstudio({
  abierto,
  onClose,
  nombreEstudio,
  subtituloEstudio,
  valoresIniciales,
  onGuardar,
}: {
  abierto: boolean;
  onClose: () => void;
  nombreEstudio: string;
  subtituloEstudio: string;
  valoresIniciales: AparienciaEstudio;
  onGuardar: (nuevosValores: AparienciaEstudio) => void;
}) {
  const [portadaUrl, setPortadaUrl] = useState(valoresIniciales.portadaUrl);
  const [logoUrl, setLogoUrl] = useState(valoresIniciales.logoUrl);
  const [fondoUrl, setFondoUrl] = useState(valoresIniciales.fondoUrl);
  const [desenfoque, setDesenfoque] = useState(valoresIniciales.desenfoque);
  const [oscurecimiento, setOscurecimiento] = useState(valoresIniciales.oscurecimiento);
  const [rendimiento, setRendimiento] = useState<'automatico' | 'liviano' | 'completo'>(
    valoresIniciales.rendimiento
  );

  useEffect(() => {
    if (!abierto) return;
    setPortadaUrl(valoresIniciales.portadaUrl);
    setLogoUrl(valoresIniciales.logoUrl);
    setFondoUrl(valoresIniciales.fondoUrl);
    setDesenfoque(valoresIniciales.desenfoque);
    setOscurecimiento(valoresIniciales.oscurecimiento);
    setRendimiento(valoresIniciales.rendimiento);
  }, [abierto, valoresIniciales]);

  if (!abierto) return null;

  const leerArchivo = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setter(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const guardar = () => {
    onGuardar({
      portadaUrl,
      logoUrl,
      fondoUrl,
      desenfoque,
      oscurecimiento,
      rendimiento,
    });
    onClose();
  };
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#141414] border border-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* CABECERA */}
        <div className="px-6 py-5 border-b border-gray-800/80 flex justify-between items-start">
          <div className="flex items-start gap-3">
            <ImageIcon className="w-5 h-5 text-[#EAB308] mt-0.5 flex-shrink-0" />
            <div>
              <h2 className="text-base font-extrabold text-white">
                Portada, Logo y Fondo del Estudio
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Adjuntá un archivo o pegá un enlace para la portada, el logo y la foto de fondo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENIDO CON SCROLL */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* VISTA PREVIA DE PORTADA Y LOGO */}
          <div
            className="relative rounded-2xl overflow-hidden border border-gray-800 h-36 flex items-end p-5 bg-cover bg-center"
            style={{
              backgroundImage: portadaUrl
                ? `url(${portadaUrl})`
                : 'linear-gradient(135deg, #27272a 0%, #18181b 100%)',
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-transparent" />
            <div className="relative z-10 flex items-center gap-3.5">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="w-12 h-12 rounded-full object-cover bg-white border-2 border-[#EAB308] shadow-lg"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-white text-black font-black text-base flex items-center justify-center border-2 border-[#EAB308] shadow-lg">
                  MB
                </div>
              )}
              <div>
                <div className="text-[10px] font-extrabold tracking-widest uppercase text-[#EAB308]">
                  {subtituloEstudio}
                </div>
                <div className="text-lg font-extrabold text-white leading-tight">
                  {nombreEstudio}
                </div>
              </div>
            </div>
          </div>

          {/* 1. IMAGEN DE PORTADA PRINCIPAL */}
          <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-center gap-2">
              <span className="text-xs font-bold text-white">1. Imagen de Portada Principal</span>
              <button
                type="button"
                onClick={() => setPortadaUrl(PORTADA_DEFAULT)}
                className="text-xs font-semibold text-[#EAB308] hover:underline cursor-pointer"
              >
                Restaurar imagen predeterminada
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="border border-dashed border-gray-700 hover:border-[#EAB308] bg-[#141414] rounded-xl px-4 py-2.5 text-xs font-bold text-[#EAB308] flex items-center justify-center gap-2 cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5" /> Adjuntar imagen de portada...
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => leerArchivo(e, setPortadaUrl)}
                  className="hidden"
                />
              </label>

              <input
                type="text"
                value={portadaUrl}
                onChange={(e) => setPortadaUrl(e.target.value)}
                placeholder="https://..."
                className="bg-[#141414] border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500"
              />
            </div>
          </div>

          {/* 2. LOGO DEL ESTUDIO (OPCIONAL) */}
          <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-center gap-2">
              <span className="text-xs font-bold text-white">2. Logo del Estudio (Opcional)</span>
              <button
                type="button"
                onClick={() => setLogoUrl('')}
                className="text-xs font-semibold text-rose-400 hover:underline cursor-pointer"
              >
                Quitar logo
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="border border-dashed border-gray-700 hover:border-[#EAB308] bg-[#141414] rounded-xl px-4 py-2.5 text-xs font-bold text-[#EAB308] flex items-center justify-center gap-2 cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5" /> Subir archivo de logo...
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => leerArchivo(e, setLogoUrl)}
                  className="hidden"
                />
              </label>

              <input
                type="text"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="Pegar enlace o subir imagen..."
                className="bg-[#141414] border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500"
              />
            </div>
          </div>

          {/* 3. FONDO DE LA APLICACIÓN */}
          <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-4 space-y-4">
            <div className="flex justify-between items-center gap-2">
              <span className="text-xs font-bold text-white">3. Fondo de la Aplicación</span>
              <div className="flex items-center gap-3 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setFondoUrl(FONDO_DEFAULT);
                    setDesenfoque(14);
                    setOscurecimiento(50);
                  }}
                  className="text-[#EAB308] hover:underline cursor-pointer"
                >
                  Restaurar predeterminado
                </button>
                <button
                  type="button"
                  onClick={() => setFondoUrl('')}
                  className="text-rose-400 hover:underline cursor-pointer"
                >
                  Quitar foto
                </button>
              </div>
            </div>

            {/* Vista previa del fondo con desenfoque y oscurecimiento */}
            <div className="relative h-28 rounded-xl overflow-hidden border border-gray-800 bg-[#262626]">
              {fondoUrl && (
                <div
                  className="absolute inset-0 bg-cover bg-center scale-110 transition-all"
                  style={{
                    backgroundImage: `url(${fondoUrl})`,
                    filter: rendimiento === 'liviano' ? 'none' : `blur(${desenfoque}px)`,
                  }}
                />
              )}
              <div
                className="absolute inset-0 transition-all"
                style={{ backgroundColor: `rgba(0, 0, 0, ${oscurecimiento / 100})` }}
              />
            </div>

            {/* Galería de fondos */}
            <div>
              <div className="text-xs text-gray-300 font-semibold mb-2.5">
                Galería de fondos (tocá uno para elegirlo)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {GALERIA_FONDOS.map((item) => {
                  const seleccionado = fondoUrl === item.url;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFondoUrl(item.url)}
                      className={`relative h-16 rounded-xl overflow-hidden border-2 text-left transition-all cursor-pointer ${
                        seleccionado
                          ? 'border-[#EAB308] shadow-[0_0_12px_rgba(234,179,8,0.3)]'
                          : 'border-gray-800 hover:border-gray-600'
                      }`}
                    >
                      {item.url ? (
                        <>
                          <div
                            className="absolute inset-0 bg-cover bg-center"
                            style={{ backgroundImage: `url(${item.url})` }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                          <span className="absolute bottom-1.5 left-2 right-2 text-[10px] font-bold text-white leading-tight truncate">
                            {item.nombre}
                          </span>
                        </>
                      ) : (
                        <div className="w-full h-full bg-[#242420] flex items-center justify-center text-[11px] font-bold text-white">
                          {item.nombre}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-gray-400 mt-2">
                Madera y plantas · Hormigón y luz · Exteriores modernos. También podés subir tu
                propia foto o pegar un enlace.
              </p>
            </div>

            {/* Subir fondo propio */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="border border-dashed border-gray-700 hover:border-[#EAB308] bg-[#141414] rounded-xl px-4 py-2.5 text-xs font-bold text-[#EAB308] flex items-center justify-center gap-2 cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5" /> Subir foto de fondo...
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => leerArchivo(e, setFondoUrl)}
                  className="hidden"
                />
              </label>

              <input
                type="text"
                value={fondoUrl}
                onChange={(e) => setFondoUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="bg-[#141414] border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500"
              />
            </div>

            {/* Sliders de Desenfoque y Oscurecimiento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-300 font-semibold">Desenfoque</span>
                  <span className="text-gray-400 font-bold">{desenfoque}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={30}
                  value={desenfoque}
                  onChange={(e) => setDesenfoque(Number(e.target.value))}
                  className="w-full accent-[#EAB308] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-300 font-semibold">Oscurecimiento (legibilidad)</span>
                  <span className="text-gray-400 font-bold">{oscurecimiento}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={90}
                  value={oscurecimiento}
                  onChange={(e) => setOscurecimiento(Number(e.target.value))}
                  className="w-full accent-[#EAB308] cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* 4. RENDIMIENTO EN ESTE EQUIPO */}
          <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-4 space-y-3">
            <div>
              <div className="text-xs font-bold text-white">4. Rendimiento en este equipo</div>
              <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                El modo liviano quita el desenfoque del vidrio y la foto de fondo para que la app
                ande rápido en computadoras o celulares lentos. Todo funciona igual.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                { id: 'automatico', titulo: 'Automático', sub: 'Recomendado' },
                { id: 'liviano', titulo: 'Liviano', sub: 'Más rápido' },
                { id: 'completo', titulo: 'Completo', sub: 'Con vidrio y foto' },
              ].map((op) => {
                const activo = rendimiento === op.id;
                return (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => setRendimiento(op.id as any)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      activo
                        ? 'bg-[#EAB308]/10 border-[#EAB308]'
                        : 'bg-[#141414] border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <div className="text-xs font-bold text-white">{op.titulo}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{op.sub}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* PIE FIJO */}
        <div className="px-6 py-4 bg-[#101010] border-t border-gray-800 flex justify-end items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-700 hover:bg-gray-800 text-xs font-semibold text-gray-200 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={guardar}
            className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-5 py-2 rounded-xl text-xs font-bold cursor-pointer"
          >
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}