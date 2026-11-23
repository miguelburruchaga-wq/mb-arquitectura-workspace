"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { moverAPapelera } from '@/lib/papelera';
import { extraerDatosFacturaPdf } from '@/lib/leerFacturaPdf';
import { X, Upload, FileText, RefreshCw, Loader2, Trash2 } from 'lucide-react';

const CATEGORIAS_INGRESO = [
  'Honorarios Proyecto',
  'Anticipo de Obra',
  'Certificación de Avance',
  'Dirección de Obra',
  'Consultoría / Asesoramiento',
  'Otros Ingresos',
];

const CATEGORIAS_EGRESO = [
  'Compras y Materiales de Obra',
  'Compra / Materiales',
  'Mano de Obra / Subcontratistas',
  'Asesores y Calculistas',
  'Gastos de Obra',
  'Fletes y Logística',
  'Impuestos y Tasas',
  'Gastos Administrativos',
];

export default function ModalMovimientoFinanciero({
  abierto,
  onClose,
  onGuardado,
  movEditando = null,
  proyectos = [],
  clientes = [],
  proveedores = [],
  proyectoFijoCodigo = '',
  monedaInicial = 'USD',
}: {
  abierto: boolean;
  onClose: () => void;
  onGuardado: (mensaje: string, monedaGuardada?: 'USD' | 'ARS') => void;
  movEditando?: any | null;
  proyectos?: any[];
  clientes?: any[];
  proveedores?: any[];
  proyectoFijoCodigo?: string;
  monedaInicial?: 'USD' | 'ARS';
}) {
  const [montado, setMontado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [subiendoPdf, setSubiendoPdf] = useState(false);
  const [leyendoPdf, setLeyendoPdf] = useState(false);
  const [consultandoBna, setConsultandoBna] = useState(false);

  const [tipo, setTipo] = useState<'Ingreso' | 'Egreso'>('Ingreso');
  const [categoria, setCategoria] = useState('Honorarios Proyecto');
  const [comprobante, setComprobante] = useState('');
  const [concepto, setConcepto] = useState('');
  const [moneda, setMoneda] = useState<'USD' | 'ARS'>(monedaInicial);
  const [importe, setImporte] = useState('');
  const [tipoComprobante, setTipoComprobante] = useState('Factura A');
  const [estado, setEstado] = useState('Abonado');
  const [archivoUrl, setArchivoUrl] = useState('');
  const [archivoNombre, setArchivoNombre] = useState('');
  const [formaPago, setFormaPago] = useState('Transferencia');
  const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0]);
  const [proyectoCodigo, setProyectoCodigo] = useState(proyectoFijoCodigo);
  const [clienteId, setClienteId] = useState('');
  const [proveedorNombre, setProveedorNombre] = useState('');
  const [notas, setNotas] = useState('');

  const [mostrarMasDatos, setMostrarMasDatos] = useState(false);
  const [fechaConversion, setFechaConversion] = useState(() => new Date().toISOString().split('T')[0]);
  const [valorUsd, setValorUsd] = useState('');
  const [importeUsd, setImporteUsd] = useState('');

  useEffect(() => {
    setMontado(true);
  }, []);

  const parsearNumero = (val: string) => {
    if (!val) return 0;
    const limpio = String(val).replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
    const num = parseFloat(limpio);
    return isNaN(num) ? 0 : num;
  };

  const formatearMiles = (val: string) => {
    const soloDigitos = val.replace(/\D/g, '');
    if (!soloDigitos) return '';
    return Number(soloDigitos).toLocaleString('es-AR');
  };

  const recalcularImporteUsd = (impStr: string, cotStr: string) => {
    const imp = parsearNumero(impStr);
    const cot = parsearNumero(cotStr);
    if (imp > 0 && cot > 0) {
      const res = imp / cot;
      setImporteUsd(
        res.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      );
    } else {
      setImporteUsd('');
    }
  };

  const consultarDolarBna = async (fechaTarget: string, importeActual: string) => {
    if (!fechaTarget) return;
    setConsultandoBna(true);
    try {
      const res = await fetch(`/api/dolar-bna?fecha=${fechaTarget}`);
      const data = await res.json();
      if (data?.valor) {
        const cotStr = Number(data.valor).toLocaleString('es-AR', {
          minimumFractionDigits: data.valor % 1 === 0 ? 0 : 2,
          maximumFractionDigits: 2,
        });
        setValorUsd(cotStr);
        recalcularImporteUsd(importeActual, cotStr);
      }
    } catch {
      // Silencioso
    } finally {
      setConsultandoBna(false);
    }
  };

  useEffect(() => {
    if (!abierto) return;
    const hoy = new Date().toISOString().split('T')[0];

    if (movEditando) {
      const t = String(movEditando.tipo || '').toLowerCase();
      const tipoMov: 'Ingreso' | 'Egreso' =
        t === 'egreso' || t === 'gasto' || t === 'compra' ? 'Egreso' : 'Ingreso';
      const monMov: 'USD' | 'ARS' =
        (movEditando.moneda || 'USD').toUpperCase() === 'ARS' ? 'ARS' : 'USD';
      const impRaw = Number(movEditando.importe ?? 0) || Number(movEditando.monto ?? 0);

      setTipo(tipoMov);
      setCategoria(
        movEditando.categoria ||
          (tipoMov === 'Ingreso' ? 'Honorarios Proyecto' : 'Compras y Materiales de Obra')
      );
      setComprobante(movEditando.comprobante || '');
      setConcepto(movEditando.concepto || '');
      setMoneda(monMov);
      setImporte(
        impRaw
          ? impRaw.toLocaleString('es-AR', {
              minimumFractionDigits: impRaw % 1 === 0 ? 0 : 2,
              maximumFractionDigits: 2,
            })
          : ''
      );
      setTipoComprobante(movEditando.tipo_comprobante || 'Factura A');
      setEstado(movEditando.estado || (tipoMov === 'Ingreso' ? 'Abonado' : 'Resta abonar'));
      setArchivoUrl(movEditando.archivo_url || '');
      setArchivoNombre(movEditando.archivo_nombre || '');
      setFormaPago(movEditando.forma_pago || 'Transferencia');
      setFecha(movEditando.fecha || hoy);

      const proyEnc = proyectos.find(
        (p) =>
          movEditando.proyecto_codigo === p.codigo ||
          movEditando.proyecto === `${p.codigo} · ${p.nombre}` ||
          movEditando.proyecto === p.codigo ||
          movEditando.proyecto === p.nombre
      );
      setProyectoCodigo(proyEnc ? proyEnc.codigo : proyectoFijoCodigo || '');
      setClienteId(movEditando.cliente_id ? String(movEditando.cliente_id) : '');
      setProveedorNombre(movEditando.proveedor || '');
      setNotas(movEditando.notas || '');
      setMostrarMasDatos(Boolean(movEditando.valor_usd || movEditando.importe_usd || monMov === 'ARS'));
      setFechaConversion(movEditando.fecha_conversion || movEditando.fecha || hoy);
      setValorUsd(
        movEditando.valor_usd
          ? Number(movEditando.valor_usd).toLocaleString('es-AR', {
              minimumFractionDigits: Number(movEditando.valor_usd) % 1 === 0 ? 0 : 2,
              maximumFractionDigits: 2,
            })
          : ''
      );
      setImporteUsd(
        movEditando.importe_usd
          ? Number(movEditando.importe_usd).toLocaleString('es-AR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : ''
      );
    } else {
      const proyBase = proyectos.find((p) => p.codigo === proyectoFijoCodigo);
      setTipo('Ingreso');
      setCategoria('Honorarios Proyecto');
      setComprobante('');
      setConcepto('');
      setMoneda(monedaInicial);
      setImporte('');
      setTipoComprobante('Factura A');
      setEstado('Abonado');
      setArchivoUrl('');
      setArchivoNombre('');
      setFormaPago('Transferencia');
      setFecha(hoy);
      setProyectoCodigo(proyectoFijoCodigo || '');
      setClienteId(proyBase?.cliente_id ? String(proyBase.cliente_id) : '');
      setProveedorNombre('');
      setNotas('');
      setMostrarMasDatos(monedaInicial === 'ARS');
      setFechaConversion(hoy);
      setValorUsd('');
      setImporteUsd('');
      if (monedaInicial === 'ARS') {
        consultarDolarBna(hoy, '');
      }
    }
  }, [abierto, movEditando, proyectoFijoCodigo, monedaInicial]);

  if (!abierto || !montado) return null;

  const cambiarTipoMovimiento = (nuevoTipo: 'Ingreso' | 'Egreso') => {
    setTipo(nuevoTipo);
    if (nuevoTipo === 'Ingreso') {
      setCategoria('Honorarios Proyecto');
      setEstado('Abonado');
    } else {
      setCategoria('Compras y Materiales de Obra');
      setEstado('Resta abonar');
    }
  };

  const seleccionarProyecto = (cod: string) => {
    setProyectoCodigo(cod);
    if (cod) {
      const proy = proyectos.find((p) => p.codigo === cod);
      if (proy?.cliente_id) {
        setClienteId(String(proy.cliente_id));
      }
    }
  };

  const manejarAdjuntoPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setSubiendoPdf(true);
    setArchivoNombre(archivo.name);

    try {
      const ruta = `finanzas/${Date.now()}_${archivo.name.replace(/\s+/g, '_')}`;
      const { error: upErr } = await supabase.storage
        .from('comprobantes')
        .upload(ruta, archivo, { upsert: true });

      if (!upErr) {
        const { data: pub } = supabase.storage.from('comprobantes').getPublicUrl(ruta);
        setArchivoUrl(pub.publicUrl);
      } else {
        const reader = new FileReader();
        reader.onload = () => setArchivoUrl(String(reader.result || ''));
        reader.readAsDataURL(archivo);
      }
    } catch {
      const reader = new FileReader();
      reader.onload = () => setArchivoUrl(String(reader.result || ''));
      reader.readAsDataURL(archivo);
    } finally {
      setSubiendoPdf(false);
    }

    if (archivo.type === 'application/pdf' || archivo.name.toLowerCase().endsWith('.pdf')) {
      setLeyendoPdf(true);
      const extraido = await extraerDatosFacturaPdf(archivo);
      setLeyendoPdf(false);

      const nuevoImporte = extraido.importe || importe;
      const nuevaFecha = extraido.fechaDetectada || fecha;

      if (extraido.importe) setImporte(extraido.importe);
      if (extraido.nroFactura) setComprobante(extraido.nroFactura);
      if (extraido.fechaDetectada) {
        setFecha(extraido.fechaDetectada);
        setFechaConversion(extraido.fechaDetectada);
      }
      if (!concepto.trim() && extraido.conceptoSugerido) {
        setConcepto(extraido.conceptoSugerido);
      }

      if (moneda === 'ARS') {
        setMostrarMasDatos(true);
        await consultarDolarBna(nuevaFecha, nuevoImporte);
      }
    }
  };

  const abrirArchivoAdjunto = (url: string) => {
    if (!url) return;
    if (url.startsWith('data:')) {
      const win = window.open();
      if (win) {
        win.document.write(
          `<iframe src="${url}" frameborder="0" style="border:0;width:100%;height:100vh;" allowfullscreen></iframe>`
        );
      }
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const guardarMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);

    const proy = proyectos.find((p) => p.codigo === proyectoCodigo);
    const etiquetaProyecto = proy ? `${proy.codigo} · ${proy.nombre}` : 'General';
    const impNum = parsearNumero(importe);
    const cotNum = parsearNumero(valorUsd);
    const impUsdNum =
      moneda === 'USD'
        ? impNum
        : parsearNumero(importeUsd) || (cotNum > 0 ? Number((impNum / cotNum).toFixed(2)) : 0);

    const datos = {
      fecha,
      tipo,
      categoria:
        categoria.trim() ||
        (tipo === 'Ingreso' ? 'Honorarios Proyecto' : 'Compras y Materiales de Obra'),
      comprobante: comprobante.trim() || null,
      tipo_comprobante: tipoComprobante,
      concepto: concepto.trim(),
      moneda,
      importe: impNum,
      monto: impNum,
      estado,
      proyecto: etiquetaProyecto,
      proyecto_codigo: proy?.codigo || null,
      proyecto_nombre: proy?.nombre || null,
      cliente_id: clienteId ? Number(clienteId) : proy?.cliente_id || null,
      proveedor: proveedorNombre || null,
      forma_pago: formaPago,
      archivo_url: archivoUrl || null,
      archivo_nombre: archivoNombre || null,
      notas: notas.trim() || null,
      fecha_conversion: fechaConversion || fecha,
      valor_usd: cotNum || null,
      importe_usd: impUsdNum || null,
    };

    const { error } = movEditando
      ? await supabase.from('movimientos').update(datos).eq('id', movEditando.id)
      : await supabase.from('movimientos').insert([datos]);

    setCargando(false);

    if (!error) {
      onClose();
      onGuardado(
        movEditando
          ? 'Movimiento actualizado'
          : proy
          ? `Movimiento registrado y vinculado a ${proy.nombre}`
          : 'Movimiento financiero registrado',
        moneda
      );
    } else {
      alert('Error al guardar movimiento: ' + error.message);
    }
  };

  const eliminarMovimiento = async () => {
    if (!movEditando) return;
    setCargando(true);
    try {
      const val = Number(movEditando.importe ?? 0) || Number(movEditando.monto ?? 0);
      const mon = (movEditando.moneda || moneda).toUpperCase();
      await moverAPapelera({
        tabla: 'movimientos',
        modulo: 'Finanzas',
        titulo: movEditando.concepto || 'Movimiento sin concepto',
        subtitulo: `${movEditando.tipo || ''} · ${mon} $${val.toLocaleString('es-AR')} ${
          movEditando.proyecto ? `· ${movEditando.proyecto}` : ''
        }`.trim(),
        registro: movEditando,
      });
      onClose();
      onGuardado('Movimiento enviado a papelera');
    } catch (error: any) {
      alert('Error al mover a papelera: ' + error.message);
    } finally {
      setCargando(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4">
      <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800 w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="px-6 pt-6 pb-4 flex justify-between items-start border-b border-gray-800">
          <div>
            <h2 className="text-lg font-bold text-white">
              {movEditando ? 'Detalle del Movimiento Financiero' : 'Nuevo Movimiento Financiero'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Registro multimoneda de honorarios, cobros y gastos
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={guardarMovimiento} className="px-6 py-5 overflow-y-auto space-y-4">
          <div className="grid grid-cols-2 bg-[#121212] border border-gray-800 rounded-xl p-1 gap-1">
            <button
              type="button"
              onClick={() => cambiarTipoMovimiento('Ingreso')}
              className={`py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                tipo === 'Ingreso'
                  ? 'bg-emerald-500 text-black shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              + Ingreso / Honorario
            </button>
            <button
              type="button"
              onClick={() => cambiarTipoMovimiento('Egreso')}
              className={`py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                tipo === 'Egreso'
                  ? 'bg-rose-500 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              − Egreso / Costo
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Categoría</label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white"
              >
                {(tipo === 'Ingreso' ? CATEGORIAS_INGRESO : CATEGORIAS_EGRESO).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Nro. Factura / Recibo
              </label>
              <input
                type="text"
                value={comprobante}
                onChange={(e) => setComprobante(e.target.value)}
                placeholder="Ej. FAC-A-0003-00189"
                className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Concepto / Detalle *
            </label>
            <input
              type="text"
              required
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Ej. Certificación #02 Proyecto Ejecutivo Casa Terrazas"
              className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Moneda *</label>
              <select
                value={moneda}
                onChange={(e) => {
                  const m = e.target.value as 'USD' | 'ARS';
                  setMoneda(m);
                  if (m === 'ARS') {
                    setMostrarMasDatos(true);
                    consultarDolarBna(fechaConversion || fecha, importe);
                  }
                }}
                className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white"
              >
                <option value="USD">USD</option>
                <option value="ARS">ARS</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Importe *</label>
              <input
                type="text"
                required
                value={importe}
                onChange={(e) => {
                  setImporte(e.target.value);
                  recalcularImporteUsd(e.target.value, valorUsd);
                }}
                placeholder="0,00"
                className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Comprobante
              </label>
              <select
                value={tipoComprobante}
                onChange={(e) => setTipoComprobante(e.target.value)}
                className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white"
              >
                <option value="Factura A">Factura A</option>
                <option value="Factura B">Factura B</option>
                <option value="Factura C">Factura C</option>
                <option value="Recibo">Recibo</option>
                <option value="Remito">Remito</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Archivo PDF del Comprobante
              </label>
              <label className="border border-dashed border-[#EAB308]/60 hover:border-[#EAB308] bg-[#EAB308]/5 rounded-lg px-3 py-2.5 flex items-center justify-center gap-2 text-xs font-bold text-[#EAB308] cursor-pointer transition-colors">
                {leyendoPdf || subiendoPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{leyendoPdf ? 'Leyendo PDF...' : 'Subiendo...'}</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span className="truncate">{archivoNombre || 'Cargar archivo PDF'}</span>
                  </>
                )}
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={manejarAdjuntoPdf}
                  className="hidden"
                />
              </label>
              {archivoUrl && (
                <div className="flex items-center justify-between text-[11px] mt-1.5 px-1">
                  <button
                    type="button"
                    onClick={() => abrirArchivoAdjunto(archivoUrl)}
                    className="text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <FileText className="w-3 h-3" /> Ver comprobante
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setArchivoUrl('');
                      setArchivoNombre('');
                    }}
                    className="text-rose-400 hover:underline cursor-pointer"
                  >
                    Quitar
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Forma de pago
              </label>
              <select
                value={formaPago}
                onChange={(e) => setFormaPago(e.target.value)}
                className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white"
              >
                <option value="Transferencia">Transferencia</option>
                <option value="Efectivo">Efectivo</option>
                <option value="Cheque / E-Cheq">Cheque / E-Cheq</option>
                <option value="Tarjeta de Crédito / Débito">Tarjeta de Crédito / Débito</option>
                <option value="Cuenta Corriente">Cuenta Corriente</option>
              </select>
            </div>
          </div>

          <div className="bg-[#141414] border border-gray-800 rounded-xl p-3.5 space-y-3">
            <button
              type="button"
              onClick={() => setMostrarMasDatos(!mostrarMasDatos)}
              className="w-full flex items-center justify-between text-xs font-bold text-white cursor-pointer"
            >
              <span>
                {mostrarMasDatos ? '−' : '+'} Más datos (opcional){' '}
                <span className="text-gray-400 font-normal">
                  conversión ARS a USD: fecha de cobro, valor USD e importe USD
                </span>
              </span>
            </button>

            {mostrarMasDatos && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                    Fecha de cobro
                  </label>
                  <input
                    type="date"
                    value={fechaConversion}
                    onChange={(e) => {
                      setFechaConversion(e.target.value);
                      consultarDolarBna(e.target.value, importe);
                    }}
                    className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white [color-scheme:dark]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-gray-300">
                      Valor USD
                    </label>
                    <button
                      type="button"
                      onClick={() => consultarDolarBna(fechaConversion || fecha, importe)}
                      disabled={consultandoBna}
                      className="text-[10px] font-bold text-[#EAB308] hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw
                        className={`w-2.5 h-2.5 ${consultandoBna ? 'animate-spin' : ''}`}
                      />
                      Traer BNA
                    </button>
                  </div>
                  <input
                    type="text"
                    value={valorUsd}
                    onChange={(e) => {
                      const f = formatearMiles(e.target.value);
                      setValorUsd(f);
                      recalcularImporteUsd(importe, f);
                    }}
                    placeholder="Ej. 1.430"
                    className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                    Importe USD
                  </label>
                  <input
                    type="text"
                    value={importeUsd}
                    readOnly
                    placeholder="0,00"
                    className="w-full bg-[#121212] border border-[#EAB308]/40 rounded-lg px-3 py-2 text-xs font-extrabold text-[#EAB308]"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Fecha *</label>
              <input
                type="date"
                required
                value={fecha}
                onChange={(e) => {
                  setFecha(e.target.value);
                  setFechaConversion(e.target.value);
                  if (moneda === 'ARS') consultarDolarBna(e.target.value, importe);
                }}
                className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white [color-scheme:dark]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Corresponde al Proyecto (Opcional)
              </label>
              <select
                value={proyectoCodigo}
                onChange={(e) => seleccionarProyecto(e.target.value)}
                disabled={Boolean(proyectoFijoCodigo)}
                className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white disabled:opacity-90"
              >
                {!proyectoFijoCodigo && (
                  <option value="">General (Sin proyecto específico)</option>
                )}
                {proyectos.map((p) => (
                  <option key={p.codigo} value={p.codigo}>
                    {p.codigo} · {p.nombre} ({p.estado || 'En Diseño'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Cliente (Opcional)
              </label>
              <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white"
              >
                <option value="">Ninguno</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.codigo ? `${c.codigo} - ` : ''}
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Proveedor / Asesor (Opcional)
              </label>
              <select
                value={proveedorNombre}
                onChange={(e) => setProveedorNombre(e.target.value)}
                className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white"
              >
                <option value="">Ninguno</option>
                {proveedores.map((prov) => (
                  <option key={prov.id} value={prov.nombre}>
                    {prov.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Estado</label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white"
              >
                <option value="Abonado">Abonado</option>
                <option value="Resta abonar">Resta abonar</option>
                <option value="Cobrado">Cobrado</option>
                <option value="Facturado">Facturado</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Finalizado">Finalizado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Notas / Observaciones
            </label>
            <textarea
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Medio de pago, cuenta bancaria, cuotas o aclaraciones..."
              className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 resize-none"
            />
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-gray-800/80">
            <div>
              {movEditando && (
                <button
                  type="button"
                  onClick={eliminarMovimiento}
                  disabled={cargando}
                  className="text-red-500 hover:bg-red-500/15 px-3.5 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" /> Enviar a papelera
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="text-gray-300 hover:text-white px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={cargando}
                className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-5 py-2.5 rounded-lg font-bold text-xs cursor-pointer"
              >
                {cargando
                  ? 'Guardando...'
                  : movEditando
                  ? 'Guardar Cambios'
                  : 'Registrar Movimiento'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}