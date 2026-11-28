import { supabase } from '@/lib/supabase';
import FichaProyectoClient from '@/components/FichaProyectoClient';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function PaginaFichaProyecto({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const identificador = decodeURIComponent(String(resolvedParams?.id || '')).trim();

  // Buscar proyecto por código (OBR-2026-04) o por id numérico
  let { data: proyecto } = await supabase
    .from('proyectos')
    .select('*')
    .eq('codigo', identificador)
    .maybeSingle();

  if (!proyecto && /^\d+$/.test(identificador)) {
    const resId = await supabase
      .from('proyectos')
      .select('*')
      .eq('id', Number(identificador))
      .maybeSingle();
    proyecto = resId.data;
  }

  if (!proyecto) {
    return (
      <div className="min-h-screen bg-[#121212] text-white p-8 flex flex-col items-center justify-center gap-4">
        <p className="text-sm text-gray-400">
          No se encontró el proyecto solicitado ({identificador}).
        </p>
        <Link
          href="/proyectos"
          className="bg-[#EAB308] text-black px-4 py-2 rounded-xl text-xs font-bold"
        >
          Volver a Proyectos
        </Link>
      </div>
    );
  }

  const codigoProy = proyecto.codigo;

  const [
    { data: clientes },
    { data: movimientosRaw },
    { data: visitas },
    { data: tareas },
    { data: comprasRaw },
    { data: proveedores },
    { data: equipo },
    { data: documentos },
  ] = await Promise.all([
    supabase.from('clientes').select('*').order('nombre', { ascending: true }),
    supabase
      .from('movimientos')
      .select('*')
      .eq('proyecto_codigo', codigoProy)
      .order('fecha', { ascending: false }),
    supabase
      .from('visitas')
      .select('*')
      .eq('proyecto_codigo', codigoProy)
      .order('fecha', { ascending: false }),
    supabase
      .from('tareas')
      .select('*')
      .eq('proyecto_codigo', codigoProy)
      .order('fecha_vencimiento', { ascending: true }),
    supabase
      .from('compras')
      .select(
        'id, proyecto_codigo, proyecto_nombre, proveedor, concepto, nro_orden, tipo_comprobante, fecha, moneda, importe, valor_usd, importe_usd, estado'
      )
      .order('fecha', { ascending: false }),
    supabase.from('proveedores').select('*').order('nombre', { ascending: true }),
    supabase.from('equipo').select('*').order('nombre', { ascending: true }),
    supabase
      .from('documentos')
      .select('*')
      .eq('proyecto_codigo', codigoProy)
      .order('created_at', { ascending: false }),
  ]);

  const movsDb = movimientosRaw || [];
  const comprasDb = comprasRaw || [];

  // Evitar duplicados si alguna compra ya estaba guardada manualmente en movimientos
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

  // Convertir automáticamente cada compra del proyecto en un movimiento financiero (Egreso o Ingreso si es Nota de Crédito)
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
        proyecto: `${codigoProy} · ${proyecto.nombre}`,
        proyecto_codigo: codigoProy,
        proyecto_nombre: proyecto.nombre,
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
    <FichaProyectoClient
      proyecto={proyecto}
      clientes={clientes || []}
      movimientos={movimientosUnificados}
      visitas={visitas || []}
      tareas={tareas || []}
      compras={comprasDb}
      proveedores={proveedores || []}
      equipo={equipo || []}
      documentos={documentos || []}
    />
  );
}