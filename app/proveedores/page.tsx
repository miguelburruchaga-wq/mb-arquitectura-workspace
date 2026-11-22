import { Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import ProveedoresClient from '@/components/ProveedoresClient';

async function ListaProveedores() {
  const { data: proveedores } = await supabase
    .from('proveedores')
    .select('*')
    .order('codigo', { ascending: true });

  return <ProveedoresClient proveedoresIniciales={proveedores || []} />;
}

export default function PaginaProveedores() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#121212] text-gray-400 p-8">Cargando proveedores...</div>}>
      <ListaProveedores />
    </Suspense>
  );
}