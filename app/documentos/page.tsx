import { Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import DocumentosClient from '@/components/DocumentosClient';

async function ContenidoDocumentos() {
  const [{ data: documentos }, { data: proyectos }] = await Promise.all([
    supabase
      .from('documentos')
      .select('*')
      .order('fecha_emision', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('proyectos')
      .select('id, codigo, nombre, estado')
      .order('created_at', { ascending: false }),
  ]);

  return (
    <DocumentosClient
      documentosIniciales={documentos || []}
      proyectos={proyectos || []}
    />
  );
}

export default function PaginaDocumentos() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#121212] text-gray-400 p-8">
          Cargando documentos y planos...
        </div>
      }
    >
      <ContenidoDocumentos />
    </Suspense>
  );
}