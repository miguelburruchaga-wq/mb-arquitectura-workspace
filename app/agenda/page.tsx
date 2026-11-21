import { supabase } from '@/lib/supabase';
import AgendaClient from '@/components/AgendaClient';

export default async function PaginaAgenda() {
  const [{ data: visitas }, { data: proyectos }] = await Promise.all([
    supabase.from('visitas').select('*').order('fecha', { ascending: true }),
    supabase.from('proyectos').select('id, codigo, nombre, estado, entrega_estimada'),
  ]);

  return (
    <AgendaClient
      visitasIniciales={visitas || []}
      proyectos={proyectos || []}
    />
  );
}