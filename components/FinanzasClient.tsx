"use client";

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { extraerDatosFacturaPdf } from '@/lib/leerFacturaPdf';
import {
  Plus,
  Search,
  Upload,
  Download,
  Lock,
  ArrowRight,
  X,
  CheckCircle2,
  Trash2,
  Calendar,
  FileText,
  RefreshCw,
  Loader2,
} from 'lucide-react';

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

export default function FinanzasClient({
  movimientosIniciales = [],
  proyectos = [],
  clientes = [],
  proveedores = [],
}: {
  movimientosIniciales: any[];
  proyectos?: any[];
  clientes?: any[];
  proveedores?: any[];
}) {
  const router = useRouter();

  const [monedaVista, setMonedaVista] = useState<'USD' | 'ARS'>('USD');

  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('Todos');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState('Todos');
  const [vistaRestringida, setVistaRestringida] = useState(false);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [movEditando, setMovEditando] = useState<any | null>(null);
  const [cargando, setCargando] = useState(false);
  const [subiendoPdf, setSubiendoPdf] = useState(false);
  const [leyendoPdf, setLeyendoPdf] = useState(false);
  const [consultandoBna, setConsultandoBna] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [tipo, setTipo] = useState<'Ingreso' | 'Egreso'>('Ingreso');
  const [categoria, setCategoria] = useState('Honorarios Proyecto');
  const [comprobante, setComprobante] = useState('');
  const [concepto, setConcepto] = useState('');
  const [moneda, setMoneda] = useState<'USD' | 'ARS'>('USD');
  const [importe, setImporte] = useState('');
  const [tipoComprobante, setTipoComprobante] = useState('Factura A');
  const [estado, setEstado] = useState('Abonado');
  const [archivoUrl, setArchivoUrl] = useState('');
  const [archivoNombre, setArchivoNombre] = useState('');
  const [formaPago, setFormaPago] = useState('Transferencia');
  const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0]);
  const [proyectoCodigo, setProyectoCodigo] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [proveedorNombre, setProveedorNombre] = useState('');
  const [notas, setNotas] = useState('');

  const [mostrarMasDatos, setMostrarMasDatos] = useState(false);
  const [fechaConversion, setFechaConversion] = useState(() => new Date().toISOString().split('T')[0]);
  const [valorUsd, setValorUsd] = useState('');
  const [importeUsd, setImporteUsd] = useState('');

  const mostrarToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Lee el importe real sin importar si la fila lo tiene en "importe" o "monto"
  const obtenerImporteFila = (m: any) => {
    const imp = Number(m.importe ?? 0);
    const mon = Number(m.monto ?? 0);
    return imp !== 0 ? imp : mon;
  };

  const esEgresoFila = (m: any) => {
    const t = String(m.tipo || '').toLowerCase();
    return t === 'egreso' || t === 'gasto' || t === 'compra';
  };

  const esEstadoAbonado = (est: string) => {
    const e = String(est || '').toLowerCase();
    return (
      e === 'abonado' ||
      e === 'cobrado' ||
      e === 'pagado' ||
      e === 'finalizado' ||
      e === 'cobrado / pagado'
    );
  };

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

  const formatearFechaTabla = (iso: string) => {
    if (!iso) return '—';
    const [y, m, d] = String(iso).split('T')[0].split('-');
    if (!y || !m || !d) return iso;
    return `${d}/${m}/${y}`;
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

  const consultarDolarBna = async (fechaTarget: string, importeActual = importe) => {
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

      if (extraido.importe || extraido.nroFactura || extraido.fechaDetectada) {
        mostrarToast('Datos extraídos del comprobante PDF');
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

  const abrirModalNuevo = () => {
    const hoy = new Date().toISOString().split('T')[0];
    setMovEditando(null);
    setTipo('Ingreso');
    setCategoria('Honorarios Proyecto');
    setComprobante('');
    setConcepto('');
    setMoneda(monedaVista);
    setImporte('');
    setTipoComprobante('Factura A');
    setEstado('Abonado');
    setArchivoUrl('');
    setArchivoNombre('');
    setFormaPago('Transferencia');
    setFecha(hoy);
    setProyectoCodigo('');
    setClienteId('');
    setProveedorNombre('');
    setNotas('');
    setMostrarMasDatos(monedaVista === 'ARS');
    setFechaConversion(hoy);
    setValorUsd('');
    setImporteUsd('');
    setModalAbierto(true);
    if (monedaVista === 'ARS') {
      consultarDolarBna(hoy, '');
    }
  };

  const abrirModalEditar = (m: any) => {
    setMovEditando(m);
    const tipoMov = esEgresoFila(m) ? 'Egreso' : 'Ingreso';
    const monMov = (m.moneda || 'USD').toUpperCase() === 'ARS' ? 'ARS' : 'USD';
    const valorActual = obtenerImporteFila(m);

    setTipo(tipoMov);
    setCategoria(
      m.categoria || (tipoMov === 'Ingreso' ? 'Honorarios Proyecto' : 'Compras y Materiales de Obra')
    );
    setComprobante(m.comprobante || '');
    setConcepto(m.concepto || '');
    setMoneda(monMov);
    setImporte(
      valorActual
        ? valorActual.toLocaleString('es-AR', {
            minimumFractionDigits: valorActual % 1 === 0 ? 0 : 2,
            maximumFractionDigits: 2,
          })
        : ''
    );
    setTipoComprobante(m.tipo_comprobante || 'Factura A');
    setEstado(m.estado || (tipoMov === 'Ingreso' ? 'Abonado' : 'Resta abonar'));
    setArchivoUrl(m.archivo_url || '');
    setArchivoNombre(m.archivo_nombre || '');
    setFormaPago(m.forma_pago || 'Transferencia');
    setFecha(m.fecha || new Date().toISOString().split('T')[0]);

    const proyEncontrado = proyectos.find(
      (p) =>
        m.proyecto_codigo === p.codigo ||
        m.proyecto === `${p.codigo} · ${p.nombre}` ||
        m.proyecto === p.codigo ||
        m.proyecto === p.nombre
    );
    setProyectoCodigo(proyEncontrado ? proyEncontrado.codigo : '');
    setClienteId(m.cliente_id ? String(m.cliente_id) : '');
    setProveedorNombre(m.proveedor || '');
    setNotas(m.notas || '');
    setMostrarMasDatos(Boolean(m.valor_usd || m.importe_usd || monMov === 'ARS'));
    setFechaConversion(m.fecha_conversion || m.fecha || new Date().toISOString().split('T')[0]);
    setValorUsd(
      m.valor_usd
        ? Number(m.valor_usd).toLocaleString('es-AR', {
            minimumFractionDigits: Number(m.valor_usd) % 1 === 0 ? 0 : 2,
            maximumFractionDigits: 2,
          })
        : ''
    );
    setImporteUsd(
      m.importe_usd
        ? Number(m.importe_usd).toLocaleString('es-AR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        : ''
    );
    setModalAbierto(true);
  };

  const seleccionarProyecto = (cod: string) => {
    setProyectoCodigo(cod);
    if (cod) {
      const proy = proyectos.find((p) => p.codigo === cod);
      if (proy?.cliente_id && !clienteId) {
        setClienteId(String(proy.cliente_id));
      }
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

    // Guarda tanto en "importe" como en "monto" + "proyecto_codigo" y "proyecto" para que se vea idéntico en Proyectos y en Finanzas
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
      setModalAbierto(false);
      setMonedaVista(moneda);
      mostrarToast(
        movEditando
          ? 'Movimiento actualizado'
          : proy
          ? `Movimiento registrado y vinculado a ${proy.nombre}`
          : 'Movimiento financiero registrado'
      );
      router.refresh();
    } else {
      alert('Error al guardar movimiento: ' + error.message);
    }
  };

  const eliminarMovimiento = async () => {
    if (!movEditando) return;
    setCargando(true);
    const { error } = await supabase.from('movimientos').delete().eq('id', movEditando.id);
    setCargando(false);

    if (!error) {
      setModalAbierto(false);
      mostrarToast('Movimiento eliminado');
      router.refresh();
    } else {
      alert('Error al eliminar movimiento: ' + error.message);
    }
  };
  const movimientosFiltrados = useMemo(() => {
    const hoy = new Date();
    const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
    const anioActual = String(hoy.getFullYear());

    return movimientosIniciales.filter((m) => {
      const monMov = (m.moneda || 'USD').toUpperCase();
      if (monMov !== monedaVista) return false;

      const q = busqueda.toLowerCase().trim();
      const coincideBusq =
        !q ||
        (m.concepto || '').toLowerCase().includes(q) ||
        (m.proyecto || '').toLowerCase().includes(q) ||
        (m.proyecto_codigo || '').toLowerCase().includes(q) ||
        (m.categoria || '').toLowerCase().includes(q) ||
        (m.comprobante || '').toLowerCase().includes(q) ||
        (m.proveedor || '').toLowerCase().includes(q);

      const esEg = esEgresoFila(m);
      const coincideTipo =
        filtroTipo === 'Todos' ||
        (filtroTipo === 'Ingreso' && !esEg) ||
        (filtroTipo === 'Egreso' && esEg);

      const coincideEstado =
        filtroEstado === 'Todos' ||
        String(m.estado || '').toLowerCase() === filtroEstado.toLowerCase();

      let coincidePeriodo = true;
      if (filtroPeriodo === 'Este mes' && m.fecha) {
        coincidePeriodo = String(m.fecha).startsWith(mesActual);
      } else if (filtroPeriodo === 'Este año' && m.fecha) {
        coincidePeriodo = String(m.fecha).startsWith(anioActual);
      }

      return coincideBusq && coincideTipo && coincideEstado && coincidePeriodo;
    });
  }, [movimientosIniciales, monedaVista, busqueda, filtroTipo, filtroEstado, filtroPeriodo]);

  const { totalCobrado, totalPendiente, totalGastos, pctCobrado, pctPendiente, pctGastos } =
    useMemo(() => {
      let cobrado = 0;
      let pendiente = 0;
      let gastos = 0;

      for (const m of movimientosFiltrados) {
        const val = obtenerImporteFila(m);
        if (!esEgresoFila(m)) {
          if (esEstadoAbonado(m.estado)) {
            cobrado += val;
          } else {
            pendiente += val;
          }
        } else {
          gastos += val;
        }
      }

      const suma = cobrado + pendiente + gastos;
      const pCob = suma > 0 ? Math.round((cobrado / suma) * 100) : 0;
      const pPen = suma > 0 ? Math.round((pendiente / suma) * 100) : 0;
      const pGas = suma > 0 ? Math.max(0, 100 - pCob - pPen) : 0;

      return {
        totalCobrado: cobrado,
        totalPendiente: pendiente,
        totalGastos: gastos,
        pctCobrado: pCob,
        pctPendiente: pPen,
        pctGastos: pGas,
      };
    }, [movimientosFiltrados]);

  const exportarCsv = () => {
    const encabezados = [
      'Fecha',
      'Tipo',
      'Categoria',
      'Concepto',
      'Proyecto',
      'Estado',
      'Moneda',
      'Importe',
    ];
    const filas = movimientosFiltrados.map((m) => [
      m.fecha || '',
      m.tipo || '',
      m.categoria || '',
      `"${String(m.concepto || '').replace(/"/g, '""')}"`,
      `"${String(m.proyecto || 'General').replace(/"/g, '""')}"`,
      m.estado || '',
      m.moneda || monedaVista,
      obtenerImporteFila(m),
    ]);
    const csv = [encabezados.join(','), ...filas.map((f) => f.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finanzas_${monedaVista}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatearMonedaKPI = (num: number) =>
    `${monedaVista} $${num.toLocaleString('es-AR', {
      minimumFractionDigits: num % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    })}`;

  const obtenerBadgeEstado = (est: string) => {
    if (esEstadoAbonado(est)) {
      return {
        clase: 'bg-emerald-950/70 border-emerald-700/50 text-emerald-400',
        punto: 'bg-emerald-400',
      };
    }
    const e = String(est || '').toLowerCase();
    if (e.includes('resta') || e.includes('pendiente') || e.includes('facturado')) {
      return {
        clase: 'bg-rose-950/70 border-rose-800/60 text-rose-400',
        punto: 'bg-rose-400',
      };
    }
    return {
      clase: 'bg-gray-800 border-gray-700 text-gray-300',
      punto: 'bg-gray-400',
    };
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white p-8 font-sans">
      {/* CABECERA */}
      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Finanzas ({monedaVista})
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Honorarios cobrados, facturados, pendientes y gastos en la moneda seleccionada
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-1 flex items-center">
            <button
              type="button"
              onClick={() => setMonedaVista('USD')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                monedaVista === 'USD'
                  ? 'bg-[#EAB308] text-black shadow'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              USD
            </button>
            <button
              type="button"
              onClick={() => setMonedaVista('ARS')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                monedaVista === 'ARS'
                  ? 'bg-[#EAB308] text-black shadow'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              ARS
            </button>
          </div>

          <button
            type="button"
            onClick={abrirModalNuevo}
            className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors shadow-[0_0_20px_rgba(234,179,8,0.2)] cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" /> Registrar movimiento
          </button>
        </div>
      </div>

      {/* TARJETAS KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-5 shadow-xl">
          <div className="text-xs font-medium text-gray-400">
            Honorarios cobrados ({monedaVista})
          </div>
          <div className="text-3xl font-extrabold text-emerald-400 mt-2">
            {vistaRestringida ? '••••••' : formatearMonedaKPI(totalCobrado)}
          </div>
        </div>

        <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-5 shadow-xl">
          <div className="text-xs font-medium text-gray-400">
            Facturado / Pendiente ({monedaVista})
          </div>
          <div className="text-3xl font-extrabold text-[#EAB308] mt-2">
            {vistaRestringida ? '••••••' : formatearMonedaKPI(totalPendiente)}
          </div>
        </div>

        <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-5 shadow-xl">
          <div className="text-xs font-medium text-gray-400">
            Gastos y asesores ({monedaVista})
          </div>
          <div className="text-3xl font-extrabold text-rose-500 mt-2">
            {vistaRestringida ? '••••••' : formatearMonedaKPI(totalGastos)}
          </div>
        </div>
      </div>

      {/* BARRA: REPARTO DEL PERÍODO */}
      <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-5 mb-5 shadow-xl">
        <div className="flex justify-between items-center mb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
            REPARTO DEL PERÍODO ({monedaVista})
          </span>
          {movimientosFiltrados.length === 0 && (
            <span className="text-xs text-gray-400">
              Sin movimientos registrados en este período
            </span>
          )}
        </div>

        <div className="h-2 bg-gray-800 rounded-full overflow-hidden flex">
          {pctCobrado > 0 && (
            <div className="bg-emerald-400 h-full" style={{ width: `${pctCobrado}%` }} />
          )}
          {pctPendiente > 0 && (
            <div className="bg-[#EAB308] h-full" style={{ width: `${pctPendiente}%` }} />
          )}
          {pctGastos > 0 && (
            <div className="bg-rose-500 h-full" style={{ width: `${pctGastos}%` }} />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-6 mt-3 text-xs">
          <span className="inline-flex items-center gap-2 text-gray-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Cobrado <strong className="text-white">{pctCobrado}%</strong>
          </span>
          <span className="inline-flex items-center gap-2 text-gray-300">
            <span className="w-2 h-2 rounded-full bg-[#EAB308]" />
            Pendiente <strong className="text-white">{pctPendiente}%</strong>
          </span>
          <span className="inline-flex items-center gap-2 text-gray-300">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Gastos <strong className="text-white">{pctGastos}%</strong>
          </span>
        </div>
      </div>

      {/* BARRA DE BÚSQUEDA Y FILTROS */}
      <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-4 mb-5 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por concepto, código de obra (OBR-2026-01), categoría o comprobante"
              className="w-full bg-[#121212] border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-600"
            />
          </div>

          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="bg-[#121212] border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs font-medium text-gray-200"
          >
            <option value="Todos">Tipo: Todos</option>
            <option value="Ingreso">Ingreso</option>
            <option value="Egreso">Egreso</option>
          </select>

          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="bg-[#121212] border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs font-medium text-gray-200"
          >
            <option value="Todos">Estado: Todos</option>
            <option value="Abonado">Abonado</option>
            <option value="Resta abonar">Resta abonar</option>
            <option value="Cobrado">Cobrado</option>
            <option value="Facturado">Facturado</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Finalizado">Finalizado</option>
          </select>

          <div className="w-px h-6 bg-gray-800 hidden xl:block" />

          <button
            type="button"
            onClick={abrirModalNuevo}
            className="bg-[#181818] hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" /> Importar
          </button>

          <button
            type="button"
            onClick={exportarCsv}
            className="bg-[#181818] hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Exportar
          </button>

          <div className="w-px h-6 bg-gray-800 hidden xl:block" />

          <button
            type="button"
            onClick={() => setVistaRestringida(!vistaRestringida)}
            className={`border px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2 cursor-pointer ${
              vistaRestringida
                ? 'bg-[#EAB308]/15 border-[#EAB308]/40 text-[#EAB308]'
                : 'bg-[#181818] hover:bg-gray-800 border-gray-800 text-gray-300 hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />{' '}
            {vistaRestringida ? 'Mostrar importes' : 'Restringir vista'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#EAB308]" />
          <select
            value={filtroPeriodo}
            onChange={(e) => setFiltroPeriodo(e.target.value)}
            className="bg-[#121212] border border-gray-800 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-200"
          >
            <option value="Todos">Período: Todos</option>
            <option value="Este mes">Período: Este mes</option>
            <option value="Este año">Período: Este año</option>
          </select>
        </div>
      </div>

      {/* TABLA DE MOVIMIENTOS */}
      <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-5 shadow-xl">
        <h2 className="text-sm font-bold text-white mb-4">
          Movimientos en {monedaVista} ({movimientosFiltrados.length})
        </h2>

        {movimientosFiltrados.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-400">
            No se encontraron movimientos registrados en {monedaVista} para el filtro seleccionado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  <th className="py-3 px-3">FECHA</th>
                  <th className="py-3 px-3">CONCEPTO</th>
                  <th className="py-3 px-3">PROYECTO</th>
                  <th className="py-3 px-3">ESTADO</th>
                  <th className="py-3 px-3 text-right">IMPORTE</th>
                  <th className="py-3 px-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/70 text-sm">
                {movimientosFiltrados.map((m) => {
                  const badge = obtenerBadgeEstado(m.estado);
                  const esEg = esEgresoFila(m);
                  const valorFila = obtenerImporteFila(m);
                  const montoFormateado = `${esEg ? '-' : '+'}${monedaVista} $${valorFila.toLocaleString(
                    'es-AR',
                    {
                      minimumFractionDigits: valorFila % 1 === 0 ? 0 : 2,
                      maximumFractionDigits: 2,
                    }
                  )}`;

                  return (
                    <tr
                      key={m.id}
                      onClick={() => abrirModalEditar(m)}
                      className="hover:bg-[#202020] transition-colors cursor-pointer"
                    >
                      <td className="py-4 px-3 text-xs text-gray-300">
                        {formatearFechaTabla(m.fecha)}
                      </td>

                      <td className="py-4 px-3">
                        <div className="font-bold text-white text-xs">{m.concepto}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {m.categoria || (esEg ? 'Compras y Materiales de Obra' : 'Honorarios Proyecto')}
                        </div>
                      </td>

                      <td className="py-4 px-3 text-xs font-semibold text-gray-200">
                        {m.proyecto || 'General'}
                      </td>

                      <td className="py-4 px-3 text-xs">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${badge.clase}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.punto}`} />
                          {m.estado || (esEg ? 'Resta abonar' : 'Abonado')}
                        </span>
                      </td>

                      <td
                        className={`py-4 px-3 text-right text-xs font-extrabold ${
                          esEg ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {vistaRestringida ? '••••••' : montoFormateado}
                      </td>

                      <td className="py-4 px-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            abrirModalEditar(m);
                          }}
                          className="px-3.5 py-1.5 rounded-xl border border-gray-700 hover:bg-gray-800 text-xs font-semibold text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          Más info <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* MODAL: NUEVO / EDITAR MOVIMIENTO FINANCIERO                       */}
      {/* ================================================================= */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800 w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 pt-6 pb-4 flex justify-between items-start">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {movEditando ? 'Detalle del Movimiento Financiero' : 'Nuevo Movimiento Financiero'}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Registro multimoneda de honorarios, cobros y gastos
                </p>
              </div>
              <button
                onClick={() => setModalAbierto(false)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={guardarMovimiento} className="px-6 pb-6 overflow-y-auto space-y-4">
              {/* Toggle: + Ingreso / Honorario  |  - Egreso / Costo */}
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

              {/* Categoría + Nro. Factura / Recibo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Categoría
                  </label>
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

              {/* Concepto / Detalle * */}
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

              {/* Moneda * + Importe * + Comprobante */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Moneda *
                  </label>
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
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Importe *
                  </label>
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

              {/* Archivo PDF del Comprobante + Forma de pago */}
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

              {/* Más datos (opcional): conversión ARS a USD */}
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

              {/* Fecha * + Corresponde al Proyecto (Opcional) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Fecha *
                  </label>
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
                    className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white"
                  >
                    <option value="">General (Sin proyecto específico)</option>
                    {proyectos.map((p) => (
                      <option key={p.codigo} value={p.codigo}>
                        {p.codigo} · {p.nombre} ({p.estado || 'En Diseño'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cliente + Proveedor + Estado */}
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

              {/* Notas */}
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

              {/* Pie del modal */}
              <div className="flex justify-between items-center pt-3 border-t border-gray-800/80">
                <div>
                  {movEditando && (
                    <button
                      type="button"
                      onClick={eliminarMovimiento}
                      disabled={cargando}
                      className="text-red-500 hover:bg-red-500/15 px-3.5 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" /> Eliminar
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setModalAbierto(false)}
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
        </div>
      )}

      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#161616] border border-gray-700/80 shadow-2xl rounded-xl px-5 py-3.5 flex items-center gap-3 z-50">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-semibold text-white">{toast}</span>
        </div>
      )}
    </div>
  );
}