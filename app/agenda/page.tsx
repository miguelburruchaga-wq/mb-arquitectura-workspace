import { supabase } from '@/lib/supabase';
import AgendaClient from '@/components/AgendaClient';

export const dynamic = 'force-dynamic';

export default async function PaginaAgenda() {
  const [
    { data: visitas },
    { data: tareas },
    { data: proyectos },
    { data: equipo },
  ] = await Promise.all([
    supabase.from('visitas').select('*').order('fecha', { ascending: true }),
    supabase.from('tareas').select('*').order('fecha_vencimiento', { ascending: true }),
    supabase.from('proyectos').select('id, codigo, nombre, estado, entrega_estimada'),
    supabase.from('equipo').select('*').order('nombre', { ascending: true }),
  ]);

  return (
    <AgendaClient
      visitasIniciales={visitas || []}
      tareasIniciales={tareas || []}
      proyectos={proyectos || []}
      equipo={equipo || []}
    />
  );
}