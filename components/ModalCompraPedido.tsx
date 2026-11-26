"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { moverAPapelera } from '@/lib/papelera';
import { extraerDatosFacturaPdf } from '@/lib/leerFacturaPdf';
import VisorArchivoModal from '@/components/VisorArchivoModal';
import {
  X,
  Upload,
  Link2,
  Trash2,
  Loader2,
  Paperclip,
  ChevronDown,
  RefreshCw,
  Sparkles,
  Eye,
} from 'lucide-react';

function formatearMilesDecimales(valorCrudo: string): string {
  const limpio = valorCrudo.replace(/[^\d,]/g, '');
  if (!limpio) return '';
  const partes = limpio.split(',');
  const enteros = partes[0].replace(/^0+(?=\d)/, '');
  const conPuntos = enteros.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (partes.length > 1) return `${conPuntos || '0'},${partes[1].slice(0, 2)}`;
  return conPuntos;
}

function parsearNum(valor: string | number): number {
  if (typeof valor === 'number') return valor;
  const s = String(valor || '').trim();
  if (!s) return 0;
  // Elimina todos los puntos de miles y convierte la coma decimal en punto
  const normalizado = s.replace(/\./g, '').replace(',', '.');
  return parseFloat(normalizado) || 0;
}

function numATextoArg(n: number): string {
  if (!n) return '';
  return n.toLocaleString('es-AR', {
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

const OPCIONES_MONEDA: ('ARS' | 'USD')[] = ['ARS', 'USD'];
const OPCIONES_ESTADO = ['Encargado', 'En tránsito', 'Entregado', 'Pendiente de pago'];
const OPCIONES_COMPROBANTE = ['Factura', 'Factura A', 'Factura C', 'Remito', 'Orden de Compra'];

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
  const [montado, setMontado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const [buscandoDolar, setBuscandoDolar] = useState(false);
  const [infoAutoLectura, setInfoAutoLectura] = useState<string | null>(null);
  const [visorPrevio, setVisorPrevio] = useState(false);

  const hoy = new Date().toISOString().split('T')[0];

  const [proyectoCodigo, setProyectoCodigo] = useState(
    proyectoFijoCodigo || proyectos[0]?.codigo || ''
  );

  const [dropAbierto, setDropAbierto] = useState<
    null | 'proyecto' | 'proveedor' | 'moneda' | 'estado' | 'comprobante'
  >(null);
  const refContenedorForm = useRef<HTMLFormElement>(null);

  const [proveedor, setProveedor] = useState('');
  const [cuitProveedor, setCuitProveedor] = useState('');
  const [concepto, setConcepto] = useState('');
  const [moneda, setMoneda] = useState<'ARS' | 'USD'>('ARS');
  const [importeTexto, setImporteTexto] = useState('');
  const [valorUsdTexto, setValorUsdTexto] = useState('1.450,00');
  const [estado, setEstado] = useState('Encargado');
  const [fecha, setFecha] = useState(hoy);
  const [nroOrden, setNroOrden] = useState('');
  const [tipoComprobante, setTipoComprobante] = useState('Factura');
  const [archivoUrl, setArchivoUrl] = useState('');
  const [archivoNombre, setArchivoNombre] = useState('');
  const [notas, setNotas] = useState('');

  useEffect(() => {
    setMontado(true);
  }, []);

  useEffect(() => {
    const cerrarAlClickAfuera = (e: MouseEvent) => {
      if (refContenedorForm.current && !refContenedorForm.current.contains(e.target as Node)) {
        setDropAbierto(null);
      }
    };
    document.addEventListener('mousedown', cerrarAlClickAfuera);
    return () => document.removeEventListener('mousedown', cerrarAlClickAfuera);
  }, []);

  const consultarDolarFecha = async (fechaIso: string) => {
    setBuscandoDolar(true);
    try {
      const [y, m, d] = String(fechaIso || hoy).split('-');
      let cotizacion = 0;

      if (y && m && d) {
        const resHist = await fetch(
          `https://api.argentinadatos.com/v1/cotizaciones/dolares/oficial/${y}/${m}/${d}`
        );
        if (resHist.ok) {
          const dataHist = await resHist.json();
          cotizacion = Number(dataHist?.venta || dataHist?.compra || 0);
        }
      }

      if (!cotizacion) {
        const resActual = await fetch('https://dolarapi.com/v1/dolares/oficial');
        if (resActual.ok) {
          const dataAct = await resActual.json();
          cotizacion = Number(dataAct?.venta || dataAct?.compra || 0);
        }
      }

      if (cotizacion > 0) {
        setValorUsdTexto(numATextoArg(cotizacion));
      }
    } catch {
      // Mantiene valor actual si no hay respuesta
    } finally {
      setBuscandoDolar(false);
    }
  };

  useEffect(() => {
    if (!abierto) return;
    const hoyIso = new Date().toISOString().split('T')[0];
    setInfoAutoLectura(null);
    setDropAbierto(null);

    if (compraEditando) {
      setProyectoCodigo(compraEditando.proyecto_codigo || proyectoFijoCodigo || '');
      setProveedor(compraEditando.proveedor || '');
      setCuitProveedor(compraEditando.cuit || '');
      setConcepto(compraEditando.concepto || '');
      setMoneda(String(compraEditando.moneda || 'ARS').toUpperCase() === 'USD' ? 'USD' : 'ARS');
      setImporteTexto(numATextoArg(Number(compraEditando.importe || 0)));
      setValorUsdTexto(numATextoArg(Number(compraEditando.valor_usd || 1450)));
      setEstado(compraEditando.estado || 'Encargado');
      setFecha(compraEditando.fecha || hoyIso);
      setNroOrden(compraEditando.nro_orden || '');
      setTipoComprobante(compraEditando.tipo_comprobante || 'Factura');
      setArchivoUrl(compraEditando.archivo_url || '');
      setArchivoNombre(compraEditando.archivo_nombre || '');
      setNotas(compraEditando.notas || '');
    } else {
      setProyectoCodigo(proyectoFijoCodigo || proyectos[0]?.codigo || '');
      setProveedor('');
      setCuitProveedor('');
      setConcepto('');
      setMoneda('ARS');
      setImporteTexto('');
      setEstado('Encargado');
      setFecha(hoyIso);
      setNroOrden('');
      setTipoComprobante('Factura');
      setArchivoUrl('');
      setArchivoNombre('');
      setNotas('');
      consultarDolarFecha(hoyIso);
    }
  }, [abierto, compraEditando, proyectoFijoCodigo]);

  const proyectoSeleccionado = useMemo(
    () => proyectos.find((p) => p.codigo === proyectoCodigo),
    [proyectos, proyectoCodigo]
  );

  const proveedoresFiltradosDrop = useMemo(() => {
    const q = proveedor.trim().toLowerCase();
    if (!q) return proveedores;
    return proveedores.filter(
      (pr) =>
        pr.nombre.toLowerCase().includes(q) ||
        String(pr.cuit || '').toLowerCase().includes(q)
    );
  }, [proveedores, proveedor]);

  const equivalenteUsdCalculado = useMemo(() => {
    const imp = parsearNum(importeTexto);
    const cot = parsearNum(valorUsdTexto) || 1450;
    if (imp <= 0) return 0;
    if (moneda === 'USD') return imp;
    return Math.round((imp / cot) * 100) / 100;
  }, [importeTexto, valorUsdTexto, moneda]);

  if (!abierto || !montado) return null;

  const procesarArchivoFactura = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendoArchivo(true);
    setInfoAutoLectura(null);

    try {
      // 1. Subir archivo a Supabase Storage (o fallback DataURL)
      const ruta = `compras/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
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

      if (!archivoNombre) setArchivoNombre(file.name);

      // 2. Extraer datos reales del PDF usando lib/leerFacturaPdf.ts (pdfjs-dist)
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const detectado = await extraerDatosFacturaPdf(file);
        const camposCompletados: string[] = [];

        if (detectado.nroFactura) {
          setNroOrden(detectado.nroFactura);
          camposCompletados.push(`Factura ${detectado.nroFactura}`);
        }

        if (detectado.fechaDetectada) {
          setFecha(detectado.fechaDetectada);
          await consultarDolarFecha(detectado.fechaDetectada);
          camposCompletados.push(`Fecha ${detectado.fechaDetectada.split('-').reverse().join('/')}`);
        }

        if (detectado.cuitDetectado) {
          setCuitProveedor(detectado.cuitDetectado);
          const cuitLimpio = detectado.cuitDetectado.replace(/\D/g, '');
          const provMatch = proveedores.find(
            (pr) => String(pr.cuit || '').replace(/\D/g, '') === cuitLimpio
          );
          if (provMatch) {
            setProveedor(provMatch.nombre);
            camposCompletados.push(`Proveedor ${provMatch.nombre}`);
          } else {
            if (detectado.proveedorSugerido && !proveedor) {
              setProveedor(detectado.proveedorSugerido);
            }
            camposCompletados.push(`CUIT ${detectado.cuitDetectado}`);
          }
        } else if (detectado.proveedorSugerido && !proveedor) {
          setProveedor(detectado.proveedorSugerido);
          camposCompletados.push(`Proveedor ${detectado.proveedorSugerido}`);
        }

        if (detectado.importe) {
          setImporteTexto(detectado.importe);
          camposCompletados.push(`Subtotal $${detectado.importe}`);
        }

        if (detectado.monedaDetectada) {
          setMoneda(detectado.monedaDetectada);
        }

        if (camposCompletados.length > 0) {
          setInfoAutoLectura(`Datos extraídos: ${camposCompletados.join(' · ')}`);
        } else {
          setInfoAutoLectura('Comprobante adjuntado.');
        }
      }
    } finally {
      setSubiendoArchivo(false);
    }
  };

  const limpiarComprobante = () => {
    setArchivoUrl('');
    setArchivoNombre('');
    setInfoAutoLectura(null);
  };

  const guardarCompra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cargando) return;
    setCargando(true);

    try {
      const imp = parsearNum(importeTexto);
      const cot = parsearNum(valorUsdTexto) || 1450;
      const impUsd = moneda === 'USD' ? imp : Math.round((imp / cot) * 100) / 100;
      const proy = proyectos.find((p) => p.codigo === proyectoCodigo);
      const proveedorFinal = proveedor.trim() || 'Proveedor general';

      const payload: Record<string, any> = {
        proyecto_codigo: proy?.codigo || proyectoCodigo || null,
        proyecto_nombre: proy?.nombre || null,
        proveedor: proveedorFinal,
        cuit: cuitProveedor.trim() || null,
        concepto: concepto.trim(),
        nro_orden: nroOrden.trim() || null,
        tipo_comprobante: tipoComprobante,
        fecha,
        moneda,
        importe: imp,
        valor_usd: cot,
        importe_usd: impUsd,
        estado,
        archivo_url: archivoUrl.trim() || null,
        notas: notas.trim() || null,
      };

      if (compraEditando) {
        const { error } = await supabase
          .from('compras')
          .update(payload)
          .eq('id', compraEditando.id);
        if (error) {
          alert('Error al actualizar compra: ' + error.message);
          return;
        }
      } else {
        const { error } = await supabase.from('compras').insert([payload]);
        if (error) {
          alert('Error al guardar compra: ' + error.message);
          return;
        }

        await supabase.from('movimientos').insert([
          {
            tipo: 'Egreso',
            proyecto_codigo: proy?.codigo || proyectoCodigo || null,
            proyecto_nombre: proy?.nombre || null,
            categoria: 'Compras / Materiales',
            concepto: `${proveedorFinal} · ${concepto.trim()}`,
            moneda,
            importe: imp,
            monto: imp,
            valor_usd: cot,
            importe_usd: impUsd,
            fecha,
            estado: estado === 'Pendiente de pago' ? 'Resta abonar' : 'Abonado',
            tipo_comprobante: tipoComprobante,
            comprobante: nroOrden.trim() || null,
            archivo_url: archivoUrl.trim() || null,
          },
        ]);
      }

      onClose();
      onGuardado(
        compraEditando
          ? 'Compra actualizada correctamente'
          : 'Compra registrada y vinculada a Finanzas'
      );
    } catch (err: any) {
      alert('Error inesperado: ' + (err?.message || 'Sin conexión'));
    } finally {
      setCargando(false);
    }
  };

  const eliminarCompra = async () => {
    if (!compraEditando) return;
    setCargando(true);
    try {
      await moverAPapelera({
        tabla: 'compras',
        modulo: 'Compras y Pedidos',
        titulo: `${compraEditando.proveedor || 'Proveedor'} · ${compraEditando.concepto || ''}`,
        subtitulo: compraEditando.nro_orden || '',
        registro: compraEditando,
      });
      onClose();
      onGuardado('Compra enviada a papelera');
    } catch (err: any) {
      alert('Error al eliminar: ' + err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <>
      {createPortal(
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
          <div className="bg-[#161616] border border-gray-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
            {/* ENCABEZADO */}
            <div className="px-6 pt-5 pb-4 border-b border-gray-800/80 flex justify-between items-start">
              <div>
                <h2 className="text-lg font-extrabold text-white">
                  {compraEditando ? 'Editar Pedido / Compra' : 'Nuevo Pedido / Compra'}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Suministros vinculados al proyecto, proveedor y comprobante adjunto
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[#222] hover:bg-gray-800 text-gray-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              ref={refContenedorForm}
              onSubmit={guardarCompra}
              className="px-6 py-5 overflow-y-auto space-y-4"
            >
              {/* CORRESPONDE AL PROYECTO / OBRA */}
              <div className="relative">
                <label className="block text-xs font-bold text-gray-200 mb-1.5">
                  Corresponde al Proyecto / Obra <span className="text-[#EAB308]">*</span>
                </label>
                <button
                  type="button"
                  disabled={Boolean(proyectoFijoCodigo)}
                  onClick={() =>
                    setDropAbierto((prev) => (prev === 'proyecto' ? null : 'proyecto'))
                  }
                  className="w-full bg-[#1C1C1C] border border-gray-700 hover:border-gray-600 rounded-xl px-4 py-3 text-left flex items-center justify-between cursor-pointer"
                >
                  {proyectoSeleccionado ? (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-[#292512] border border-[#EAB308]/60 text-[#FACC15] px-2.5 py-0.5 rounded-md text-[10px] font-extrabold tracking-wide">
                          {proyectoSeleccionado.codigo}
                        </span>
                        <span className="bg-[#0F2438] border border-sky-500/40 text-sky-300 px-2.5 py-0.5 rounded-md text-[10px] font-bold">
                          {proyectoSeleccionado.estado || 'En Curso'}
                        </span>
                      </div>
                      <div className="text-sm font-extrabold text-white">
                        {proyectoSeleccionado.nombre}
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-200 font-semibold">General del Estudio</span>
                  )}
                  {!proyectoFijoCodigo && <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>

                {dropAbierto === 'proyecto' && !proyectoFijoCodigo && (
                  <div className="absolute left-0 right-0 mt-1.5 bg-[#1C1C1C] border border-gray-700 rounded-2xl shadow-2xl py-2 z-50 max-h-56 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setProyectoCodigo('');
                        setDropAbierto(null);
                      }}
                      className="w-full px-4 py-2.5 text-left text-xs text-gray-300 hover:bg-white/5 cursor-pointer"
                    >
                      General del Estudio
                    </button>
                    {proyectos.map((p) => (
                      <button
                        key={p.codigo}
                        type="button"
                        onClick={() => {
                          setProyectoCodigo(p.codigo);
                          setDropAbierto(null);
                        }}
                        className="w-full px-4 py-2.5 text-left hover:bg-white/5 cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <span className="text-[11px] font-extrabold text-[#D4EE36] mr-2.5">
                            {p.codigo}
                          </span>
                          <span className="text-xs font-extrabold text-white">{p.nombre}</span>
                        </div>
                        <span className="text-[11px] text-gray-400">{p.estado || 'En Curso'}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* PROVEEDOR / CONTRATISTA + CUIT */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2 relative">
                  <label className="block text-xs font-bold text-gray-200 mb-1.5">
                    Proveedor / Contratista
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={proveedor}
                      onFocus={() => setDropAbierto('proveedor')}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProveedor(val);
                        setDropAbierto('proveedor');
                        const encontrado = proveedores.find(
                          (pr) => pr.nombre.toLowerCase() === val.trim().toLowerCase()
                        );
                        if (encontrado?.cuit) setCuitProveedor(encontrado.cuit);
                      }}
                      placeholder="Proveedor general"
                      className="w-full bg-[#1C1C1C] border border-gray-700 focus:border-gray-500 rounded-xl pl-3.5 pr-9 py-2.5 text-xs font-semibold text-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setDropAbierto((prev) => (prev === 'proveedor' ? null : 'proveedor'))
                      }
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>

                  {dropAbierto === 'proveedor' && (
                    <div className="absolute left-0 right-0 mt-1.5 bg-[#1C1C1C] border border-gray-700 rounded-2xl shadow-2xl py-2 z-50 max-h-52 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setProveedor('Proveedor general');
                          setDropAbierto(null);
                        }}
                        className="w-full px-4 py-2.5 text-left text-xs text-gray-300 hover:bg-white/5 cursor-pointer"
                      >
                        Proveedor general
                      </button>
                      {proveedoresFiltradosDrop.map((pr) => (
                        <button
                          key={pr.id}
                          type="button"
                          onClick={() => {
                            setProveedor(pr.nombre);
                            if (pr.cuit) setCuitProveedor(pr.cuit);
                            setDropAbierto(null);
                          }}
                          className="w-full px-4 py-2.5 text-left hover:bg-white/5 cursor-pointer flex items-center justify-between gap-2"
                        >
                          <span className="text-xs font-extrabold text-white truncate">
                            {pr.nombre}
                          </span>
                          {pr.cuit && (
                            <span className="text-[11px] text-gray-400 flex-shrink-0">
                              {pr.cuit}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-200 mb-1.5">CUIT</label>
                  <input
                    type="text"
                    value={cuitProveedor}
                    onChange={(e) => setCuitProveedor(e.target.value)}
                    placeholder="30-XXXXXXXX-X"
                    className="w-full bg-[#1C1C1C] border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white"
                  />
                </div>
              </div>

              {/* CONCEPTO DEL PEDIDO */}
              <div>
                <label className="block text-xs font-bold text-gray-200 mb-1.5">
                  Concepto del Pedido <span className="text-[#EAB308]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={concepto}
                  onChange={(e) => setConcepto(e.target.value)}
                  placeholder="Ej. Colado de 32 m³ de Hormigón H-30 con bomba pluma"
                  className="w-full bg-[#1C1C1C] border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white"
                />
              </div>

              {/* MONEDA + SUBTOTAL / IMPORTE + ESTADO */}
              <div className="grid grid-cols-3 gap-3">
                <div className="relative">
                  <label className="block text-xs font-bold text-gray-200 mb-1.5">
                    Moneda <span className="text-[#EAB308]">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setDropAbierto((prev) => (prev === 'moneda' ? null : 'moneda'))
                    }
                    className="w-full bg-[#1C1C1C] border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs font-extrabold text-white flex items-center justify-between cursor-pointer"
                  >
                    <span>{moneda}</span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>
                  {dropAbierto === 'moneda' && (
                    <div className="absolute left-0 right-0 mt-1.5 bg-[#1C1C1C] border border-gray-700 rounded-2xl shadow-2xl py-1.5 z-50">
                      {OPCIONES_MONEDA.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            setMoneda(m);
                            setDropAbierto(null);
                          }}
                          className="w-full px-4 py-2 text-left text-xs font-extrabold text-white hover:bg-white/5 cursor-pointer"
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-200 mb-1.5">
                    Subtotal / Importe <span className="text-[#EAB308]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={importeTexto}
                    onChange={(e) => setImporteTexto(formatearMilesDecimales(e.target.value))}
                    placeholder="0,00"
                    className="w-full bg-[#1C1C1C] border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white"
                  />
                </div>

                <div className="relative">
                  <label className="block text-xs font-bold text-gray-200 mb-1.5">Estado</label>
                  <button
                    type="button"
                    onClick={() =>
                      setDropAbierto((prev) => (prev === 'estado' ? null : 'estado'))
                    }
                    className="w-full bg-[#1C1C1C] border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white flex items-center justify-between cursor-pointer"
                  >
                    <span className="truncate">{estado}</span>
                    <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </button>
                  {dropAbierto === 'estado' && (
                    <div className="absolute left-0 right-0 mt-1.5 bg-[#1C1C1C] border border-gray-700 rounded-2xl shadow-2xl py-1.5 z-50">
                      {OPCIONES_ESTADO.map((est) => (
                        <button
                          key={est}
                          type="button"
                          onClick={() => {
                            setEstado(est);
                            setDropAbierto(null);
                          }}
                          className="w-full px-4 py-2 text-left text-xs font-bold text-white hover:bg-white/5 cursor-pointer"
                        >
                          {est}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* COTIZACIÓN AUTOMÁTICA DÓLAR DE LA FECHA + EQUIVALENTE USD */}
              <div className="bg-[#1C1C1C] border border-gray-800 rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">
                    Dólar BNA ({fecha.split('-').reverse().join('/')}):
                  </span>
                  <input
                    type="text"
                    value={valorUsdTexto}
                    onChange={(e) => setValorUsdTexto(formatearMilesDecimales(e.target.value))}
                    className="w-24 bg-[#121212] border border-gray-700 rounded-lg px-2 py-1 text-xs font-bold text-white text-right"
                  />
                  <button
                    type="button"
                    onClick={() => consultarDolarFecha(fecha)}
                    title="Actualizar cotización BNA de la fecha"
                    className="text-[#EAB308] hover:opacity-80 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${buscandoDolar ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <div className="font-extrabold text-[#EAB308]">
                  Equivalente: USD $
                  {equivalenteUsdCalculado.toLocaleString('es-AR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>

              <p className="text-[11px] text-gray-400 -mt-2">
                Esta compra se registra automáticamente como Egreso en Finanzas y en el balance del proyecto.
              </p>

              {/* FECHA + NRO. ORDEN / FACTURA + TIPO DE COMPROBANTE */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-200 mb-1.5">Fecha</label>
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => {
                      const nuevaFecha = e.target.value;
                      setFecha(nuevaFecha);
                      if (nuevaFecha) consultarDolarFecha(nuevaFecha);
                    }}
                    className="w-full bg-[#1C1C1C] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white [color-scheme:dark]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-200 mb-1.5">
                    Nro. Orden / Factura
                  </label>
                  <input
                    type="text"
                    value={nroOrden}
                    onChange={(e) => setNroOrden(e.target.value)}
                    placeholder="Ej. OC-2026-084"
                    className="w-full bg-[#1C1C1C] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div className="relative">
                  <label className="block text-xs font-bold text-gray-200 mb-1.5">
                    Tipo de Comprobante
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setDropAbierto((prev) => (prev === 'comprobante' ? null : 'comprobante'))
                    }
                    className="w-full bg-[#1C1C1C] border border-gray-700 rounded-xl px-3 py-2 text-xs font-bold text-white flex items-center justify-between cursor-pointer"
                  >
                    <span className="truncate">{tipoComprobante}</span>
                    <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </button>
                  {dropAbierto === 'comprobante' && (
                    <div className="absolute left-0 right-0 mt-1.5 bg-[#1C1C1C] border border-gray-700 rounded-2xl shadow-2xl py-1.5 z-50">
                      {OPCIONES_COMPROBANTE.map((tc) => (
                        <button
                          key={tc}
                          type="button"
                          onClick={() => {
                            setTipoComprobante(tc);
                            setDropAbierto(null);
                          }}
                          className="w-full px-4 py-2 text-left text-xs font-bold text-white hover:bg-white/5 cursor-pointer"
                        >
                          {tc}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* COMPROBANTE ADJUNTO (FACTURA) */}
              <div className="bg-[#1C1C1C] border border-gray-800 rounded-2xl p-4 space-y-3">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-[#EAB308]" />
                    Comprobante Adjunto (Factura)
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Subí un archivo desde tu dispositivo (autocompleta subtotal, factura, CUIT y fecha) o pegá abajo un enlace externo.
                  </p>
                </div>

                <label className="border-2 border-dashed border-gray-700 hover:border-[#EAB308] rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-[#151515]">
                  {subiendoArchivo ? (
                    <Loader2 className="w-6 h-6 text-[#EAB308] animate-spin mb-1.5" />
                  ) : (
                    <Upload className="w-6 h-6 text-[#EAB308] mb-1.5" />
                  )}
                  <span className="text-xs font-extrabold text-[#EAB308]">
                    {subiendoArchivo
                      ? 'Analizando y subiendo factura...'
                      : 'Hacé clic aquí para adjuntar un archivo (PDF, imagen, plano, planilla)'}
                  </span>
                  <span className="text-[11px] text-gray-400 mt-1">
                    {archivoUrl
                      ? `Comprobante vinculado: ${archivoNombre || 'Archivo adjunto ✓'}`
                      : 'Las fotos se optimizan solas. Para archivos pesados (+450 KB), pegá el enlace de Google Drive abajo.'}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,image/*,.xls,.xlsx,.doc,.docx"
                    onChange={procesarArchivoFactura}
                    className="hidden"
                  />
                </label>

                {infoAutoLectura && (
                  <div className="bg-emerald-950/60 border border-emerald-700/50 rounded-lg px-3 py-2 text-[11px] text-emerald-300 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{infoAutoLectura}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-[11px] font-bold text-gray-300 flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5 text-[#EAB308]" />
                      O pegar enlace externo (Google Drive, Dropbox, OneDrive):
                    </label>

                    {archivoUrl && (
                      <div className="inline-flex items-center gap-2 text-[11px] font-bold">
                        <button
                          type="button"
                          onClick={() => setVisorPrevio(true)}
                          className="text-sky-400 hover:text-sky-300 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" /> Ver
                        </button>
                        <button
                          type="button"
                          onClick={limpiarComprobante}
                          className="text-rose-400 hover:text-rose-300 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" /> Eliminar
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={archivoUrl.startsWith('data:') ? '' : archivoUrl}
                      onChange={(e) => setArchivoUrl(e.target.value)}
                      placeholder={
                        archivoUrl.startsWith('data:')
                          ? 'Archivo cargado desde dispositivo ✓'
                          : 'https://drive.google.com/...'
                      }
                      className="md:col-span-2 bg-[#141414] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                    <input
                      type="text"
                      value={archivoNombre}
                      onChange={(e) => setArchivoNombre(e.target.value)}
                      placeholder="Nombre visible (opcional)"
                      className="bg-[#141414] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              {/* DETALLE / NOTAS DE ENTREGA */}
              <div>
                <label className="block text-xs font-bold text-gray-200 mb-1.5">
                  Detalle / Notas de Entrega
                </label>
                <textarea
                  rows={2}
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Plazo de entrega, condiciones de acopio..."
                  className="w-full bg-[#1C1C1C] border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white resize-none"
                />
              </div>

              {/* PIE DE ACCIONES */}
              <div className="flex justify-between items-center pt-3 border-t border-gray-800">
                <div>
                  {compraEditando && (
                    <button
                      type="button"
                      onClick={eliminarCompra}
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
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={cargando}
                    className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-5 py-2.5 rounded-xl text-xs font-extrabold cursor-pointer disabled:opacity-50"
                  >
                    {cargando ? 'Guardando...' : 'Guardar Compra'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* VISOR PREVIA DEL COMPROBANTE ADJUNTO */}
      <VisorArchivoModal
        abierto={visorPrevio}
        url={archivoUrl}
        titulo={archivoNombre || 'Vista previa del comprobante'}
        onClose={() => setVisorPrevio(false)}
      />
    </>
  );
}