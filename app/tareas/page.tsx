import { Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import TareasClient from '@/components/TareasClient';

async function ContenidoTareas() {
  const [{ data: tareas }, { data: proyectos }, { data: equipo }] = await Promise.all([
    supabase.from('tareas').select('*').order('created_at', { ascending: false }),
    supabase
      .from('proyectos')
      .select('id, codigo, nombre, responsable, estado')
      .order('created_at', { ascending: false }),
    supabase.from('equipo').select('*').order('id', { ascending: true }),
  ]);

  return (
    <TareasClient
      tareasIniciales={tareas || []}
      proyectos={proyectos || []}
      equipo={equipo || []}
    />
  );
}

export default function PaginaTareas() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#121212] text-gray-400 p-8">Cargando tareas...</div>
      }
    >
      <ContenidoTareas />
    </Suspense>
  );
}