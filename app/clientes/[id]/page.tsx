import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import BotoneraFichaCliente from '@/components/BotoneraFichaCliente';
import PestanasFichaCliente from '@/components/PestanasFichaCliente';

export const dynamic = 'force-dynamic';

export default async function FichaCliente({ params }: { params: Promise<{ id: string }> }) {
  const parametros = await params;
  const identificador = decodeURIComponent(parametros.id || '').trim();

  // Buscamos primero por código exacto (ignorando mayúsculas/espacios)
  let { data: lista, error } = await supabase
    .from('clientes')
    .select('*')
    .ilike('codigo', identificador)
    .limit(1);

  // Si no apareció por código y el parámetro es numérico, buscamos por id
  if ((!lista || lista.length === 0) && /^\d+$/.test(identificador)) {
    const resId = await supabase
      .from('clientes')
      .select('*')
      .eq('id', Number(identificador))
      .limit(1);
    lista = resId.data;
    error = resId.error;
  }

  const cliente = lista?.[0] || null;

  if (error || !cliente) {
    return (
      <div className="min-h-screen text-white p-8 flex flex-col items-center justify-center text-center">
        <div className="bg-[#242424]/90 backdrop-blur-md border border-white/10 rounded-2xl p-8 max-w-md shadow-2xl">
          <AlertTriangle className="w-14 h-14 text-[#EAB308] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Cliente no encontrado</h1>
          <p className="text-gray-300 text-sm mb-6">
            No encontramos ningún cliente con el identificador <strong>{identificador}</strong>.
            {error?.message && (
              <span className="text-xs text-red-400 mt-2 block">
                Detalle técnico: {error.message}
              </span>
            )}
          </p>
          <Link
            href="/clientes"
            className="inline-block bg-[#EAB308] hover:bg-[#CA9A04] text-black px-6 py-2.5 rounded-xl font-bold text-sm transition-colors"
          >
            Volver al Directorio
          </Link>
        </div>
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
    <div className="min-h-screen text-white p-8 font-sans">
      {/* Botones Superiores */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <Link
          href="/clientes"
          className="flex items-center gap-2 bg-[#242424]/85 backdrop-blur-md border border-white/10 hover:bg-white/10 px-4 py-2.5 rounded-xl text-sm text-gray-200 transition-colors font-semibold"
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