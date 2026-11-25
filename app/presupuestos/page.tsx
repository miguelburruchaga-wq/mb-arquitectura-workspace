import { supabase } from '@/lib/supabase';
import PresupuestosClient from '@/components/PresupuestosClient';

export const dynamic = 'force-dynamic';

export default async function PresupuestosPage() {
  const [{ data: presupuestos }, { data: clientes }, { data: equipo }] = await Promise.all([
    supabase.from('presupuestos').select('*').order('created_at', { ascending: false }),
    supabase.from('clientes').select('id, nombre').order('nombre', { ascending: true }),
    supabase.from('equipo').select('id, nombre, rol, foto_url').order('nombre', { ascending: true }),
  ]);

  return (
    <PresupuestosClient
      presupuestosIniciales={presupuestos || []}
      clientes={clientes || []}
      equipo={equipo || []}
    />
  );
}