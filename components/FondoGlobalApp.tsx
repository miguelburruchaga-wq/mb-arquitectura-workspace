"use client";

import { useState, useEffect } from 'react';
import { AparienciaEstudio, PORTADA_DEFAULT } from '@/components/ModalPersonalizarEstudio';
import { usePreferencias } from '@/components/PreferenciasProvider';

const DEFAULT_APARIENCIA: AparienciaEstudio = {
  portadaUrl: PORTADA_DEFAULT,
  logoUrl: '',
  fondoUrl: '',
  desenfoque: 14,
  oscurecimiento: 50,
  rendimiento: 'automatico',
};

export default function FondoGlobalApp() {
  const { modoPantalla } = usePreferencias();
  const [apariencia, setApariencia] = useState<AparienciaEstudio>(DEFAULT_APARIENCIA);
  const [fondoProcesado, setFondoProcesado] = useState<string>('');

  useEffect(() => {
    const leer = () => {
      try {
        const raw = localStorage.getItem('mb_apariencia_estudio');
        if (raw) {
          const parsed = JSON.parse(raw);
          setApariencia(parsed);
          document.documentElement.setAttribute(
            'data-con-fondo',
            parsed.fondoUrl && parsed.rendimiento !== 'liviano' ? 'true' : 'false'
          );
        }
      } catch {
        // Silencioso
      }
    };

    leer();
    window.addEventListener('mb_apariencia_updated', leer);
    window.addEventListener('storage', leer);
    return () => {
      window.removeEventListener('mb_apariencia_updated', leer);
      window.removeEventListener('storage', leer);
    };
  }, []);

  useEffect(() => {
    if (!apariencia.fondoUrl || apariencia.rendimiento === 'liviano') {
      setFondoProcesado('');
      return;
    }

    if (!apariencia.desenfoque || apariencia.desenfoque <= 0) {
      setFondoProcesado(apariencia.fondoUrl);
      return;
    }

    let cancelado = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      if (cancelado) return;
      try {
        const maxAncho = 960;
        const escala = Math.min(1, maxAncho / (img.width || maxAncho));
        const w = Math.max(1, Math.round(img.width * escala));
        const h = Math.max(1, Math.round(img.height * escala));

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setFondoProcesado(apariencia.fondoUrl);
          return;
        }

        const blurAjustado = Math.max(1, Math.round(apariencia.desenfoque * escala));
        ctx.filter = `blur(${blurAjustado}px)`;
        const margen = blurAjustado * 2;
        ctx.drawImage(img, -margen, -margen, w + margen * 2, h + margen * 2);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.78);
        if (!cancelado) setFondoProcesado(dataUrl);
      } catch {
        if (!cancelado) setFondoProcesado(apariencia.fondoUrl);
      }
    };

    img.onerror = () => {
      if (!cancelado) setFondoProcesado(apariencia.fondoUrl);
    };

    img.src = apariencia.fondoUrl;

    return () => {
      cancelado = true;
    };
  }, [apariencia.fondoUrl, apariencia.desenfoque, apariencia.rendimiento]);

  if (!apariencia.fondoUrl || apariencia.rendimiento === 'liviano') return null;

  const usaBlurCssFallback =
    fondoProcesado === apariencia.fondoUrl && apariencia.desenfoque > 0;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 w-screen h-screen pointer-events-none z-0 overflow-hidden select-none"
      style={{ contain: 'strict' }}
    >
      <div
        className="w-full h-full bg-cover bg-center bg-no-repeat will-change-transform"
        style={{
          backgroundImage: `url(${fondoProcesado || apariencia.fondoUrl})`,
          transform: 'translate3d(0, 0, 0) scale(1.04)',
          filter: usaBlurCssFallback ? `blur(${apariencia.desenfoque}px)` : 'none',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundColor:
            modoPantalla === 'claro'
              ? `rgba(243, 244, 246, ${Math.min(0.88, Math.max(0.55, apariencia.oscurecimiento / 100))})`
              : `rgba(18, 18, 18, ${apariencia.oscurecimiento / 100})`,
        }}
      />
    </div>
  );
}