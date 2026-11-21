import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import BotoneraFichaCliente from '@/components/BotoneraFichaCliente';
import PestanasFichaCliente from '@/components/PestanasFichaCliente';

export default async function FichaCliente({ params }: { params: Promise<{ id: string }> }) {
  const parametros = await params;
  const clienteId = parametros.id;

  const { data: cliente, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('codigo', clienteId)
    .limit(1)
    .single();

  if (error || !cliente) {
    return (
      <div className="min-h-screen bg-[#121212] text-white p-8 flex flex-col items-center justify-center text-center">
        <AlertTriangle className="w-16 h-16 text-[#EAB308] mb-4" />
        <h1 className="text-3xl font-bold text-white mb-2">Cliente no encontrado</h1>
        <p className="text-gray-400 mb-6">
          Intentamos buscar el código <strong>{clienteId}</strong>, pero no apareció en la base de datos.
          <br />
          <span className="text-sm text-red-400 mt-2 block">
            Detalle técnico: {error?.message || 'La fila no existe'}
          </span>
        </p>
        <Link
          href="/clientes"
          className="bg-[#1A1A1A] border border-gray-800 hover:bg-gray-800 px-6 py-2 rounded-lg font-medium transition-colors"
        >
          Volver al Directorio
        </Link>
      </div>
    );
  }

  // Traer los movimientos financieros de este cliente
  const { data: movimientos } = await supabase
    .from('movimientos')
    .select('*')
    .eq('cliente_id', String(cliente.id))
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-[#121212] text-white p-8 font-sans">
      {/* Botones Superiores */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <Link
          href="/clientes"
          className="flex items-center gap-2 bg-[#1A1A1A] border border-gray-800 hover:bg-gray-800 px-4 py-2 rounded-lg text-sm text-gray-300 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al Directorio de Clientes
        </Link>

        <BotoneraFichaCliente cliente={cliente} />
      </div>

      {/* Cabecera + 4 Pestañas Interactivas */}
      <PestanasFichaCliente cliente={cliente} movimientos={movimientos || []} />
    </div>
  );
}