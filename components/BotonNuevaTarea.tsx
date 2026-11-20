"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function BotonNuevaTarea() {
  const [abierto, setAbierto] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [cargando, setCargando] = useState(false);
  const router = useRouter();

  const guardarTarea = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);

    // Conectamos con la tabla nueva
    const { error } = await supabase
      .from('tareas_nueva')
      .insert([
        { titulo: titulo }
      ]);

    setCargando(false);
    
    if (!error) {
      setAbierto(false); 
      setTitulo(''); 
      router.refresh(); 
    } else {
      alert("Error al guardar: " + error.message);
    }
  };

  return (
    <>
      <button 
        onClick={() => setAbierto(true)}
        className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-md font-semibold transition-colors"
      >
        + Nueva Tarea
      </button>

      {abierto && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-[#1A1A1A] p-6 rounded-xl border border-gray-800 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4 text-orange-500">Crear Nueva Tarea</h2>
            
            <form onSubmit={guardarTarea} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Título o Descripción</label>
                <input 
                  type="text" 
                  required
                  autoFocus
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="w-full bg-[#121212] border border-gray-700 rounded-md px-3 py-2.5 text-white focus:outline-none focus:border-orange-500 transition-colors"
                  placeholder="Ej: Modificar plano de planta alta..."
                />
              </div>
              
              <div className="flex justify-end gap-3 mt-8">
                <button 
                  type="button" 
                  onClick={() => setAbierto(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={cargando}
                  className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-md font-semibold disabled:opacity-50 transition-colors"
                >
                  {cargando ? 'Guardando...' : 'Guardar Tarea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}