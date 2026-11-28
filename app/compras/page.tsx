import { supabase } from '@/lib/supabase';
import ComprasClient from '@/components/ComprasClient';

export const dynamic = 'force-dynamic';

export default async function PaginaCompras() {
  const [{ data: compras }, { data: proyectos }, { data: proveedores }] = await Promise.all([
    supabase
      .from('compras')
      .select(
        'id, proyecto_codigo, proyecto_nombre, proveedor, cuit, concepto, nro_orden, tipo_comprobante, fecha, moneda, importe, valor_usd, importe_usd, estado, notas, created_at'
      )
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('proyectos')
      .select('id, codigo, nombre, estado')
      .order('created_at', { ascending: false }),
    supabase
      .from('proveedores')
      .select('id, codigo, nombre, cuit, rubro')
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