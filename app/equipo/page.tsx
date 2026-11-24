import { Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import EquipoClient from '@/components/EquipoClient';
export const dynamic = 'force-dynamic';
async function ContenidoEquipo() {
  const [{ data: equipo }, { data: proyectos }, { data: tareas }] = await Promise.all([
    supabase.from('equipo').select('*').order('id', { ascending: true }),
    supabase
      .from('proyectos')
      .select('id, codigo, nombre, responsable, equipo_asignado')
      .order('created_at', { ascending: false }),
    supabase.from('tareas').select('id, responsable, estado'),
  ]);

  return (
    <EquipoClient
      equipoInicial={equipo || []}
      proyectos={proyectos || []}
      tareas={tareas || []}
      nombreEstudio="MB Arquitectura SA"
    />
  );
}

export default function PaginaEquipo() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#121212] text-gray-400 p-8">
          Cargando equipo del estudio...
        </div>
      }
    >
      <ContenidoEquipo />
    </Suspense>
  );
}