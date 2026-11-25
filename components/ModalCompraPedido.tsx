"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { moverAPapelera } from '@/lib/papelera';
import { extraerDatosFacturaPdf } from '@/lib/leerFacturaPdf';
import {
  ShoppingCart,
  X,
  Upload,
  RefreshCw,
  Loader2,
  Trash2,
} from 'lucide-react';

export default function ModalCompraPedido({
  abierto,
  onClose,
  onGuardado,
  compraEditando = null,
  proyectos = [],
  proveedores = [],
  proyectoFijoCodigo = '',
}: {
  abierto: boolean;
  onClose: () => void;
  onGuardado: (mensaje: string) => void;
  compraEditando?: any | null;
  proyectos?: any[];
  proveedores?: any[];
  proyectoFijoCodigo?: string;
}) {
  const [cargando, setCargando] = useState(false);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const [leyendoPdf, setLeyendoPdf] = useState(false);
  const [consultandoBna, setConsultandoBna] = useState(false);

  const [proyectoCodigo, setProyectoCodigo] = useState(
    proyectoFijoCodigo || proyectos[0]?.codigo || ''
  );
  const [proveedor, setProveedor] = useState(proveedores[0]?.nombre || '');
  const [concepto, setConcepto] = useState('');
  const [moneda, setMoneda] = useState<'ARS' | 'USD'>('ARS');
  const [importe, setImporte] = useState('');
  const [estado, setEstado] = useState('Encargado');
  const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0]);
  const [nroOrden, setNroOrden] = useState('');
  const [tipoComprobante, setTipoComprobante] = useState('Factura');
  const [archivoUrl, setArchivoUrl] = useState('');
  const [archivoNombre, setArchivoNombre] = useState('');
  const [enlaceExterno, setEnlaceExterno] = useState('');
  const [enlaceNombre, setEnlaceNombre] = useState('');
  const [notas, setNotas] = useState('');

  const [mostrarMasDatos, setMostrarMasDatos] = useState(true);
  const [fechaConversion, setFechaConversion] = useState(
    () => new Date().toISOString().split('T')[0]
  );
  const [valorUsd, setValorUsd] = useState('');
  const [importeUsd, setImporteUsd] = useState('');

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
      } else if (valorUsd) {
        recalcularImporteUsd(importeActual, valorUsd);
      }
    } catch {
      if (valorUsd) {
        recalcularImporteUsd(importeActual, valorUsd);
      }
    } finally {
      setConsultandoBna(false);
    }
  };

  useEffect(() => {
    if (!abierto) return;
    const hoy = new Date().toISOString().split('T')[0];

    if (compraEditando) {
      setProyectoCodigo(
        compraEditando.proyecto_codigo || proyectoFijoCodigo || proyectos[0]?.codigo || ''
      );
      setProveedor(
        compraEditando.proveedor || (proveedores.length > 0 ? proveedores[0].nombre : '')
      );
      setConcepto(compraEditando.concepto || '');
      setMoneda(compraEditando.moneda === 'USD' ? 'USD' : 'ARS');
      setImporte(
        compraEditando.importe
          ? Number(compraEditando.importe).toLocaleString('es-AR', {
              minimumFractionDigits: Number(compraEditando.importe) % 1 === 0 ? 0 : 2,
              maximumFractionDigits: 2,
            })
          : ''
      );
      setEstado(compraEditando.estado || 'Encargado');
      setFecha(compraEditando.fecha || hoy);
      setNroOrden(compraEditando.nro_orden || '');
      setTipoComprobante(compraEditando.tipo_comprobante || 'Factura');
      setArchivoUrl(compraEditando.archivo_url || '');
      setArchivoNombre(compraEditando.archivo_nombre || '');
      setEnlaceExterno(compraEditando.enlace_externo || '');
      setEnlaceNombre(compraEditando.enlace_nombre || '');
      setNotas(compraEditando.notas || '');
      setMostrarMasDatos(true);
      setFechaConversion(compraEditando.fecha_conversion || compraEditando.fecha || hoy);
      setValorUsd(
        compraEditando.valor_usd
          ? Number(compraEditando.valor_usd).toLocaleString('es-AR', {
              minimumFractionDigits: Number(compraEditando.valor_usd) % 1 === 0 ? 0 : 2,
              maximumFractionDigits: 2,
            })
          : ''
      );
      setImporteUsd(
        compraEditando.importe_usd
          ? Number(compraEditando.importe_usd).toLocaleString('es-AR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : ''
      );
    } else {
      setProyectoCodigo(proyectoFijoCodigo || proyectos[0]?.codigo || '');
      setProveedor(proveedores.length > 0 ? proveedores[0].nombre : '');
      setConcepto('');
      setMoneda('ARS');
      setImporte('');
      setEstado('Encargado');
      setFecha(hoy);
      setNroOrden('');
      setTipoComprobante('Factura');
      setArchivoUrl('');
      setArchivoNombre('');
      setEnlaceExterno('');
      setEnlaceNombre('');
      setNotas('');
      setMostrarMasDatos(true);
      setFechaConversion(hoy);
      setValorUsd('');
      setImporteUsd('');
      consultarDolarBna(hoy, '');
    }
  }, [abierto, compraEditando, proyectoFijoCodigo]);

  if (!abierto) return null;

  const manejarAdjunto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setSubiendoArchivo(true);
    setArchivoNombre(archivo.name);

    try {
      const ruta = `compras/${Date.now()}_${archivo.name.replace(/\s+/g, '_')}`;
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
      setSubiendoArchivo(false);
    }

    if (archivo.type === 'application/pdf' || archivo.name.toLowerCase().endsWith('.pdf')) {
      setImporte('');
      setNroOrden('');
      setImporteUsd('');
      setLeyendoPdf(true);
      const extraido = await extraerDatosFacturaPdf(archivo);
      setLeyendoPdf(false);

      const nuevoImporte = extraido.importe || '';
      const nuevaFecha = extraido.fechaDetectada || fecha;

      setImporte(nuevoImporte);
      setNroOrden(extraido.nroFactura || '');
      if (extraido.fechaDetectada) {
        setFecha(extraido.fechaDetectada);
        setFechaConversion(extraido.fechaDetectada);
      }
      if (!concepto.trim() && extraido.conceptoSugerido) {
        setConcepto(extraido.conceptoSugerido);
      }

      if (extraido.monedaDetectada) {
        setMoneda(extraido.monedaDetectada);
      }

      // Autodetectar proveedor si su nombre figura en el PDF
      if (extraido.textoCompleto && proveedores.length > 0) {
        const textoLower = extraido.textoCompleto.toLowerCase();
        const provMatch = proveedores.find((p) => {
          const nombreClean = String(p.nombre || '')
            .toLowerCase()
            .replace(/\b(s\.?a\.?|s\.?r\.?l\.?|s\.?a\.?s\.?)\b/g, '')
            .trim();
          return nombreClean.length >= 4 && textoLower.includes(nombreClean);
        });
        if (provMatch) {
          setProveedor(provMatch.nombre);
        }
      }

      // Recalcular inmediatamente con la cotización ya cargada y luego actualizar desde BNA
      if (valorUsd && nuevoImporte) {
        recalcularImporteUsd(nuevoImporte, valorUsd);
      }
      setMostrarMasDatos(true);
      await consultarDolarBna(nuevaFecha, nuevoImporte);
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

  const guardarCompra = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);

    const proy = proyectos.find((p) => p.codigo === proyectoCodigo);
    const impNum = parsearNumero(importe);
    const cotNum = parsearNumero(valorUsd);
    const impUsdNum =
      moneda === 'USD'
        ? impNum
        : parsearNumero(importeUsd) || (cotNum > 0 ? Number((impNum / cotNum).toFixed(2)) : 0);

    const datosCompra = {
      proyecto_id: proy?.id ? String(proy.id) : null,
      proyecto_codigo: proy?.codigo || proyectoCodigo,
      proyecto_nombre: proy?.nombre || '',
      proyecto_estado: proy?.estado || 'En Diseño',
      proveedor: proveedor || 'Proveedor general',
      concepto: concepto.trim(),
      moneda,
      importe: impNum,
      estado,
      fecha,
      nro_orden: nroOrden.trim() || null,
      tipo_comprobante: tipoComprobante,
      archivo_url: archivoUrl || null,
      archivo_nombre: archivoNombre || null,
      enlace_externo: enlaceExterno.trim() || null,
      enlace_nombre: enlaceNombre.trim() || null,
      notas: notas.trim() || null,
      fecha_conversion: fechaConversion || fecha,
      valor_usd: cotNum || null,
      importe_usd: impUsdNum || null,
    };

    const { error } = compraEditando
      ? await supabase.from('compras').update(datosCompra).eq('id', compraEditando.id)
      : await supabase.from('compras').insert([datosCompra]);

    if (!error) {
      const etiquetaProy = proy ? `${proy.codigo} · ${proy.nombre}` : proyectoCodigo;

      if (impNum > 0) {
        const movDatos = {
          fecha: fechaConversion || fecha,
          tipo: 'Egreso',
          categoria: 'Compras y Materiales de Obra',
          concepto: `${concepto.trim()} · ${proveedor || 'Proveedor'}`,
          proyecto: etiquetaProy,
          proyecto_codigo: proy?.codigo || proyectoCodigo,
          proyecto_nombre: proy?.nombre || '',
          cliente_id: proy?.cliente_id || null,
          proveedor: proveedor || null,
          moneda,
          importe: impNum,
          monto: impNum,
          estado: estado === 'Pagado' || estado === 'Entregado' ? 'Abonado' : 'Resta abonar',
          comprobante: nroOrden.trim() || null,
          tipo_comprobante: tipoComprobante,
          archivo_url: archivoUrl || null,
          archivo_nombre: archivoNombre || null,
          fecha_conversion: fechaConversion || fecha,
          valor_usd: cotNum || null,
          importe_usd: impUsdNum || null,
        };

        if (compraEditando?.movimiento_id) {
          await supabase.from('movimientos').update(movDatos).eq('id', compraEditando.movimiento_id);
        } else if (!compraEditando) {
          await supabase.from('movimientos').insert([movDatos]);
        }
      }

      setCargando(false);
      onClose();
      onGuardado(compraEditando ? 'Pedido actualizado' : 'Compra registrada y enviada a Finanzas');
    } else {
      setCargando(false);
      alert('Error al guardar el pedido: ' + error.message);
    }
  };

  const eliminarCompra = async () => {
    if (!compraEditando) return;
    setCargando(true);
    try {
      await moverAPapelera({
        tabla: 'compras',
        modulo: 'Compras y Pedidos',
        titulo: compraEditando.concepto || 'Compra sin concepto',
        subtitulo: `${compraEditando.proveedor || ''} · ${compraEditando.moneda || 'ARS'} ${compraEditando.importe || 0}`,
        registro: compraEditando,
      });
      onClose();
      onGuardado('Compra enviada a papelera');
    } catch (error: any) {
      alert('Error al mover a papelera: ' + error.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800 w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="px-6 pt-6 pb-4 flex justify-between items-start border-b border-gray-800/80">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-[#EAB308]" />
              {compraEditando ? 'Editar Pedido / Compra' : 'Nuevo Pedido / Compra'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Suministros vinculados al proyecto, proveedor y comprobante adjunto
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={guardarCompra} className="px-6 py-5 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Corresponde al Proyecto / Obra *
              </label>
              <select
                required
                value={proyectoCodigo}
                onChange={(e) => setProyectoCodigo(e.target.value)}
                className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white min-h-[44px]"
              >
                {proyectos.map((p) => (
                  <option key={p.codigo} value={p.codigo}>
                    {p.codigo} — {p.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Proveedor / Contratista
              </label>
              <select
                value={proveedor}
                onChange={(e) => setProveedor(e.target.value)}
                className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white min-h-[44px]"
              >
                {proveedores.length === 0 ? (
                  <option value="">Sin proveedores cargados</option>
                ) : (
                  proveedores.map((prov) => (
                    <option key={prov.id} value={prov.nombre}>
                      {prov.nombre}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Concepto del Pedido *
            </label>
            <input
              type="text"
              required
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Ej. Materiales eléctricos, hierro, sanitarios..."
              className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Moneda *</label>
              <select
                value={moneda}
                onChange={(e) => setMoneda(e.target.value as 'ARS' | 'USD')}
                className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white"
              >
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
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
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Estado</label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white"
              >
                <option value="Encargado">Encargado</option>
                <option value="En Acopio">En Acopio</option>
                <option value="Entregado">Entregado</option>
                <option value="Pagado">Pagado</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Fecha</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => {
                  setFecha(e.target.value);
                  setFechaConversion(e.target.value);
                  consultarDolarBna(e.target.value, importe);
                }}
                className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white [color-scheme:dark]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Nro. Orden / Factura
              </label>
              <input
                type="text"
                value={nroOrden}
                onChange={(e) => setNroOrden(e.target.value)}
                placeholder="0001-00001234"
                className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Tipo de Comprobante
              </label>
              <select
                value={tipoComprobante}
                onChange={(e) => setTipoComprobante(e.target.value)}
                className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white"
              >
                <option value="Factura">Factura</option>
                <option value="Remito">Remito</option>
                <option value="Presupuesto">Presupuesto</option>
                <option value="Recibo">Recibo</option>
              </select>
            </div>
          </div>

          <div className="bg-[#141414] border border-gray-800 rounded-xl p-4 space-y-3">
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-1.5">
                📎 Comprobante Adjunto (Factura)
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Subí un archivo desde tu dispositivo o pegá abajo un enlace externo (Google Drive,
                Dropbox, Nube).
              </p>
            </div>

            <label className="border border-dashed border-gray-700 hover:border-[#EAB308]/60 bg-[#121212] rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-colors">
              {leyendoPdf || subiendoArchivo ? (
                <div className="flex items-center gap-2 text-xs text-[#EAB308] font-bold">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {leyendoPdf ? 'Extrayendo datos de factura PDF...' : 'Subiendo archivo...'}
                </div>
              ) : (
                <>
                  <Upload className="w-5 h-5 text-[#EAB308] mb-2" />
                  <div className="text-sm font-bold text-[#EAB308]">
                    {archivoNombre
                      ? `Adjunto: ${archivoNombre}`
                      : 'Hacé clic aquí para adjuntar un archivo (PDF, imagen, plano, planilla)'}
                  </div>
                  <div className="text-xs text-gray-400 mt-1 max-w-md">
                    Las fotos se optimizan solas. Para archivos pesados (+450 KB), pegá el enlace de
                    Google Drive abajo.
                  </div>
                </>
              )}
              <input
                type="file"
                accept=".pdf,image/*,.xls,.xlsx,.dwg"
                onChange={manejarAdjunto}
                className="hidden"
              />
            </label>

            {archivoNombre && (
              <div className="flex items-center justify-between bg-[#1A1A1A] border border-gray-800 rounded-lg px-3 py-2 text-xs">
                <span className="truncate text-gray-200">{archivoNombre}</span>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {archivoUrl && (
                    <button
                      type="button"
                      onClick={() => abrirArchivoAdjunto(archivoUrl)}
                      className="text-blue-400 hover:underline font-semibold cursor-pointer"
                    >
                      Ver archivo
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setArchivoUrl('');
                      setArchivoNombre('');
                    }}
                    className="text-rose-400 hover:underline font-semibold cursor-pointer"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2 pt-1">
              <div className="text-xs text-gray-300 font-medium flex items-center gap-1.5">
                🔗 O pegar enlace externo (Google Drive, Dropbox, OneDrive):
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={enlaceExterno}
                  onChange={(e) => setEnlaceExterno(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="md:col-span-2 bg-[#121212] border border-gray-800 rounded-lg px-3 py-2.5 text-xs text-white placeholder-gray-500"
                />
                <input
                  type="text"
                  value={enlaceNombre}
                  onChange={(e) => setEnlaceNombre(e.target.value)}
                  placeholder="Nombre visible (opcional)"
                  className="bg-[#121212] border border-gray-800 rounded-lg px-3 py-2.5 text-xs text-white placeholder-gray-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-[#141414] border border-gray-800 rounded-xl p-4 space-y-3">
            <button
              type="button"
              onClick={() => setMostrarMasDatos(!mostrarMasDatos)}
              className="w-full flex items-center justify-between text-xs font-bold text-white cursor-pointer"
            >
              <span>
                {mostrarMasDatos ? '−' : '+'} Más datos (opcional){' '}
                <span className="text-gray-400 font-normal">
                  conversión ARS a USD: fecha, valor USD e importe USD
                </span>
              </span>
            </button>

            {mostrarMasDatos && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                    Fecha
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

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Detalle / Notas de Entrega
            </label>
            <textarea
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Plazo de entrega, condiciones de acopio..."
              className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 resize-none"
            />
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-gray-800/80">
            <div>
              {compraEditando && (
                <button
                  type="button"
                  onClick={eliminarCompra}
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
                  : compraEditando
                  ? 'Guardar Cambios'
                  : 'Registrar Pedido'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}