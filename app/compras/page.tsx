import { Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import ComprasClient from '@/components/ComprasClient';

async function ContenidoCompras() {
  const [{ data: compras }, { data: proyectos }, { data: proveedores }] = await Promise.all([
    supabase.from('compras').select('*').order('created_at', { ascending: false }),
    supabase
      .from('proyectos')
      .select('id, codigo, nombre, estado, cliente_id')
      .order('created_at', { ascending: false }),
    supabase
      .from('proveedores')
      .select('id, codigo, nombre, rubro')
      .order('nombre', { ascending: true }),
  ]);

  return (
    <ComprasClient
      comprasIniciales={compras || []}
      proyectos={proyectos || []}
      proveedores={proveedores || []}
    />
  );
}

export default function PaginaCompras() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#121212] text-gray-400 p-8">
          Cargando compras...
        </div>
      }
    >
      <ContenidoCompras />
    </Suspense>
  );
}