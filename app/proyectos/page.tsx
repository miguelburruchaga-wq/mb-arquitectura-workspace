import { supabase } from '@/lib/supabase';
import ProyectosClient from '@/components/ProyectosClient';
export const dynamic = 'force-dynamic';
export const revalidate = 15;

export default async function PaginaProyectos() {
  const [{ data: proyectos }, { data: clientes }] = await Promise.all([
    supabase
      .from('proyectos')
      .select(
        'id, codigo, nombre, cliente_id, cliente_nombre, responsable, tipologia, etapa, estado, moneda, presupuesto, fecha_inicio, entrega_estimada, ubicacion, drive_url, superficie, proxima_visita, notas, portada_url'
      )
      .order('created_at', { ascending: false }),
    supabase
      .from('clientes')
      .select('id, codigo, nombre, tipo, estado')
      .order('nombre', { ascending: true }),
  ]);

  return (
    <ProyectosClient
      proyectosIniciales={proyectos || []}
      clientes={clientes || []}
    />
  );
}