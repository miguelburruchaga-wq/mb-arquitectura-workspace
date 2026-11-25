"use client";

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { moverAPapelera } from '@/lib/papelera';
import { X, Upload, Link2, Trash2, Loader2, Calculator } from 'lucide-react';

function formatearMilesDecimales(valorCrudo: string): string {
  const limpio = valorCrudo.replace(/[^\d,]/g, '');
  if (!limpio) return '';
  const partes = limpio.split(',');
  const enteros = partes[0].replace(/^0+(?=\d)/, '');
  const conPuntos = enteros.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (partes.length > 1) {
    return `${conPuntos || '0'},${partes[1].slice(0, 2)}`;
  }
  return conPuntos;
}

function parsearNum(valor: string | number): number {
  if (typeof valor === 'number') return valor;
  const s = String(valor || '').trim();
  if (!s) return 0;
  if (s.includes(',')) return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
  const puntos = (s.match(/\./g) || []).length;
  if (puntos > 1) return parseFloat(s.replace(/\./g, '')) || 0;
  return parseFloat(s) || 0;
}

function numATextoArg(n: number): string {
  if (!n) return '';
  return n.toLocaleString('es-AR', {
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export default function ModalMovimientoFinanciero({
  abierto,
  onClose,
  onGuardado,
  movEditando = null,
  proyectos = [],
  clientes = [],
  proveedores = [],
  proyectoFijoCodigo = '',
  monedaInicial = 'ARS',
}: {
  abierto: boolean;
  onClose: () => void;
  onGuardado: (mensaje: string) => void;
  movEditando?: any | null;
  proyectos?: any[];
  clientes?: any[];
  proveedores?: any[];
  proyectoFijoCodigo?: string;
  monedaInicial?: 'ARS' | 'USD';
}) {
  const [montado, setMontado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);

  const hoy = new Date().toISOString().split('T')[0];

  const [tipo, setTipo] = useState<'Ingreso' | 'Egreso'>('Ingreso');
  const [proyectoCodigo, setProyectoCodigo] = useState(
    proyectoFijoCodigo || proyectos[0]?.codigo || ''
  );
  const [categoria, setCategoria] = useState('Certificación de Obra');
  const [concepto, setConcepto] = useState('');
  const [moneda, setMoneda] = useState<'ARS' | 'USD'>(monedaInicial);
  const [importeTexto, setImporteTexto] = useState('');
  const [valorUsdTexto, setValorUsdTexto] = useState('1.450');
  const [fecha, setFecha] = useState(hoy);
  const [estado, setEstado] = useState('Abonado');
  const [tipoComprobante, setTipoComprobante] = useState('Factura C');
  const [comprobante, setComprobante] = useState('');
  const [archivoUrl, setArchivoUrl] = useState('');
  const [notas, setNotas] = useState('');

  // Campos de Redeterminación Índice CAC
  const [serieCAC, setSerieCAC] = useState<{ periodo: string; etiqueta: string; valor: number }[]>([
    { periodo: 'OCT2026', etiqueta: 'Octubre 2026', valor: 23884.2 },
  ]);
  const [aplicarCAC, setAplicarCAC] = useState(false);
  const [cacMesBase, setCacMesBase] = useState('OCT2026');
  const [cacValorBaseTexto, setCacValorBaseTexto] = useState('23.884,20');
  const [cacMesActual, setCacMesActual] = useState('OCT2026');
  const [cacValorActualTexto, setCacValorActualTexto] = useState('23.884,20');

  useEffect(() => {
    setMontado(true);
    fetch('/api/indice-cac')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.serie?.length) {
          setSerieCAC(json.serie);
        }
      })
      .catch(() => {});
  }, []);

  const proyectoSeleccionado = useMemo(
    () => proyectos.find((p) => p.codigo === proyectoCodigo),
    [proyectos, proyectoCodigo]
  );

  useEffect(() => {
    if (!abierto) return;
    const hoyIso = new Date().toISOString().split('T')[0];

    if (movEditando) {
      const esEg = String(movEditando.tipo || '').toLowerCase() === 'egreso';
      setTipo(esEg ? 'Egreso' : 'Ingreso');
      setProyectoCodigo(movEditando.proyecto_codigo || proyectoFijoCodigo || '');
      setCategoria(movEditando.categoria || (esEg ? 'Materiales / Obra' : 'Certificación de Obra'));
      setConcepto(movEditando.concepto || '');
      setMoneda(String(movEditando.moneda || 'ARS').toUpperCase() === 'USD' ? 'USD' : 'ARS');

      const base = Number(movEditando.monto_base || 0);
      const imp = Number(movEditando.importe ?? movEditando.monto ?? 0);
      setImporteTexto(numATextoArg(base > 0 ? base : imp));
      setValorUsdTexto(numATextoArg(Number(movEditando.valor_usd || 1450)));
      setFecha(movEditando.fecha || hoyIso);
      setEstado(movEditando.estado || 'Abonado');
      setTipoComprobante(movEditando.tipo_comprobante || 'Factura C');
      setComprobante(movEditando.comprobante || '');
      setArchivoUrl(movEditando.archivo_url || '');
      setNotas(movEditando.notas || '');

      const tieneCac = Number(movEditando.cac_valor_base || 0) > 0;
      setAplicarCAC(tieneCac);
      setCacMesBase(movEditando.cac_mes_base || serieCAC[0]?.periodo || 'OCT2026');
      setCacValorBaseTexto(
        numATextoArg(Number(movEditando.cac_valor_base || serieCAC[0]?.valor || 23884.2))
      );
      setCacMesActual(movEditando.cac_mes_actual || serieCAC[0]?.periodo || 'OCT2026');
      setCacValorActualTexto(
        numATextoArg(Number(movEditando.cac_valor_actual || serieCAC[0]?.valor || 23884.2))
      );
    } else {
      const proyInit =
        proyectos.find((p) => p.codigo === (proyectoFijoCodigo || proyectos[0]?.codigo)) || null;
      const usaCacProy = proyInit?.redeterminacion_tipo === 'Índice CAC';

      setTipo('Ingreso');
      setProyectoCodigo(proyInit?.codigo || '');
      setCategoria('Certificación de Obra');
      setConcepto('');
      setMoneda(usaCacProy ? 'ARS' : monedaInicial);
      setImporteTexto('');
      setValorUsdTexto('1.450');
      setFecha(hoyIso);
      setEstado('Abonado');
      setTipoComprobante('Factura C');
      setComprobante('');
      setArchivoUrl('');
      setNotas('');

      setAplicarCAC(usaCacProy);
      const mesB = proyInit?.cac_mes_base || serieCAC[0]?.periodo || 'OCT2026';
      const valB =
        Number(proyInit?.cac_valor_base || 0) ||
        serieCAC.find((s) => s.periodo === mesB)?.valor ||
        23884.2;
      const ultimo = serieCAC[0] || { periodo: 'OCT2026', valor: 23884.2 };

      setCacMesBase(mesB);
      setCacValorBaseTexto(numATextoArg(valB));
      setCacMesActual(ultimo.periodo);
      setCacValorActualTexto(numATextoArg(ultimo.valor));
    }
  }, [abierto, movEditando, proyectoFijoCodigo]);

  // Cálculo automático de Redeterminación CAC
  const calculoCAC = useMemo(() => {
    const montoBase = parsearNum(importeTexto);
    const cacBase = parsearNum(cacValorBaseTexto);
    const cacActual = parsearNum(cacValorActualTexto);

    if (!aplicarCAC || tipo !== 'Ingreso' || moneda !== 'ARS' || cacBase <= 0 || cacActual <= 0) {
      return {
        montoBase,
        coeficiente: 1,
        diferenciaCac: 0,
        totalAjustado: montoBase,
      };
    }

    const coeficiente = cacActual / cacBase;
    const totalAjustado = Math.round(montoBase * coeficiente * 100) / 100;
    const diferenciaCac = Math.round((totalAjustado - montoBase) * 100) / 100;

    return {
      montoBase,
      coeficiente,
      diferenciaCac,
      totalAjustado,
    };
  }, [aplicarCAC, tipo, moneda, importeTexto, cacValorBaseTexto, cacValorActualTexto]);

  if (!abierto || !montado) return null;

  const subirArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendoArchivo(true);
    try {
      const ruta = `movimientos/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const { error } = await supabase.storage
        .from('documentos')
        .upload(ruta, file, { upsert: true });
      if (!error) {
        const { data } = supabase.storage.from('documentos').getPublicUrl(ruta);
        setArchivoUrl(data.publicUrl);
      } else {
        const reader = new FileReader();
        reader.onload = () => setArchivoUrl(String(reader.result || ''));
        reader.readAsDataURL(file);
      }
    } finally {
      setSubiendoArchivo(false);
    }
  };

  const guardarMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cargando) return;
    setCargando(true);

    try {
      const cotUsd = parsearNum(valorUsdTexto) || 1450;
      const importeFinal = calculoCAC.totalAjustado;
      const importeUsd = moneda === 'USD' ? importeFinal : importeFinal / cotUsd;
      const proy = proyectos.find((p) => p.codigo === proyectoCodigo);

      const usaCacReal = aplicarCAC && tipo === 'Ingreso' && moneda === 'ARS';

      const payload: Record<string, any> = {
        tipo,
        proyecto_codigo: proy?.codigo || proyectoCodigo || null,
        proyecto_nombre: proy?.nombre || null,
        categoria,
        concepto: concepto.trim(),
        moneda,
        importe: importeFinal,
        monto: importeFinal,
        monto_base: calculoCAC.montoBase,
        diferencia_cac: usaCacReal ? calculoCAC.diferenciaCac : 0,
        cac_mes_base: usaCacReal ? cacMesBase : null,
        cac_valor_base: usaCacReal ? parsearNum(cacValorBaseTexto) : 0,
        cac_mes_actual: usaCacReal ? cacMesActual : null,
        cac_valor_actual: usaCacReal ? parsearNum(cacValorActualTexto) : 0,
        valor_usd: cotUsd,
        importe_usd: Math.round(importeUsd * 100) / 100,
        fecha,
        estado,
        tipo_comprobante: tipoComprobante,
        comprobante: comprobante.trim() || null,
        archivo_url: archivoUrl.trim() || null,
        notas: notas.trim() || null,
      };

      const { error } = movEditando
        ? await supabase.from('movimientos').update(payload).eq('id', movEditando.id)
        : await supabase.from('movimientos').insert([payload]);

      if (error) {
        alert('Error al guardar movimiento: ' + error.message);
        return;
      }

      onClose();
      onGuardado(
        movEditando
          ? 'Movimiento actualizado correctamente'
          : usaCacReal
          ? 'Ingreso con redeterminación CAC registrado'
          : 'Movimiento registrado correctamente'
      );
    } catch (err: any) {
      alert('Error inesperado: ' + (err?.message || 'Sin conexión'));
    } finally {
      setCargando(false);
    }
  };

  const eliminarMovimiento = async () => {
    if (!movEditando) return;
    setCargando(true);
    try {
      await moverAPapelera({
        tabla: 'movimientos',
        modulo: 'Finanzas',
        titulo: movEditando.concepto || 'Movimiento financiero',
        subtitulo: `${movEditando.moneda || 'ARS'} $${Number(movEditando.importe || 0).toLocaleString(
          'es-AR'
        )}`,
        registro: movEditando,
      });
      onClose();
      onGuardado('Movimiento enviado a papelera');
    } catch (err: any) {
      alert('Error al eliminar: ' + err.message);
    } finally {
      setCargando(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
      <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="px-6 pt-5 pb-4 border-b border-gray-800 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-white">
              {movEditando ? 'Editar Movimiento Financiero' : 'Registrar Movimiento Financiero'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Cobros de honorarios, certificaciones con redeterminación CAC y gastos de obra
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={guardarMovimiento} className="px-6 py-5 overflow-y-auto space-y-4">
          <div className="grid grid-cols-2 gap-2 bg-[#121212] p-1 rounded-xl border border-gray-800">
            {(['Ingreso', 'Egreso'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTipo(t);
                  if (t === 'Egreso') setAplicarCAC(false);
                }}
                className={`py-2 rounded-lg text-xs font-extrabold cursor-pointer transition-colors ${
                  tipo === t
                    ? t === 'Ingreso'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-rose-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {t === 'Ingreso' ? '+ Ingreso / Cobro' : '- Egreso / Gasto'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Proyecto / Obra
              </label>
              <select
                value={proyectoCodigo}
                disabled={Boolean(proyectoFijoCodigo)}
                onChange={(e) => {
                  const cod = e.target.value;
                  setProyectoCodigo(cod);
                  const pr = proyectos.find((p) => p.codigo === cod);
                  if (pr?.redeterminacion_tipo === 'Índice CAC' && tipo === 'Ingreso') {
                    setMoneda('ARS');
                    setAplicarCAC(true);
                    if (pr.cac_mes_base) setCacMesBase(pr.cac_mes_base);
                    if (Number(pr.cac_valor_base || 0) > 0) {
                      setCacValorBaseTexto(numATextoArg(Number(pr.cac_valor_base)));
                    }
                  }
                }}
                className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white"
              >
                <option value="">General del Estudio</option>
                {proyectos.map((p) => (
                  <option key={p.codigo} value={p.codigo}>
                    {p.codigo} · {p.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Categoría</label>
              <input
                type="text"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Concepto *</label>
            <input
              type="text"
              required
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Ej. Certificación N° 1 · Octubre 2026"
              className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                {aplicarCAC && tipo === 'Ingreso' && moneda === 'ARS'
                  ? 'Monto Base Original *'
                  : 'Moneda e Importe *'}
              </label>
              <div className="flex gap-1.5">
                <select
                  value={moneda}
                  onChange={(e) => setMoneda(e.target.value as 'ARS' | 'USD')}
                  className="bg-[#121212] border border-gray-800 rounded-lg px-2.5 py-2 text-xs font-extrabold text-white"
                >
                  <option value="ARS">ARS</option>
                  <option value="USD">USD</option>
                </select>
                <input
                  type="text"
                  required
                  value={importeTexto}
                  onChange={(e) => setImporteTexto(formatearMilesDecimales(e.target.value))}
                  placeholder="Ej. 15.000.000,00"
                  className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs font-bold text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Cotización USD
              </label>
              <input
                type="text"
                value={valorUsdTexto}
                onChange={(e) => setValorUsdTexto(formatearMilesDecimales(e.target.value))}
                className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Fecha *</label>
              <input
                type="date"
                required
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white [color-scheme:dark]"
              />
            </div>
          </div>

          {/* MÓDULO DE REDETERMINACIÓN POR ÍNDICE CAC PARA INGRESOS EN ARS */}
          {tipo === 'Ingreso' && moneda === 'ARS' && (
            <div className="bg-[#141414] border border-gray-800 rounded-xl p-4 space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-[#EAB308]" />
                  <div>
                    <div className="text-xs font-bold text-white">
                      Ajuste por Redeterminación · Índice CAC (CAMARCO)
                    </div>
                    <div className="text-[11px] text-gray-400">
                      Calcula automáticamente la diferencia entre el índice cerrado y el índice actual
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={aplicarCAC}
                  onChange={(e) => setAplicarCAC(e.target.checked)}
                  className="w-4 h-4 accent-[#EAB308] cursor-pointer"
                />
              </label>

              {aplicarCAC && (
                <div className="pt-3 border-t border-gray-800 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-[#121212] border border-gray-800 rounded-lg p-3 space-y-2">
                      <div className="text-[11px] font-bold text-gray-300">
                        1. Índice CAC Cerrado (Base)
                      </div>
                      <select
                        value={cacMesBase}
                        onChange={(e) => {
                          setCacMesBase(e.target.value);
                          const f = serieCAC.find((s) => s.periodo === e.target.value);
                          if (f) setCacValorBaseTexto(numATextoArg(f.valor));
                        }}
                        className="w-full bg-[#181818] border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      >
                        {serieCAC.map((s) => (
                          <option key={s.periodo} value={s.periodo}>
                            {s.periodo} · {s.etiqueta}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={cacValorBaseTexto}
                        onChange={(e) =>
                          setCacValorBaseTexto(formatearMilesDecimales(e.target.value))
                        }
                        className="w-full bg-[#181818] border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white"
                      />
                    </div>

                    <div className="bg-[#121212] border border-gray-800 rounded-lg p-3 space-y-2">
                      <div className="text-[11px] font-bold text-gray-300">
                        2. Índice CAC Actual (Certificación)
                      </div>
                      <select
                        value={cacMesActual}
                        onChange={(e) => {
                          setCacMesActual(e.target.value);
                          const f = serieCAC.find((s) => s.periodo === e.target.value);
                          if (f) setCacValorActualTexto(numATextoArg(f.valor));
                        }}
                        className="w-full bg-[#181818] border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      >
                        {serieCAC.map((s) => (
                          <option key={s.periodo} value={s.periodo}>
                            {s.periodo} · {s.etiqueta}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={cacValorActualTexto}
                        onChange={(e) =>
                          setCacValorActualTexto(formatearMilesDecimales(e.target.value))
                        }
                        className="w-full bg-[#181818] border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#EAB308]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-[#121212] border border-gray-800 rounded-lg p-3 text-xs">
                    <div>
                      <div className="text-[10px] text-gray-400">Monto Base</div>
                      <div className="font-bold text-white mt-0.5">
                        ARS ${calculoCAC.montoBase.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-400">
                        Diferencia CAC ({((calculoCAC.coeficiente - 1) * 100).toFixed(2)}%)
                      </div>
                      <div className="font-bold text-[#EAB308] mt-0.5">
                        + ARS $
                        {calculoCAC.diferenciaCac.toLocaleString('es-AR', {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-400">Total Redeterminado</div>
                      <div className="font-extrabold text-emerald-400 mt-0.5">
                        ARS $
                        {calculoCAC.totalAjustado.toLocaleString('es-AR', {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Estado</label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white"
              >
                <option value="Abonado">Abonado</option>
                <option value="Resta abonar">Resta abonar</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Tipo Comprobante
              </label>
              <select
                value={tipoComprobante}
                onChange={(e) => setTipoComprobante(e.target.value)}
                className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white"
              >
                <option value="Factura C">Factura C</option>
                <option value="Factura A">Factura A</option>
                <option value="Recibo">Recibo</option>
                <option value="Certificado">Certificado</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                N° Comprobante
              </label>
              <input
                type="text"
                value={comprobante}
                onChange={(e) => setComprobante(e.target.value)}
                className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="bg-[#121212] border border-gray-800 hover:border-[#EAB308] px-3 py-2 rounded-lg text-xs font-bold text-gray-200 inline-flex items-center gap-1.5 cursor-pointer">
              {subiendoArchivo ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5 text-[#EAB308]" />
              )}
              <span>Adjuntar PDF / Comprobante</span>
              <input type="file" onChange={subirArchivo} className="hidden" />
            </label>
            <div className="flex-1 min-w-[200px] flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                value={archivoUrl}
                onChange={(e) => setArchivoUrl(e.target.value)}
                placeholder="O pegar URL de Drive..."
                className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-gray-800">
            <div>
              {movEditando && (
                <button
                  type="button"
                  onClick={eliminarMovimiento}
                  disabled={cargando}
                  className="text-rose-400 hover:text-rose-300 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Enviar a papelera
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs text-gray-300 hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={cargando}
                className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-5 py-2 rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {cargando ? 'Guardando...' : 'Guardar Movimiento'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}