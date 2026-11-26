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

async function extraerTextoConPdfJsYOcr(file: File): Promise<string> {
  // Si suben una imagen directa (JPG/PNG), ejecutar OCR directo
  if (file.type.startsWith('image/')) {
    const Tesseract = (await import('tesseract.js')).default;
    const { data } = await Tesseract.recognize(file, 'spa');
    return (data?.text || '').replace(/\s+/g, ' ').trim();
  }

  const buffer = await file.arrayBuffer();
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

  const textoEmbebido = paginasTexto.join(' ').replace(/\s+/g, ' ').trim();

  // Si el PDF trae capa de texto real (como facturas electrónicas AFIP), devolverlo directo
  if (textoEmbebido.length >= 80) {
    return textoEmbebido;
  }

  // Respaldo OCR para PDFs escaneados o fotografiados (como Maderera Rosati)
  const paginasOcr: string[] = [];
  const Tesseract = (await import('tesseract.js')).default;

  for (let i = 1; i <= Math.min(pdf.numPages, 2); i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.5 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
    const { data } = await Tesseract.recognize(canvas, 'spa');
    if (data?.text) paginasOcr.push(data.text);
  }

  return paginasOcr.join(' ').replace(/\s+/g, ' ').trim() || textoEmbebido;
}

export async function extraerDatosFacturaPdf(file: File): Promise<{
  importe: string | null;
  nroFactura: string | null;
  fechaDetectada: string | null;
  cuitDetectado: string | null;
  proveedorSugerido: string | null;
  conceptoSugerido: string | null;
  monedaDetectada: 'ARS' | 'USD' | null;
  textoCompleto: string;
}> {
  try {
    const textoPdfInterno = await extraerTextoConPdfJsYOcr(file);
    const nombreArchivo = file.name.replace(/\.[^.]+$/, '');

    // 0. CUIT DEL PROVEEDOR (ignora el CUIT propio de MB Arquitectura SA: 30-71624594-9)
    let cuitDetectado: string | null = null;
    const todosCuits = [
      ...textoPdfInterno.matchAll(/\b(20|23|24|27|30|33|34)[-\s.]?(\d{8})[-\s.]?(\d)\b/g),
    ].map((m) => `${m[1]}-${m[2]}-${m[3]}`);
    const cuitEmisor = todosCuits.find((c) => c !== '30-71624594-9');
    if (cuitEmisor) {
      cuitDetectado = cuitEmisor;
    }

    // 1. FECHA DE EMISIÓN (soporta "FECHA 17/11/2026", "08 /07 /26", año de 2 o 4 dígitos; ignora Inicio de Actividades y VTO)
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
        /(?:Fecha\s+de\s+Emisi[oó]n|Fecha\s+Comprobante|Fecha)[^\d]{0,10}(\d{1,2})\s*[\/\-]\s*(\d{1,2})\s*[\/\-]\s*(20\d{2}|\d{2})\b/i
      );
      if (matchFechaEtiqueta) {
        const dia = matchFechaEtiqueta[1].padStart(2, '0');
        const mes = matchFechaEtiqueta[2].padStart(2, '0');
        const anio =
          matchFechaEtiqueta[3].length === 2
            ? `20${matchFechaEtiqueta[3]}`
            : matchFechaEtiqueta[3];
        if (Number(mes) >= 1 && Number(mes) <= 12 && Number(dia) >= 1 && Number(dia) <= 31) {
          fechaDetectada = `${anio}-${mes}-${dia}`;
        }
      }
    }

    if (!fechaDetectada) {
      const encabezado = textoPdfInterno.slice(0, 1000);
      const todasFechas = [
        ...encabezado.matchAll(/\b(\d{1,2})\s*[\/\-]\s*(\d{1,2})\s*[\/\-]\s*(20\d{2}|\d{2})\b/g),
      ];
      const candidatas: string[] = [];

      for (const m of todasFechas) {
        const idx = m.index || 0;
        const previo = encabezado.slice(Math.max(0, idx - 45), idx).toLowerCase();
        const posterior = encabezado
          .slice(idx, Math.min(encabezado.length, idx + 45))
          .toLowerCase();

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
        const anio = m[3].length === 2 ? `20${m[3]}` : m[3];
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
      const matchNombreFecha = nombreArchivo.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
      if (matchNombreFecha) {
        const dia = matchNombreFecha[1].padStart(2, '0');
        const mes = matchNombreFecha[2].padStart(2, '0');
        const anio =
          matchNombreFecha[3].length === 2
            ? `20${matchNombreFecha[3]}`
            : matchNombreFecha[3];
        if (Number(mes) >= 1 && Number(mes) <= 12 && Number(dia) >= 1 && Number(dia) <= 31) {
          fechaDetectada = `${anio}-${mes}-${dia}`;
        }
      }
    }

    // 2. NRO. DE FACTURA / ORDEN
    let nroFactura: string | null = null;
    const cabeceraPdf = textoPdfInterno.slice(0, 1500);

    const matchAfipDirecto = cabeceraPdf.match(
      /Punto\s+de\s+Venta[:\s]*(\d{4,5})[\s\S]{0,120}?Comp\.?\s*Nro\.?[:\s]*(\d{6,8})/i
    );
    if (matchAfipDirecto) {
      nroFactura = `${matchAfipDirecto[1].padStart(5, '0')}-${matchAfipDirecto[2].padStart(8, '0')}`;
    }

    if (!nroFactura) {
      const matchParAfipSeparado = cabeceraPdf.match(/\b(\d{5})\s+(\d{8})\b/);
      if (matchParAfipSeparado) {
        nroFactura = `${matchParAfipSeparado[1]}-${matchParAfipSeparado[2]}`;
      }
    }

    if (!nroFactura) {
      const matchPv = cabeceraPdf.match(/Punto\s+de\s+Venta[:\s]*(\d{4,5})\b/i);
      const matchComp = cabeceraPdf.match(/Comp\.?\s*Nro\.?[:\s]*(\d{6,8})\b/i);
      if (matchPv && matchComp) {
        nroFactura = `${matchPv[1].padStart(5, '0')}-${matchComp[1].padStart(8, '0')}`;
      }
    }

    if (!nroFactura) {
      const matchComprobante = textoPdfInterno.match(
        /(?:Factura\s*[ABC]?\s*(?:N[°ºo.]*)?|Comprobante\s*(?:N[°ºo.]*)?|NRO\.?|N[°ºo.]\s*)[:\s]*(\d{4,5}\s*[-–]\s*\d{6,8})/i
      );
      if (matchComprobante) {
        nroFactura = matchComprobante[1].replace(/\s+/g, '').replace('–', '-');
      } else {
        const matchGenericoPdf = textoPdfInterno.match(/\b(\d{4,5})\s*[-–]\s*(\d{6,8})\b/);
        if (matchGenericoPdf) {
          nroFactura = `${matchGenericoPdf[1].padStart(5, '0')}-${matchGenericoPdf[2].padStart(8, '0')}`;
        }
      }
    }

    if (!nroFactura) {
      const matchNombreOc = nombreArchivo.match(/\b(OC-\d{4}-\d{1,5}|\d{4,5}-\d{6,8})\b/i);
      if (matchNombreOc) nroFactura = matchNombreOc[1];
    }

    // 3. IMPORTE SUBTOTAL / NETO GRAVADO
    let montoDetectado = 0;

    const regexEtiquetaNeto =
      /(?:Importe\s+Neto\s+Gravado|Neto\s+Gravado|Total\s+Neto|Subtotal(?:\s+Neto)?)[:\s]*\$?\s*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2}|\d+[.,]\d{2})/gi;
    const candidatosEtiqueta: number[] = [];
    let mNeto: RegExpExecArray | null;
    while ((mNeto = regexEtiquetaNeto.exec(textoPdfInterno)) !== null) {
      const val = parsearMontoFlexible(mNeto[1]);
      if (val > 0) candidatosEtiqueta.push(val);
    }

    if (candidatosEtiqueta.length > 0) {
      montoDetectado = Math.max(...candidatosEtiqueta);
    }

    if (montoDetectado === 0) {
      const zonaInferior = textoPdfInterno.slice(Math.floor(textoPdfInterno.length * 0.35));
      const regexMontos = /\$?\s*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2}|\d+[.,]\d{2})/g;
      const todosMontos: number[] = [];
      let m: RegExpExecArray | null;
      while ((m = regexMontos.exec(zonaInferior)) !== null) {
        const val = parsearMontoFlexible(m[1]);
        if (val > 0) todosMontos.push(val);
      }

      const tieneDiscriminacionIva = /\b(?:subtotal|neto\s+gravado|total\s+neto|i\.?v\.?a\.?)\b/i.test(
        textoPdfInterno
      );

      if (todosMontos.length > 0) {
        const conteo = new Map<number, number>();
        for (const v of todosMontos) {
          conteo.set(v, (conteo.get(v) || 0) + 1);
        }
        const repetidos = [...conteo.entries()]
          .filter(([, cant]) => cant >= 2)
          .sort((a, b) => b[0] - a[0]);

        const unicosDesc = [...new Set(todosMontos)].sort((a, b) => b - a);
        const totalConIva = unicosDesc[0];

        if (tieneDiscriminacionIva && unicosDesc.length >= 2) {
          if (repetidos.length > 0 && repetidos[0][0] < totalConIva) {
            montoDetectado = repetidos[0][0];
          } else {
            montoDetectado = unicosDesc[1];
          }
        } else {
          montoDetectado = totalConIva;
        }
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

    // 4. PROVEEDOR SUGERIDO DESDE RAZÓN SOCIAL DEL COMPROBANTE (si no se encuentra, usa nombre de archivo)
    let proveedorSugerido: string | null = null;
    const matchRazonSocial = textoPdfInterno
      .slice(0, 800)
      .match(
        /(?:de\s+)?([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ0-9\s.&]{3,40}\s+(?:S\.?A\.?|S\.?R\.?L\.?|S\.?A\.?S\.?))/
      );
    if (
      matchRazonSocial &&
      !matchRazonSocial[1].toUpperCase().includes('MB ARQUITECTURA')
    ) {
      proveedorSugerido = matchRazonSocial[1].trim();
    }

    if (!proveedorSugerido) {
      proveedorSugerido =
        nombreArchivo
          .replace(/^\d{1,2}[\/\-]\d{1,2}\s*/, '')
          .replace(/[_-]+/g, ' ')
          .trim() || null;
    }

    const nombreLimpio = nombreArchivo.replace(/[_-]+/g, ' ').trim();

    return {
      importe: importeFormateado,
      nroFactura,
      fechaDetectada,
      cuitDetectado,
      proveedorSugerido,
      conceptoSugerido: nombreLimpio.length > 2 ? nombreLimpio : null,
      monedaDetectada,
      textoCompleto: textoPdfInterno,
    };
  } catch {
    return {
      importe: null,
      nroFactura: null,
      fechaDetectada: null,
      cuitDetectado: null,
      proveedorSugerido: null,
      conceptoSugerido: null,
      monedaDetectada: null,
      textoCompleto: '',
    };
  }
}