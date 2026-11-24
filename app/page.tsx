import { Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import DashboardClient from '@/components/DashboardClient';
export const dynamic = 'force-dynamic';
async function ContenidoDashboard() {
  const [
    { data: proyectos },
    { data: tareas },
    { data: movimientos },
    { data: visitas },
    { data: clientes },
    { data: equipo },
  ] = await Promise.all([
    supabase.from('proyectos').select('*').order('created_at', { ascending: false }),
    supabase.from('tareas').select('*').order('created_at', { ascending: false }),
    supabase.from('movimientos').select('*').order('fecha', { ascending: false }),
    supabase.from('visitas').select('*').order('fecha', { ascending: true }),
    supabase.from('clientes').select('id, nombre').order('nombre', { ascending: true }),
    supabase.from('equipo').select('*').order('id', { ascending: true }),
  ]);

  return (
    <DashboardClient
      proyectos={proyectos || []}
      tareas={tareas || []}
      movimientos={movimientos || []}
      visitas={visitas || []}
      clientes={clientes || []}
      equipo={equipo || []}
    />
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#121212] text-gray-400 p-8">
          Cargando panel de control...
        </div>
      }
    >
      <ContenidoDashboard />
    </Suspense>
  );
}