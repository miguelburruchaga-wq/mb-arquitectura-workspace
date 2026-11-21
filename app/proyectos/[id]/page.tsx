import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { AlertTriangle } from 'lucide-react';
import FichaProyectoClient from '@/components/FichaProyectoClient';

export default async function FichaProyectoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const proyectoCodigo = decodeURIComponent(id);

  const [{ data: proyecto, error }, { data: clientes }] = await Promise.all([
    supabase.from('proyectos').select('*').eq('codigo', proyectoCodigo).limit(1).single(),
    supabase.from('clientes').select('id, codigo, nombre, tipo, estado').order('nombre', { ascending: true }),
  ]);

  if (error || !proyecto) {
    return (
      <div className="min-h-screen bg-[#121212] text-white p-8 flex flex-col items-center justify-center text-center">
        <AlertTriangle className="w-16 h-16 text-[#EAB308] mb-4" />
        <h1 className="text-3xl font-bold text-white mb-2">Proyecto no encontrado</h1>
        <p className="text-gray-400 mb-6">
          No encontramos ningún proyecto con el código <strong>{proyectoCodigo}</strong>.
        </p>
        <Link
          href="/proyectos"
          className="bg-[#1A1A1A] border border-gray-800 hover:bg-gray-800 px-6 py-2.5 rounded-xl font-medium transition-colors"
        >
          Volver a Proyectos
        </Link>
      </div>
    );
  }

  // Traer movimientos del proyecto (por proyecto o por cliente) y visitas del proyecto
  const [{ data: movimientos }, { data: visitas }] = await Promise.all([
    supabase
      .from('movimientos')
      .select('*')
      .or(
        proyecto.cliente_id
          ? `proyecto.ilike.%${proyecto.codigo}%,cliente_id.eq.${proyecto.cliente_id}` : `proyecto.ilike.\%${proyecto.codigo}%`
      )
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('visitas')
      .select('*')
      .eq('proyecto_codigo', proyecto.codigo)
      .order('fecha', { ascending: true })
      .order('horario', { ascending: true }),
  ]);

  return (
    <FichaProyectoClient
      proyecto={proyecto}
      clientes={clientes || []}
      movimientos={movimientos || []}
      visitas={visitas || []}
    />
  );
}