const MESES_ES: Record<string, string> = {
  enero: '01',
  febrero: '02',
  marzo: '03',
  abril: '04',
  mayo: '05',
  junio: '06',
  julio: '07',
  agosto: '08',
  septiembre: '09',
  setiembre: '09',
  octubre: '10',
  noviembre: '11',
  diciembre: '12',
};

function parsearMontoFlexible(numStr: string): number {
  const limpio = numStr.trim();
  if (!limpio) return 0;

  const tieneComa = limpio.includes(',');
  const tienePunto = limpio.includes('.');

  let normalizado = limpio;

  if (tieneComa && tienePunto) {
    if (limpio.lastIndexOf(',') > limpio.lastIndexOf('.')) {
      normalizado = limpio.replace(/\./g, '').replace(',', '.');
    } else {
      normalizado = limpio.replace(/,/g, '');
    }
  } else if (tieneComa) {
    const partes = limpio.split(',');
    if (partes[partes.length - 1].length === 2) {
      normalizado = limpio.replace(',', '.');
    } else {
      normalizado = limpio.replace(/,/g, '');
    }
  } else if (tienePunto) {
    const partes = limpio.split('.');
    if (partes[partes.length - 1].length === 2) {
      normalizado = limpio;
    } else {
      normalizado = limpio.replace(/\./g, '');
    }
  }

  const val = parseFloat(normalizado);
  return !isNaN(val) && val > 0 && val < 1000000000 ? val : 0;
}

async function extraerTextoConPdfJs(buffer: ArrayBuffer): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;

  const paginasTexto: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item: any) => item.str || '');
    paginasTexto.push(strings.join(' '));
  }

  return paginasTexto.join(' ').replace(/\s+/g, ' ').trim();
}

export async function extraerDatosFacturaPdf(file: File): Promise<{
  importe: string | null;
  nroFactura: string | null;
  fechaDetectada: string | null;
  conceptoSugerido: string | null;
  monedaDetectada: 'ARS' | 'USD' | null;
}> {
  try {
    const buffer = await file.arrayBuffer();
    const textoPdfInterno = await extraerTextoConPdfJs(buffer);
    const nombreArchivo = file.name.replace(/\.pdf$/i, '');

    // =========================================================================
    // 1. DETECTAR FECHA DE EMISIÓN
    // =========================================================================
    let fechaDetectada: string | null = null;

    const matchFechaTexto = textoPdfInterno.match(
      /(?:Fecha\s+de\s+Emisi[oó]n|Fecha\s+Comprobante|Fecha)?[:\s]*(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s+de\s+(20\d{2})/i
    );
    if (matchFechaTexto) {
      const dia = matchFechaTexto[1].padStart(2, '0');
      const mes = MESES_ES[matchFechaTexto[2].toLowerCase()];
      const anio = matchFechaTexto[3];
      if (mes && Number(dia) >= 1 && Number(dia) <= 31) {
        fechaDetectada = `${anio}-${mes}-${dia}`;
      }
    }

    if (!fechaDetectada) {
      const matchFechaEtiqueta = textoPdfInterno.match(
        /(?:Fecha\s+de\s+Emisi[oó]n|Fecha\s+Comprobante|Fecha\s*:)[:\s]*(\d{1,2})[\/\-](\d{1,2})[\/\-](20\d{2})/i
      );
      if (matchFechaEtiqueta) {
        const dia = matchFechaEtiqueta[1].padStart(2, '0');
        const mes = matchFechaEtiqueta[2].padStart(2, '0');
        const anio = matchFechaEtiqueta[3];
        if (Number(mes) >= 1 && Number(mes) <= 12 && Number(dia) >= 1 && Number(dia) <= 31) {
          fechaDetectada = `${anio}-${mes}-${dia}`;
        }
      }
    }

    if (!fechaDetectada) {
      const encabezado = textoPdfInterno.slice(0, 900);
      const todasFechas = [...encabezado.matchAll(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](20\d{2})\b/g)];
      const candidatas: string[] = [];

      for (const m of todasFechas) {
        const idx = m.index || 0;
        const previo = encabezado.slice(Math.max(0, idx - 45), idx).toLowerCase();
        const posterior = encabezado.slice(idx, Math.min(encabezado.length, idx + 45)).toLowerCase();

        if (
          previo.includes('inicio') ||
          previo.includes('actividades') ||
          previo.includes('act.') ||
          previo.includes('cae') ||
          previo.includes('vto') ||
          posterior.includes('inicio') ||
          posterior.includes('actividades')
        ) {
          continue;
        }

        const dia = m[1].padStart(2, '0');
        const mes = m[2].padStart(2, '0');
        const anio = m[3];
        if (Number(mes) >= 1 && Number(mes) <= 12 && Number(dia) >= 1 && Number(dia) <= 31) {
          candidatas.push(`${anio}-${mes}-${dia}`);
        }
      }

      if (candidatas.length > 0) {
        candidatas.sort((a, b) => b.localeCompare(a));
        fechaDetectada = candidatas[0];
      }
    }

    if (!fechaDetectada) {
      const matchNombreFecha = nombreArchivo.match(/^(\d{1,2})[\/\-](\d{1,2})\b/);
      if (matchNombreFecha) {
        const dia = matchNombreFecha[1].padStart(2, '0');
        const mes = matchNombreFecha[2].padStart(2, '0');
        const anioActual = new Date().getFullYear();
        if (Number(mes) >= 1 && Number(mes) <= 12 && Number(dia) >= 1 && Number(dia) <= 31) {
          fechaDetectada = `${anioActual}-${mes}-${dia}`;
        }
      }
    }

    // =========================================================================
    // 2. DETECTAR NRO. DE FACTURA / ORDEN
    // =========================================================================
    let nroFactura: string | null = null;

    const matchAfip = textoPdfInterno.match(
      /Punto\s+de\s+Venta[:\s]*(\d{4,5})\s+Comp\.?\s*Nro[:\s]*(\d{6,8})/i
    );
    if (matchAfip) {
      nroFactura = `${matchAfip[1]}-${matchAfip[2]}`;
    }

    if (!nroFactura) {
      const matchComprobante = textoPdfInterno.match(
        /(?:Factura\s*[ABC]?\s*(?:N[°ºo.]*)?|Comprobante\s*(?:N[°ºo.]*)?|N[°ºo.]\s*)[:\s]*(\d{4,5}-\d{6,8})/i
      );
      if (matchComprobante) {
        nroFactura = matchComprobante[1];
      } else {
        const matchGenericoPdf = textoPdfInterno.match(/\b(\d{4,5}-\d{6,8})\b/);
        if (matchGenericoPdf) {
          nroFactura = matchGenericoPdf[1];
        }
      }
    }

    if (!nroFactura) {
      const matchNombreOc = nombreArchivo.match(/\b(OC-\d{4}-\d{1,5}|\d{4,5}-\d{6,8})\b/i);
      if (matchNombreOc) nroFactura = matchNombreOc[1];
    }

    // =========================================================================
    // 3. DETECTAR IMPORTE TOTAL NETO (tolerando números sin puntos de miles)
    // =========================================================================
    let montoDetectado = 0;

    // Extraer todos los montos decimales del documento en orden de aparición
    const regexMontos = /\$?\s*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2}|\d+[.,]\d{2})/g;
    const todosMontos: number[] = [];
    let m: RegExpExecArray | null;
    while ((m = regexMontos.exec(textoPdfInterno)) !== null) {
      const val = parsearMontoFlexible(m[1]);
      if (val > 0) todosMontos.push(val);
    }

    const tieneDiscriminacionIva = /\b(?:subtotal|neto\s+gravado|total\s+neto|i\.?v\.?a\.?)\b/i.test(
      textoPdfInterno
    );

    if (todosMontos.length > 0) {
      // Tomar los últimos 10 montos del PDF (donde siempre está el bloque de totales del pie)
      const montosPie = todosMontos.slice(-10);

      if (tieneDiscriminacionIva && montosPie.length >= 2) {
        // Si un monto aparece repetido 2+ veces en el pie (ej. Electro Star: 2131533.92 en ambos Subtotales), es el Neto
        const conteo = new Map<number, number>();
        for (const v of montosPie) {
          conteo.set(v, (conteo.get(v) || 0) + 1);
        }
        const repetidos = [...conteo.entries()]
          .filter(([, cant]) => cant >= 2)
          .sort((a, b) => b[0] - a[0]);

        const unicosDesc = [...new Set(montosPie)].sort((a, b) => b - a);
        const totalConIva = unicosDesc[0];

        if (repetidos.length > 0 && repetidos[0][0] < totalConIva) {
          montoDetectado = repetidos[0][0];
        } else if (unicosDesc.length >= 2) {
          // El 1° mayor es Total Final con IVA; el 2° mayor es el Subtotal Neto
          montoDetectado = unicosDesc[1];
        } else {
          montoDetectado = totalConIva;
        }
      } else {
        // Sin discriminación de IVA (ej. Factura C): el mayor monto del pie es el Total
        montoDetectado = Math.max(...montosPie);
      }
    }

    const importeFormateado =
      montoDetectado > 0
        ? montoDetectado.toLocaleString('es-AR', {
            minimumFractionDigits: montoDetectado % 1 === 0 ? 0 : 2,
            maximumFractionDigits: 2,
          })
        : null;

    const monedaDetectada: 'ARS' | 'USD' | null =
      /\b(?:USD|U\$S|DOLARES|DÓLARES)\b/i.test(textoPdfInterno) ? 'USD' : null;

    const nombreLimpio = nombreArchivo.replace(/[_-]+/g, ' ').trim();

    return {
      importe: importeFormateado,
      nroFactura,
      fechaDetectada,
      conceptoSugerido: nombreLimpio.length > 2 ? nombreLimpio : null,
      monedaDetectada,
    };
  } catch {
    return {
      importe: null,
      nroFactura: null,
      fechaDetectada: null,
      conceptoSugerido: null,
      monedaDetectada: null,
    };
  }
}