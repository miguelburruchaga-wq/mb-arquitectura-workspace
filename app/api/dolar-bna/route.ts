import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const fecha = req.nextUrl.searchParams.get('fecha'); // formato YYYY-MM-DD
  if (!fecha) {
    return NextResponse.json({ valor: null }, { status: 400 });
  }

  try {
    // 1. Intentar histórico oficial por fecha exacta (ArgentinaDatos / Ámbito / BCRA)
    const [anio, mes, dia] = fecha.split('-');
    if (anio && mes && dia) {
      const resHist = await fetch(
        `https://api.argentinadatos.com/v1/cotizaciones/dolares/oficial/${anio}/${mes}/${dia}`,
        { next: { revalidate: 3600 } }
      );
      if (resHist.ok) {
        const data = await resHist.json();
        const venta = Number(data?.venta || 0);
        if (venta > 0) {
          return NextResponse.json({ valor: venta, fuente: 'Oficial / BNA histórico' });
        }
      }

      // Si cayó fin de semana/feriado, probar hasta 4 días hábiles hacia atrás
      const baseDate = new Date(`${fecha}T12:00:00`);
      for (let i = 1; i <= 4; i++) {
        const prev = new Date(baseDate);
        prev.setDate(baseDate.getDate() - i);
        const y = prev.getFullYear();
        const m = String(prev.getMonth() + 1).padStart(2, '0');
        const d = String(prev.getDate()).padStart(2, '0');
        const resPrev = await fetch(
          `https://api.argentinadatos.com/v1/cotizaciones/dolares/oficial/${y}/${m}/${d}`,
          { next: { revalidate: 3600 } }
        );
        if (resPrev.ok) {
          const dataPrev = await resPrev.json();
          const ventaPrev = Number(dataPrev?.venta || 0);
          if (ventaPrev > 0) {
            return NextResponse.json({ valor: ventaPrev, fuente: 'Oficial / BNA día hábil' });
          }
        }
      }
    }

    // 2. Respaldo: cotización oficial actual (DolarApi)
    const resActual = await fetch('https://dolarapi.com/v1/dolares/oficial', {
      cache: 'no-store',
    });
    if (resActual.ok) {
      const actual = await resActual.json();
      const ventaActual = Number(actual?.venta || 0);
      if (ventaActual > 0) {
        return NextResponse.json({ valor: ventaActual, fuente: 'Oficial / BNA actual' });
      }
    }

    return NextResponse.json({ valor: null });
  } catch {
    return NextResponse.json({ valor: null });
  }
}