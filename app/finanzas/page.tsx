import { Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import FinanzasClient from '@/components/FinanzasClient';

export const dynamic = 'force-dynamic';

async function ContenidoFinanzas() {
  const [
    { data: movimientosRaw },
    { data: comprasRaw },
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
      .from('compras')
      .select(
        'id, proyecto_codigo, proyecto_nombre, proveedor, concepto, nro_orden, tipo_comprobante, fecha, moneda, importe, valor_usd, importe_usd, estado'
      )
      .order('fecha', { ascending: false }),
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

  const movsDb = movimientosRaw || [];
  const comprasDb = comprasRaw || [];

  const nrosEnMovimientos = new Set(
    movsDb
      .map((m: any) => String(m.comprobante || '').trim().toLowerCase())
      .filter(Boolean)
  );
  const conceptosEnMovimientos = new Set(
    movsDb
      .map((m: any) => String(m.concepto || '').trim().toLowerCase())
      .filter(Boolean)
  );

  const comprasComoMovimientos = comprasDb
    .filter((c: any) => {
      const nro = String(c.nro_orden || '').trim().toLowerCase();
      const conc = `${c.proveedor || 'Proveedor'} · ${c.concepto || ''}`
        .trim()
        .toLowerCase();
      if (nro && nrosEnMovimientos.has(nro)) return false;
      if (conceptosEnMovimientos.has(conc)) return false;
      return true;
    })
    .map((c: any) => {
      const esNc = c.tipo_comprobante === 'Nota de Crédito';
      const imp = Number(c.importe || 0);
      const cot = Number(c.valor_usd || 1450) || 1450;
      const mon = String(c.moneda || 'ARS').toUpperCase();
      const impUsd =
        Number(c.importe_usd || 0) > 0
          ? Number(c.importe_usd)
          : mon === 'USD'
          ? imp
          : Math.round((imp / cot) * 100) / 100;

      return {
        id: `compra-${c.id}`,
        compra_origen_id: c.id,
        es_desde_compra: true,
        tipo: esNc ? 'Ingreso' : 'Egreso',
        proyecto: c.proyecto_codigo
          ? `${c.proyecto_codigo} · ${c.proyecto_nombre || ''}`
          : 'General',
        proyecto_codigo: c.proyecto_codigo || null,
        proyecto_nombre: c.proyecto_nombre || null,
        categoria: esNc ? 'Nota de Crédito / Devolución' : 'Compras y Materiales de Obra',
        concepto: `${c.proveedor || 'Proveedor'} · ${c.concepto || ''}`,
        proveedor: c.proveedor || null,
        moneda: mon,
        importe: imp,
        monto: imp,
        valor_usd: cot,
        importe_usd: impUsd,
        fecha: c.fecha || new Date().toISOString().split('T')[0],
        estado: c.estado === 'Pendiente de pago' ? 'Resta abonar' : 'Abonado',
        tipo_comprobante: c.tipo_comprobante || 'Factura',
        comprobante: c.nro_orden || null,
        archivo_url: c.archivo_url || null,
      };
    });

  const movimientosUnificados = [...movsDb, ...comprasComoMovimientos].sort((a, b) =>
    String(b.fecha || '').localeCompare(String(a.fecha || ''))
  );

  return (
    <FinanzasClient
      movimientosIniciales={movimientosUnificados}
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