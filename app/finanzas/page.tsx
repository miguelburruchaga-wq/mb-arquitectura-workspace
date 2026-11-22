import { Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import FinanzasClient from '@/components/FinanzasClient';

async function ContenidoFinanzas() {
  const [
    { data: movimientos },
    { data: proyectos },
    { data: clientes },
    { data: proveedores },
  ] = await Promise.all([
    supabase
      .from('movimientos')
      .select('*')
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('proyectos')
      .select('id, codigo, nombre, estado, cliente_id')
      .order('created_at', { ascending: false }),
    supabase
      .from('clientes')
      .select('id, codigo, nombre')
      .order('nombre', { ascending: true }),
    supabase
      .from('proveedores')
      .select('id, codigo, nombre, rubro')
      .order('nombre', { ascending: true }),
  ]);

  return (
    <FinanzasClient
      movimientosIniciales={movimientos || []}
      proyectos={proyectos || []}
      clientes={clientes || []}
      proveedores={proveedores || []}
    />
  );
}

export default function PaginaFinanzas() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#121212] text-gray-400 p-8">
          Cargando finanzas...
        </div>
      }
    >
      <ContenidoFinanzas />
    </Suspense>
  );
}