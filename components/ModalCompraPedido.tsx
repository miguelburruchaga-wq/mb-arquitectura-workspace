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
  AlertTriangle,
  FileCheck2,
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

function normalizarNroComprobante(nro: string): string {
  return String(nro || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

const OPCIONES_MONEDA: ('ARS' | 'USD')[] = ['ARS', 'USD'];
const OPCIONES_ESTADO = ['Encargado', 'En tránsito', 'Entregado', 'Pendiente de pago'];
const OPCIONES_COMPROBANTE = [
  'Factura',
  'Factura A',
  'Factura C',
  'Nota de Crédito',
  'Remito',
  'Orden de Compra',
];

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
  const [listaProveedores, setListaProveedores] = useState<any[]>(proveedores);
  const [facturasCargadas, setFacturasCargadas] = useState<any[]>([]);
  const [facturaAsociadaId, setFacturaAsociadaId] = useState<string>('');
  const [alertaDuplicado, setAlertaDuplicado] = useState<{
    mensaje: string;
    detalle?: string;
  } | null>(null);

  const hoy = new Date().toISOString().split('T')[0];

  const [proyectoCodigo, setProyectoCodigo] = useState(
    proyectoFijoCodigo || proyectos[0]?.codigo || ''
  );

  const [dropAbierto, setDropAbierto] = useState<
    null | 'proyecto' | 'proveedor' | 'moneda' | 'estado' | 'comprobante' | 'factura_nc'
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
    if (proveedores && proveedores.length > 0) {
      setListaProveedores(proveedores);
    }
  }, [proveedores]);

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
      // Mantiene valor actual
    } finally {
      setBuscandoDolar(false);
    }
  };

  useEffect(() => {
    if (!abierto) return;
    const hoyIso = new Date().toISOString().split('T')[0];
    setInfoAutoLectura(null);
    setAlertaDuplicado(null);
    setDropAbierto(null);
    setFacturaAsociadaId('');

    Promise.all([
      supabase
        .from('proveedores')
        .select('id, codigo, nombre, cuit, rubro')
        .order('nombre', { ascending: true }),
      supabase
        .from('compras')
        .select(
          'id, proyecto_codigo, proyecto_nombre, proveedor, cuit, concepto, nro_orden, tipo_comprobante, fecha, moneda, importe, valor_usd, importe_usd, estado'
        )
        .order('fecha', { ascending: false }),
    ]).then(([resProv, resComp]) => {
      if (resProv.data && resProv.data.length > 0) {
        setListaProveedores(resProv.data);
      }
      if (Array.isArray(resComp.data)) {
        const soloFacturas = resComp.data.filter(
          (c: any) => c.tipo_comprobante !== 'Nota de Crédito'
        );
        setFacturasCargadas(soloFacturas);
      }
    });

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
    if (!q || q === 'proveedor general') return listaProveedores;
    const coincidencias = listaProveedores.filter(
      (pr) =>
        pr.nombre.toLowerCase().includes(q) ||
        String(pr.cuit || '').toLowerCase().includes(q)
    );
    return coincidencias.length > 0 ? coincidencias : listaProveedores;
  }, [listaProveedores, proveedor]);

  const facturasDisponiblesNc = useMemo(() => {
    const provNorm = proveedor.trim().toLowerCase();
    const filtradas = facturasCargadas.filter((f) => {
      if (proyectoFijoCodigo && f.proyecto_codigo !== proyectoFijoCodigo) return false;
      if (
        provNorm &&
        provNorm !== 'proveedor general' &&
        String(f.proveedor || '').toLowerCase() !== provNorm
      ) {
        return false;
      }
      return true;
    });
    return filtradas.length > 0 ? filtradas : facturasCargadas;
  }, [facturasCargadas, proveedor, proyectoFijoCodigo]);

  const facturaAsociadaObj = useMemo(
    () => facturasCargadas.find((f) => String(f.id) === String(facturaAsociadaId)) || null,
    [facturasCargadas, facturaAsociadaId]
  );

  const seleccionarFacturaParaNc = (fac: any) => {
    setFacturaAsociadaId(String(fac.id));
    if (!proyectoFijoCodigo && fac.proyecto_codigo) {
      setProyectoCodigo(fac.proyecto_codigo);
    }
    if (fac.proveedor) setProveedor(fac.proveedor);
    if (fac.cuit) setCuitProveedor(fac.cuit);
    const monFac = String(fac.moneda || 'ARS').toUpperCase() === 'USD' ? 'USD' : 'ARS';
    setMoneda(monFac);
    if (Number(fac.importe || 0) > 0) {
      setImporteTexto(numATextoArg(Number(fac.importe)));
    }
    if (Number(fac.valor_usd || 0) > 0) {
      setValorUsdTexto(numATextoArg(Number(fac.valor_usd)));
    } else if (fac.fecha) {
      consultarDolarFecha(fac.fecha);
    }
    setEstado('Entregado');
    const refFac = fac.nro_orden || fac.concepto || '';
    setConcepto(
      refFac
        ? `NC s/ Factura ${refFac}${fac.concepto ? ` · ${fac.concepto}` : ''}`
        : `Nota de Crédito · ${fac.concepto || ''}`
    );
    setNotas((prev) =>
      prev.trim()
        ? prev
        : `Corresponde a ${fac.tipo_comprobante || 'Factura'} N° ${fac.nro_orden || 'S/N'} (${
            fac.fecha ? fac.fecha.split('-').reverse().join('/') : ''
          })`
    );
    setDropAbierto(null);
    setInfoAutoLectura(
      `Datos cargados desde ${fac.tipo_comprobante || 'Factura'} ${fac.nro_orden || ''} (${
        fac.proveedor || ''
      })`
    );
  };

  const equivalenteUsdCalculado = useMemo(() => {
    const imp = parsearNum(importeTexto);
    const cot = parsearNum(valorUsdTexto) || 1450;
    if (imp <= 0) return 0;
    if (moneda === 'USD') return imp;
    return Math.round((imp / cot) * 100) / 100;
  }, [importeTexto, valorUsdTexto, moneda]);

  const esNotaCredito = tipoComprobante === 'Nota de Crédito';

  // Fecha que corresponde al tipo de cambio BNA mostrado (si hay factura asociada en NC, usa la fecha de esa factura)
  const fechaDolarBnaMostrar =
    esNotaCredito && facturaAsociadaObj?.fecha ? facturaAsociadaObj.fecha : fecha;

  if (!abierto || !montado) return null;

  const verificarComprobanteDuplicado = async (
    nroFactura: string,
    provNombre: string,
    cuitProv: string
  ): Promise<boolean> => {
    const nroNorm = normalizarNroComprobante(nroFactura);
    if (!nroNorm) return false;

    const { data: existentes } = await supabase
      .from('compras')
      .select('id, nro_orden, proveedor, cuit, proyecto_codigo, tipo_comprobante');

    if (!Array.isArray(existentes)) return false;

    const provNorm = String(provNombre || '').trim().toLowerCase();
    const cuitNorm = String(cuitProv || '').replace(/\D/g, '');

    const duplicado = existentes.find((item: any) => {
      if (compraEditando && String(item.id) === String(compraEditando.id)) return false;
      const itemNro = normalizarNroComprobante(item.nro_orden || '');
      if (!itemNro || itemNro !== nroNorm) return false;

      const itemProv = String(item.proveedor || '').trim().toLowerCase();
      const itemCuit = String(item.cuit || '').replace(/\D/g, '');
      if (cuitNorm && itemCuit) return cuitNorm === itemCuit;
      if (provNorm && provNorm !== 'proveedor general' && itemProv) {
        return itemProv === provNorm || itemNro === nroNorm;
      }
      return true;
    });

    if (duplicado) {
      setAlertaDuplicado({
        mensaje: 'Este comprobante ya se encuentra registrado en el sistema.',
        detalle: `${duplicado.proveedor || 'Proveedor'} · N° ${duplicado.nro_orden}${
          duplicado.proyecto_codigo ? ` (${duplicado.proyecto_codigo})` : ''
        }`,
      });
      return true;
    }

    return false;
  };

  const procesarArchivoFactura = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendoArchivo(true);
    setInfoAutoLectura(null);
    setAlertaDuplicado(null);

    try {
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

      if (
        file.type === 'application/pdf' ||
        file.name.toLowerCase().endsWith('.pdf') ||
        file.type.startsWith('image/')
      ) {
        const detectado = await extraerDatosFacturaPdf(file);
        const camposCompletados: string[] = [];

        if (detectado.nroFactura) {
          setNroOrden(detectado.nroFactura);
          camposCompletados.push(`Comprobante ${detectado.nroFactura}`);
        }

        if (detectado.fechaDetectada) {
          setFecha(detectado.fechaDetectada);
          if (!esNotaCredito || !facturaAsociadaObj?.fecha) {
            await consultarDolarFecha(detectado.fechaDetectada);
          }
          camposCompletados.push(`Fecha ${detectado.fechaDetectada.split('-').reverse().join('/')}`);
        }

        let provDetectado = proveedor;
        if (detectado.cuitDetectado) {
          setCuitProveedor(detectado.cuitDetectado);
          const cuitLimpio = detectado.cuitDetectado.replace(/\D/g, '');
          const provMatch = listaProveedores.find(
            (pr) => String(pr.cuit || '').replace(/\D/g, '') === cuitLimpio
          );
          if (provMatch) {
            provDetectado = provMatch.nombre;
            setProveedor(provMatch.nombre);
            camposCompletados.push(`Proveedor ${provMatch.nombre}`);
          } else {
            if (detectado.proveedorSugerido && !proveedor) {
              provDetectado = detectado.proveedorSugerido;
              setProveedor(detectado.proveedorSugerido);
            }
            camposCompletados.push(`CUIT ${detectado.cuitDetectado}`);
          }
        } else if (detectado.proveedorSugerido && !proveedor) {
          provDetectado = detectado.proveedorSugerido;
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

        if (detectado.nroFactura) {
          await verificarComprobanteDuplicado(
            detectado.nroFactura,
            provDetectado,
            detectado.cuitDetectado || cuitProveedor
          );
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
    setAlertaDuplicado(null);

    try {
      const proveedorFinal = proveedor.trim() || 'Proveedor general';

      const yaExiste = await verificarComprobanteDuplicado(
        nroOrden,
        proveedorFinal,
        cuitProveedor
      );
      if (yaExiste) {
        setCargando(false);
        return;
      }

      const imp = parsearNum(importeTexto);
      const cot = parsearNum(valorUsdTexto) || 1450;
      const impUsd = moneda === 'USD' ? imp : Math.round((imp / cot) * 100) / 100;
      const proy = proyectos.find((p) => p.codigo === proyectoCodigo);

      const notaFinal =
        esNotaCredito && facturaAsociadaObj
          ? `${
              notas.trim()
                ? `${notas.trim()} · `
                : ''
            }[Aplica a Factura ${facturaAsociadaObj.nro_orden || facturaAsociadaObj.concepto}]`
          : notas.trim() || null;

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
        notas: notaFinal,
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
      }

      onClose();
      onGuardado(
        compraEditando
          ? 'Compra actualizada correctamente'
          : tipoComprobante === 'Nota de Crédito'
          ? 'Nota de Crédito registrada como Ingreso en Finanzas'
          : 'Compra registrada como Egreso en Finanzas'
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
          {/* CARTEL FLOTANTE DE COMPROBANTE DUPLICADO */}
          {alertaDuplicado && (
            <div className="fixed top-6 right-6 bg-[#1C1C1C] border-2 border-[#D4EE36] shadow-2xl rounded-2xl p-4 w-80 z-[10010] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-[#D4EE36] inline-flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> COMPROBANTE DUPLICADO
                </span>
                <button
                  type="button"
                  onClick={() => setAlertaDuplicado(null)}
                  className="text-gray-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="text-sm font-extrabold text-white leading-snug">
                {alertaDuplicado.mensaje}
              </div>
              {alertaDuplicado.detalle && (
                <div className="text-xs text-gray-300">{alertaDuplicado.detalle}</div>
              )}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setAlertaDuplicado(null)}
                  className="w-full py-2 rounded-xl bg-[#D4EE36] hover:bg-[#c3de28] text-black text-xs font-extrabold cursor-pointer"
                >
                  Entendido
                </button>
              </div>
            </div>
          )}

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
              {/* 1. CORRESPONDE AL PROYECTO / OBRA */}
              <div className={`relative ${dropAbierto === 'proyecto' ? 'z-[200]' : 'z-40'}`}>
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
                  <div className="absolute left-0 right-0 mt-1.5 bg-[#1C1C1C] border border-gray-700 rounded-2xl shadow-2xl py-2 z-[210] max-h-56 overflow-y-auto">
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

              {/* 2. PROVEEDOR / CONTRATISTA + CUIT */}
              <div
                className={`grid grid-cols-1 md:grid-cols-3 gap-3 relative ${
                  dropAbierto === 'proveedor' ? 'z-[200]' : 'z-30'
                }`}
              >
                <div className="md:col-span-2 relative">
                  <label className="block text-xs font-bold text-gray-200 mb-1.5">
                    Proveedor / Contratista
                  </label>
                  <div className="w-full bg-[#1C1C1C] border border-gray-700 focus-within:border-gray-500 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={proveedor}
                      onFocus={() => setDropAbierto('proveedor')}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProveedor(val);
                        setDropAbierto('proveedor');
                        const encontrado = listaProveedores.find(
                          (pr) => pr.nombre.toLowerCase() === val.trim().toLowerCase()
                        );
                        if (encontrado?.cuit) setCuitProveedor(encontrado.cuit);
                      }}
                      placeholder="Proveedor general"
                      className="w-full bg-transparent text-xs font-semibold text-white outline-none"
                    />
                    <span
                      onClick={() =>
                        setDropAbierto((prev) => (prev === 'proveedor' ? null : 'proveedor'))
                      }
                      className="text-gray-400 hover:text-white cursor-pointer flex-shrink-0"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </span>
                  </div>

                  {dropAbierto === 'proveedor' && (
                    <div className="absolute left-0 right-0 mt-1.5 bg-[#1C1C1C] border border-gray-700 rounded-2xl shadow-2xl py-2 z-[210] max-h-56 overflow-y-auto">
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
                          <div className="min-w-0">
                            <div className="text-xs font-extrabold text-white truncate">
                              {pr.nombre}
                            </div>
                            {pr.rubro && (
                              <div className="text-[10px] text-gray-400 truncate">{pr.rubro}</div>
                            )}
                          </div>
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

              {/* 3. FECHA + NRO. ORDEN / FACTURA + TIPO DE COMPROBANTE */}
              <div
                className={`grid grid-cols-3 gap-3 relative ${
                  dropAbierto === 'comprobante' ? 'z-[200]' : 'z-25'
                }`}
              >
                <div>
                  <label className="block text-xs font-bold text-gray-200 mb-1.5">Fecha</label>
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => {
                      const nuevaFecha = e.target.value;
                      setFecha(nuevaFecha);
                      if (nuevaFecha && (!esNotaCredito || !facturaAsociadaObj?.fecha)) {
                        consultarDolarFecha(nuevaFecha);
                      }
                    }}
                    className="w-full bg-[#1C1C1C] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white [color-scheme:dark]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-200 mb-1.5">
                    {esNotaCredito ? 'Nro. Nota de Crédito' : 'Nro. Orden / Factura'}
                  </label>
                  <input
                    type="text"
                    value={nroOrden}
                    onChange={(e) => {
                      setNroOrden(e.target.value);
                      if (alertaDuplicado) setAlertaDuplicado(null);
                    }}
                    onBlur={() => {
                      if (nroOrden.trim()) {
                        verificarComprobanteDuplicado(nroOrden, proveedor, cuitProveedor);
                      }
                    }}
                    placeholder="Ej. 00008-00003474"
                    className={`w-full bg-[#1C1C1C] border rounded-xl px-3 py-2 text-xs text-white ${
                      alertaDuplicado ? 'border-[#D4EE36]' : 'border-gray-700'
                    }`}
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
                    <div className="absolute left-0 right-0 mt-1.5 bg-[#1C1C1C] border border-gray-700 rounded-2xl shadow-2xl py-1.5 z-[210] max-h-56 overflow-y-auto">
                      {OPCIONES_COMPROBANTE.map((tc) => (
                        <button
                          key={tc}
                          type="button"
                          onClick={() => {
                            setTipoComprobante(tc);
                            if (tc !== 'Nota de Crédito') {
                              setFacturaAsociadaId('');
                            }
                            setDropAbierto(null);
                          }}
                          className={`w-full px-4 py-2 text-left text-xs font-bold hover:bg-white/5 cursor-pointer ${
                            tc === 'Nota de Crédito' ? 'text-emerald-400' : 'text-white'
                          }`}
                        >
                          {tc}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* SELECTOR DE FACTURA ASOCIADA (SOLO CUANDO SE ELIGE NOTA DE CRÉDITO) */}
              {esNotaCredito && (
                <div
                  className={`bg-emerald-950/25 border border-emerald-700/50 rounded-2xl p-3.5 relative ${
                    dropAbierto === 'factura_nc' ? 'z-[200]' : 'z-20'
                  }`}
                >
                  <label className="block text-xs font-extrabold text-emerald-300 mb-1.5 flex items-center gap-1.5">
                    <FileCheck2 className="w-3.5 h-3.5" />
                    Factura cargada a la que corresponde esta Nota de Crédito
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      setDropAbierto((prev) => (prev === 'factura_nc' ? null : 'factura_nc'))
                    }
                    className="w-full bg-[#161616] border border-emerald-700/60 hover:border-emerald-500 rounded-xl px-3.5 py-2.5 text-left flex items-center justify-between gap-2 cursor-pointer"
                  >
                    {facturaAsociadaObj ? (
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-xs font-extrabold text-white">
                          <span className="text-emerald-400">
                            {facturaAsociadaObj.nro_orden || 'S/N'}
                          </span>
                          <span>·</span>
                          <span className="truncate">{facturaAsociadaObj.proveedor}</span>
                          {facturaAsociadaObj.fecha && (
                            <span className="text-[11px] font-semibold text-gray-400">
                              ({facturaAsociadaObj.fecha.split('-').reverse().join('/')})
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-300 truncate mt-0.5">
                          {facturaAsociadaObj.concepto} · {facturaAsociadaObj.moneda || 'ARS'} $
                          {Number(facturaAsociadaObj.importe || 0).toLocaleString('es-AR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300">
                        Seleccioná una factura de la lista ({facturasDisponiblesNc.length} disponibles)...
                      </span>
                    )}
                    <ChevronDown className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  </button>

                  {dropAbierto === 'factura_nc' && (
                    <div className="absolute left-3.5 right-3.5 mt-1.5 bg-[#1A1A1A] border border-emerald-700/70 rounded-2xl shadow-2xl py-2 z-[210] max-h-60 overflow-y-auto">
                      {facturasDisponiblesNc.length === 0 ? (
                        <div className="px-4 py-3 text-xs text-gray-400">
                          No hay facturas cargadas para seleccionar.
                        </div>
                      ) : (
                        facturasDisponiblesNc.map((fac) => (
                          <button
                            key={fac.id}
                            type="button"
                            onClick={() => seleccionarFacturaParaNc(fac)}
                            className="w-full px-4 py-2.5 text-left hover:bg-emerald-950/50 border-b border-white/5 last:border-b-0 cursor-pointer flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-extrabold text-emerald-400">
                                  {fac.nro_orden || 'S/N'}
                                </span>
                                <span className="text-xs font-bold text-white truncate">
                                  {fac.proveedor}
                                </span>
                                {fac.proyecto_codigo && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#EAB308]/15 text-[#EAB308] font-bold">
                                    {fac.proyecto_codigo}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-gray-400 truncate mt-0.5">
                                {fac.fecha ? fac.fecha.split('-').reverse().join('/') : '—'} ·{' '}
                                {fac.concepto}
                              </div>
                            </div>
                            <div className="text-xs font-extrabold text-white flex-shrink-0">
                              {fac.moneda || 'ARS'} $
                              {Number(fac.importe || 0).toLocaleString('es-AR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 4. CONCEPTO DEL PEDIDO */}
              <div className="relative z-10">
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

              {/* 5. MONEDA + SUBTOTAL / IMPORTE + ESTADO */}
              <div
                className={`grid grid-cols-3 gap-3 relative ${
                  dropAbierto === 'moneda' || dropAbierto === 'estado' ? 'z-[200]' : 'z-15'
                }`}
              >
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
                    <div className="absolute left-0 right-0 mt-1.5 bg-[#1C1C1C] border border-gray-700 rounded-2xl shadow-2xl py-1.5 z-[210]">
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
                    <div className="absolute left-0 right-0 mt-1.5 bg-[#1C1C1C] border border-gray-700 rounded-2xl shadow-2xl py-1.5 z-[210]">
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

              {/* 6. COTIZACIÓN AUTOMÁTICA DÓLAR DE LA FECHA (USA FECHA DE FACTURA EN NOTA DE CRÉDITO) */}
              <div className="bg-[#1C1C1C] border border-gray-800 rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs relative z-10">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">
                    Dólar BNA ({fechaDolarBnaMostrar.split('-').reverse().join('/')}):
                  </span>
                  <input
                    type="text"
                    value={valorUsdTexto}
                    onChange={(e) => setValorUsdTexto(formatearMilesDecimales(e.target.value))}
                    className="w-24 bg-[#121212] border border-gray-700 rounded-lg px-2 py-1 text-xs font-bold text-white text-right"
                  />
                  <button
                    type="button"
                    onClick={() => consultarDolarFecha(fechaDolarBnaMostrar)}
                    title="Actualizar cotización BNA de la fecha"
                    className="text-[#EAB308] hover:opacity-80 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${buscandoDolar ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <div className="font-extrabold text-[#EAB308]">
                  Equivalente: {esNotaCredito ? '+' : ''}USD $
                  {equivalenteUsdCalculado.toLocaleString('es-AR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>

              <p
                className={`text-[11px] -mt-2 relative z-10 ${
                  esNotaCredito ? 'text-emerald-400 font-semibold' : 'text-gray-400'
                }`}
              >
                {esNotaCredito
                  ? 'Esta Nota de Crédito se registra automáticamente como Ingreso en Finanzas (anula/descuenta el egreso).'
                  : 'Esta compra se registra automáticamente como Egreso en Finanzas y en el balance del proyecto.'}
              </p>

              {/* 7. COMPROBANTE ADJUNTO (FACTURA / NC) */}
              <div className="bg-[#1C1C1C] border border-gray-800 rounded-2xl p-4 space-y-3 relative z-10">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-[#EAB308]" />
                    Comprobante Adjunto ({esNotaCredito ? 'Nota de Crédito' : 'Factura'})
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Subí un archivo desde tu dispositivo (autocompleta subtotal, comprobante, CUIT y fecha) o pegá abajo un enlace externo.
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
                      ? 'Analizando y subiendo comprobante...'
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

              {/* 8. DETALLE / NOTAS DE ENTREGA */}
              <div className="relative z-10">
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
              <div className="flex justify-between items-center pt-3 border-t border-gray-800 relative z-10">
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