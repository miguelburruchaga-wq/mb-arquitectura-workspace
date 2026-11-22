"use client";

import { useState, useEffect } from 'react';
import { AparienciaEstudio, PORTADA_DEFAULT } from '@/components/ModalPersonalizarEstudio';

const DEFAULT_APARIENCIA: AparienciaEstudio = {
  portadaUrl: PORTADA_DEFAULT,
  logoUrl: '',
  fondoUrl: '',
  desenfoque: 14,
  oscurecimiento: 50,
  rendimiento: 'automatico',
};

export default function FondoGlobalApp() {
  const [apariencia, setApariencia] = useState<AparienciaEstudio>(DEFAULT_APARIENCIA);

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

  if (!apariencia.fondoUrl || apariencia.rendimiento === 'liviano') return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center scale-105 transition-all"
        style={{
          backgroundImage: `url(${apariencia.fondoUrl})`,
          filter: `blur(${apariencia.desenfoque}px)`,
        }}
      />
      <div
        className="absolute inset-0 transition-all"
        style={{
          backgroundColor: `rgba(18, 18, 18, ${apariencia.oscurecimiento / 100})`,
        }}
      />
    </div>
  );
}