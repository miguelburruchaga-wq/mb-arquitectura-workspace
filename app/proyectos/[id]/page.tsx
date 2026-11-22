import { Suspense } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { AlertTriangle } from 'lucide-react';
import FichaProyectoClient from '@/components/FichaProyectoClient';

async function ContenidoFichaProyecto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proyectoCodigo = decodeURIComponent(id);

  const { data: proyecto, error } = await supabase
    .from('proyectos')
    .select('*')
    .eq('codigo', proyectoCodigo)
    .limit(1)
    .single();

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

  const etiquetaProyecto = `${proyecto.codigo} · ${proyecto.nombre}`;

  const [
    { data: clientes },
    { data: todosMovimientos },
    { data: visitas },
    { data: tareas },
    { data: compras },
    { data: proveedores },
    { data: equipo },
    { data: documentos },
  ] = await Promise.all([
    supabase
      .from('clientes')
      .select('id, codigo, nombre, tipo, estado')
      .order('nombre', { ascending: true }),
    supabase
      .from('movimientos')
      .select('*')
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('visitas')
      .select('*')
      .eq('proyecto_codigo', proyecto.codigo)
      .order('fecha', { ascending: true }),
    supabase
      .from('tareas')
      .select('*')
      .eq('proyecto_codigo', proyecto.codigo)
      .order('created_at', { ascending: false }),
    supabase
      .from('compras')
      .select('*')
      .eq('proyecto_codigo', proyecto.codigo)
      .order('created_at', { ascending: false }),
    supabase
      .from('proveedores')
      .select('id, codigo, nombre, rubro')
      .order('nombre', { ascending: true }),
    supabase.from('equipo').select('*').order('id', { ascending: true }),
    supabase
      .from('documentos')
      .select('*')
      .eq('proyecto_codigo', proyecto.codigo)
      .order('fecha_emision', { ascending: false })
      .order('created_at', { ascending: false }),
  ]);

  const movimientosProyecto = (todosMovimientos || []).filter((m) => {
    const porProyecto =
      m.proyecto_codigo === proyecto.codigo ||
      m.proyecto === etiquetaProyecto ||
      m.proyecto === proyecto.nombre ||
      m.proyecto === proyecto.codigo;
    const porCliente = proyecto.cliente_id && String(m.cliente_id) === String(proyecto.cliente_id);
    return porProyecto || porCliente;
  });

  return (
    <FichaProyectoClient
      proyecto={proyecto}
      clientes={clientes || []}
      movimientos={movimientosProyecto}
      visitas={visitas || []}
      tareas={tareas || []}
      compras={compras || []}
      proveedores={proveedores || []}
      equipo={equipo || []}
      documentos={documentos || []}
    />
  );
}

export default function FichaProyectoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#121212] text-gray-400 p-8">
          Cargando proyecto...
        </div>
      }
    >
      <ContenidoFichaProyecto params={params} />
    </Suspense>
  );
}