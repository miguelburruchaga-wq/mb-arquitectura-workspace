import { supabase } from '@/lib/supabase';
import ProyectosClient from '@/components/ProyectosClient';

export default async function PaginaProyectos() {
  const [{ data: proyectos }, { data: clientes }] = await Promise.all([
    supabase.from('proyectos').select('*').order('created_at', { ascending: false }),
    supabase.from('clientes').select('id, codigo, nombre, tipo, estado').order('nombre', { ascending: true }),
  ]);

  return (
    <ProyectosClient
      proyectosIniciales={proyectos || []}
      clientes={clientes || []}
    />
  );
}