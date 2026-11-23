"use client";

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { ItemPapelera } from '@/lib/papelera';
import { RotateCcw, Trash2, AlertTriangle, CheckCircle2, X } from 'lucide-react';

export default function PapeleraPage() {
  const [items, setItems] = useState<ItemPapelera[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [montado, setMontado] = useState(false);

  // Modal de confirmación oscuro
  const [confirmacion, setConfirmacion] = useState<
    | { tipo: 'individual'; item: ItemPapelera }
    | { tipo: 'vaciar' }
    | null
  >(null);

  const [toast, setToast] = useState<string | null>(null);

  const mostrarToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    setMontado(true);
  }, []);

  const cargarPapelera = async () => {
    setCargando(true);
    const { data, error } = await supabase
      .from('papelera')
      .select('*')
      .order('eliminado_en', { ascending: false });

    if (!error && data) {
      setItems(data as ItemPapelera[]);
    }
    setCargando(false);
  };

  useEffect(() => {
    cargarPapelera();
  }, []);

  const notificarSidebar = () => {
    window.dispatchEvent(new Event('mb_papelera_updated'));
  };

  const restaurarItem = async (item: ItemPapelera) => {
    setProcesandoId(item.id);
    try {
      const { error: restoreError } = await supabase
        .from(item.tabla)
        .insert([item.datos]);

      if (restoreError) {
        alert('No se pudo restaurar el registro: ' + restoreError.message);
        return;
      }

      await supabase.from('papelera').delete().eq('id', item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      notificarSidebar();
      mostrarToast(`"${item.titulo}" restaurado correctamente`);
    } finally {
      setProcesandoId(null);
    }
  };

  const confirmarAccion = async () => {
    if (!confirmacion) return;

    if (confirmacion.tipo === 'individual') {
      const id = confirmacion.item.id;
      setConfirmacion(null);
      setProcesandoId(id);
      try {
        await supabase.from('papelera').delete().eq('id', id);
        setItems((prev) => prev.filter((i) => i.id !== id));
        notificarSidebar();
        mostrarToast('Registro eliminado definitivamente');
      } finally {
        setProcesandoId(null);
      }
    } else if (confirmacion.tipo === 'vaciar') {
      setConfirmacion(null);
      setProcesandoId('vaciar-todo');
      try {
        await supabase
          .from('papelera')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        setItems([]);
        notificarSidebar();
        mostrarToast('Papelera vaciada por completo');
      } finally {
        setProcesandoId(null);
      }
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="rounded-3xl bg-[#181A1C]/90 backdrop-blur-md border border-white/10 p-6 shadow-2xl">
        {/* ENCABEZADO */}
        <div className="flex items-start justify-between gap-4 pb-5 border-b border-white/10">
          <div>
            <span className="inline-block px-3 py-1 rounded-full bg-rose-950/80 border border-rose-800/50 text-rose-300 text-[10px] font-extrabold tracking-widest uppercase mb-2">
              Seguridad ante borrados accidentales
            </span>
            <h1 className="text-2xl font-extrabold text-white">
              Papelera de Recuperación ({items.length})
            </h1>
          </div>

          {items.length > 0 && (
            <button
              type="button"
              disabled={procesandoId === 'vaciar-todo'}
              onClick={() => setConfirmacion({ tipo: 'vaciar' })}
              className="text-sm font-bold text-rose-400 hover:text-rose-300 transition-colors cursor-pointer mt-2 disabled:opacity-50"
            >
              Vaciar papelera
            </button>
          )}
        </div>

        {/* LISTADO */}
        <div className="divide-y divide-white/10 mt-2">
          {cargando ? (
            <p className="py-10 text-center text-sm text-gray-400">Cargando papelera...</p>
          ) : items.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">
              La papelera está vacía. Los registros que elimines aparecerán aquí.
            </p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 mb-1">
                    <span className="px-2.5 py-0.5 rounded-md bg-white/10 text-gray-200 text-xs font-bold">
                      {item.modulo}
                    </span>
                    <span className="text-xs text-gray-400">
                      Eliminado: {new Date(item.eliminado_en).toISOString().split('T')[0]}
                    </span>
                  </div>
                  <div className="text-base font-bold text-white truncate">
                    {item.titulo}
                  </div>
                  {item.subtitulo && (
                    <div className="text-sm text-gray-400 truncate mt-0.5">
                      {item.subtitulo}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2.5 flex-shrink-0">
                  <button
                    type="button"
                    disabled={procesandoId === item.id}
                    onClick={() => restaurarItem(item)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Restaurar
                  </button>

                  <button
                    type="button"
                    disabled={procesandoId === item.id}
                    onClick={() => setConfirmacion({ tipo: 'individual', item })}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/60 text-rose-400 text-sm font-bold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Eliminar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL OSCURO DE CONFIRMACIÓN DEFINITIVA */}
      {confirmacion &&
        montado &&
        createPortal(
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
            <div className="bg-[#1A1A1A] border border-rose-900/40 rounded-2xl w-full max-w-md shadow-2xl p-6 relative text-center">
              <button
                type="button"
                onClick={() => setConfirmacion(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-14 h-14 rounded-full bg-rose-950/70 border border-rose-800/50 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-7 h-7 text-rose-500" />
              </div>

              <h2 className="text-xl font-extrabold text-white mb-2">
                {confirmacion.tipo === 'vaciar'
                  ? `¿Vaciar toda la papelera (${items.length})?`
                  : '¿Eliminar definitivamente?'}
              </h2>

              <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                {confirmacion.tipo === 'vaciar' ? (
                  'Se borrarán todos los registros de la papelera de forma permanente. Esta acción no se puede deshacer.'
                ) : (
                  <>
                    Estás por eliminar definitivamente{' '}
                    <strong className="text-white">"{confirmacion.item.titulo}"</strong>. Esta
                    acción no se puede deshacer.
                  </>
                )}
              </p>

              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmacion(null)}
                  className="px-5 py-2.5 rounded-xl bg-[#121212] border border-gray-700 hover:bg-gray-800 text-sm font-semibold text-gray-300 hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmarAccion}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-sm font-bold text-white shadow-lg transition-colors cursor-pointer"
                >
                  {confirmacion.tipo === 'vaciar'
                    ? 'Sí, vaciar todo'
                    : 'Sí, eliminar definitivo'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* TOAST DE CONFIRMACIÓN */}
      {toast &&
        montado &&
        createPortal(
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#161616] border border-gray-700/80 shadow-2xl rounded-xl px-5 py-3.5 flex items-center gap-3 z-[9999]">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-semibold text-white">{toast}</span>
          </div>,
          document.body
        )}
    </div>
  );
}