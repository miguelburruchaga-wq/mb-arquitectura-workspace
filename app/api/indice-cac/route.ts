import { NextRequest, NextResponse } from 'next/server';

export interface RegistroCAC {
  periodo: string; // Ej: "OCT2026"
  etiqueta: string; // Ej: "Octubre 2026"
  valor: number;
  provisorio?: boolean;
}

// Serie histórica oficial verificada de CAMARCO (Índice General · Base Dic 2014 = 100)
// Último período publicado oficialmente: Octubre 2026 (23.884,20 - publicado 17/11/2026)
const SERIE_OFICIAL_CAC: RegistroCAC[] = [
  { periodo: 'OCT2026', etiqueta: 'Octubre 2026', valor: 23884.2 },
  { periodo: 'SEP2026', etiqueta: 'Septiembre 2026', valor: 23607.5 },
  { periodo: 'AGO2026', etiqueta: 'Agosto 2026', valor: 22942.2 },
  { periodo: 'JUL2026', etiqueta: 'Julio 2026', valor: 22059.8 },
  { periodo: 'JUN2026', etiqueta: 'Junio 2026', valor: 21734.5 },
  { periodo: 'MAY2026', etiqueta: 'Mayo 2026', valor: 21121.9 },
  { periodo: 'ABR2026', etiqueta: 'Abril 2026', valor: 20586.6 },
  { periodo: 'MAR2026', etiqueta: 'Marzo 2026', valor: 19852.1 },
  { periodo: 'FEB2026', etiqueta: 'Febrero 2026', valor: 19539.4 },
  { periodo: 'ENE2026', etiqueta: 'Enero 2026', valor: 19288.6 },
  { periodo: 'DIC2025', etiqueta: 'Diciembre 2025', valor: 18854.9 },
  { periodo: 'NOV2025', etiqueta: 'Noviembre 2025', valor: 18612.9 },
  { periodo: 'OCT2025', etiqueta: 'Octubre 2025', valor: 18247.9 },
];

const MESES_ES: Record<string, string> = {
  enero: 'ENE',
  febrero: 'FEB',
  marzo: 'MAR',
  abril: 'ABR',
  mayo: 'MAY',
  junio: 'JUN',
  julio: 'JUL',
  agosto: 'AGO',
  septiembre: 'SEP',
  setiembre: 'SEP',
  octubre: 'OCT',
  noviembre: 'NOV',
  diciembre: 'DIC',
};

const NOMBRES_MES: Record<string, string> = {
  ENE: 'Enero',
  FEB: 'Febrero',
  MAR: 'Marzo',
  ABR: 'Abril',
  MAY: 'Mayo',
  JUN: 'Junio',
  JUL: 'Julio',
  AGO: 'Agosto',
  SEP: 'Septiembre',
  OCT: 'Octubre',
  NOV: 'Noviembre',
  DIC: 'Diciembre',
};

async function obtenerUltimoPublicadoOnline(): Promise<RegistroCAC | null> {
  try {
    const res = await fetch('https://www.cifrasonline.com.ar/indice-cac/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MBArquitecturaWorkspace/1.0)',
      },
      next: { revalidate: 3600 }, // Revalida cada 1 hora automáticamente
    });

    if (!res.ok) return null;
    const html = await res.text();

    // Busca el patrón oficial: ej. "octubre de 2026" o "noviembre de 2026" + "(índice 23.884,20)"
    const matchMes = html.match(
      /(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s+de\s+(202\d)/i
    );
    const matchIndice = html.match(/índice\s+([\d.]+,\d{2})/i);

    if (matchMes && matchIndice) {
      const mesNombre = matchMes[1].toLowerCase();
      const anio = matchMes[2];
      const codMes = MESES_ES[mesNombre];
      const valorNum = parseFloat(matchIndice[1].replace(/\./g, '').replace(',', '.'));

      if (codMes && !Number.isNaN(valorNum) && valorNum > 10000) {
        const periodo = `${codMes}${anio}`;
        return {
          periodo,
          etiqueta: `${NOMBRES_MES[codMes]} ${anio}`,
          valor: valorNum,
        };
      }
    }
  } catch {
    // Si el sitio externo demora, usa la serie verificada local
  }
  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const periodoBuscado = String(searchParams.get('periodo') || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  const serie = [...SERIE_OFICIAL_CAC];

  // Consultar si CAMARCO / CIFRAS ya publicó un mes más reciente (ej. NOV2026, DIC2026...)
  const ultimoOnline = await obtenerUltimoPublicadoOnline();
  if (ultimoOnline) {
    const idxExistente = serie.findIndex((r) => r.periodo === ultimoOnline.periodo);
    if (idxExistente >= 0) {
      serie[idxExistente] = ultimoOnline;
    } else {
      serie.unshift(ultimoOnline);
    }
  }

  const ultimoDisponible = serie[0];
  const encontrado = periodoBuscado
    ? serie.find((r) => r.periodo === periodoBuscado) || ultimoDisponible
    : ultimoDisponible;

  return NextResponse.json({
    periodo: encontrado.periodo,
    etiqueta: encontrado.etiqueta,
    valor: encontrado.valor,
    ultimoPeriodoPublicado: ultimoDisponible.periodo,
    serie,
    fuente: 'CAMARCO / CIFRAS · Índice General',
  });
}