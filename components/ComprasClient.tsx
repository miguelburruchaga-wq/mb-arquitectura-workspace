"use client";

import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { moverAPapelera } from '@/lib/papelera';
import ModalCompraPedido from '@/components/ModalCompraPedido';
import VisorArchivoModal from '@/components/VisorArchivoModal';
import {
  Plus,
  Search,
  FileText,
  Trash2,
  List,
  PieChart,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  X,
  Loader2,
} from 'lucide-react';

const COLORES_TORTA = [
  '#3B82F6',
  '#EF4444',
  '#F59E0B',
  '#10B981',
  '#F97316',
  '#06B6D4',
  '#60A5FA',
  '#F87171',
  '#FBBF24',
  '#34D399',
  '#A78BFA',
  '#F472B6',
  '#93C5FD',
  '#6EE7B7',
  '#FCD34D',
  '#CBD5E1',
];

const NOMBRES_MESES: Record<string, string> = {
  '01': 'Enero',
  '02': 'Febrero',
  '03': 'Marzo',
  '04': 'Abril',
  '05': 'Mayo',
  '06': 'Junio',
  '07': 'Julio',
  '08': 'Agosto',
  '09': 'Septiembre',
  '10': 'Octubre',
  '11': 'Noviembre',
  '12': 'Diciembre',
};

const COLUMNAS_COMPRAS_LIVIANAS =
  'id, proyecto_codigo, proyecto_nombre, proveedor, cuit, concepto, nro_orden, tipo_comprobante, fecha, moneda, importe, valor_usd, importe_usd, estado, notas, created_at';

export default function ComprasClient({
  comprasIniciales = [],
  proyectos = [],
  proveedores = [],
}: {
  comprasIniciales: any[];
  proyectos?: any[];
  proveedores?: any[];
}) {
  const router = useRouter();
  const [montado, setMontado] = useState(false);
  const [compras, setCompras] = useState<any[]>(comprasIniciales);
  const [listaProyectos, setListaProyectos] = useState<any[]>(proyectos);
  const [listaProveedores, setListaProveedores] = useState<any[]>(proveedores);

  const [vista, setVista] = useState<'listado' | 'proveedores'>('listado');
  const [proveedorExpandido, setProveedorExpandido] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroProyecto, setFiltroProyecto] = useState('Todas');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [filtroMesAnio, setFiltroMesAnio] = useState('Todos');

  const [modalCompra, setModalCompra] = useState(false);
  const [compraEditando, setCompraEditando] = useState<any | null>(null);
  const [cargandoPdfId, setCargandoPdfId] = useState<string | number | null>(null);
  const [visorArchivo, setVisorArchivo] = useState<{ url: string; titulo: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const recargarSoloComprasLivianas = async () => {
    const { data: compData } = await supabase
      .from('compras')
      .select(COLUMNAS_COMPRAS_LIVIANAS)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false });
    if (Array.isArray(compData)) setCompras(compData);
  };

  useEffect(() => {
    setMontado(true);
    // Solo consultar en cliente si el servidor no entregó registros
    if (!comprasIniciales || comprasIniciales.length === 0) {
      recargarSoloComprasLivianas();
    }
  }, []);

  useEffect(() => {
    setCompras(comprasIniciales);
  }, [comprasIniciales]);

  useEffect(() => {
    if (Array.isArray(proyectos) && proyectos.length > 0) setListaProyectos(proyectos);
  }, [proyectos]);

  useEffect(() => {
    if (Array.isArray(proveedores) && proveedores.length > 0) setListaProveedores(proveedores);
  }, [proveedores]);

  const mostrarToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  // Cargar archivo_url bajo demanda (solo al abrir PDF o editar una compra)
  const abrirPdfBajoDemanda = async (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    if (item.archivo_url) {
      setVisorArchivo({
        url: item.archivo_url,
        titulo: `${item.proveedor || 'Factura'} · ${item.nro_orden || item.concepto}`,
      });
      return;
    }

    setCargandoPdfId(item.id);
    try {
      const { data } = await supabase
        .from('compras')
        .select('archivo_url')
        .eq('id', item.id)
        .maybeSingle();

      if (data?.archivo_url) {
        setCompras((prev) =>
          prev.map((c) => (c.id === item.id ? { ...c, archivo_url: data.archivo_url } : c))
        );
        setVisorArchivo({
          url: data.archivo_url,
          titulo: `${item.proveedor || 'Factura'} · ${item.nro_orden || item.concepto}`,
        });
      } else {
        mostrarToast('Esta compra no tiene archivo PDF adjunto');
      }
    } finally {
      setCargandoPdfId(null);
    }
  };

  const abrirEdicionCompra = async (item: any) => {
    setCompraEditando(item);
    setModalCompra(true);
    if (!item.archivo_url && item.id) {
      const { data } = await supabase
        .from('compras')
        .select('archivo_url')
        .eq('id', item.id)
        .maybeSingle();
      if (data?.archivo_url) {
        setCompraEditando((prev: any) =>
          prev && prev.id === item.id ? { ...prev, archivo_url: data.archivo_url } : prev
        );
      }
    }
  };

  const opcionesMesAnio = useMemo(() => {
    const setPeriodos = new Set<string>();
    for (const c of compras) {
      const f = String(c.fecha || '').trim();
      if (/^\d{4}-\d{2}/.test(f)) {
        setPeriodos.add(f.slice(0, 7));
      }
    }
    return Array.from(setPeriodos)
      .sort((a, b) => b.localeCompare(a))
      .map((ym) => {
        const [anio, mes] = ym.split('-');
        return {
          valor: ym,
          etiqueta: `${NOMBRES_MESES[mes] || mes} ${anio}`,
        };
      });
  }, [compras]);

  const eliminarCompraDirecto = async (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    try {
      const { data: fullRow } = await supabase
        .from('compras')
        .select('*')
        .eq('id', item.id)
        .maybeSingle();

      await moverAPapelera({
        tabla: 'compras',
        modulo: 'Compras y Pedidos',
        titulo: `${item.proveedor || 'Proveedor'} · ${item.concepto || ''}`,
        subtitulo: item.nro_orden || '',
        registro: fullRow || item,
      });
      setCompras((prev) => prev.filter((c) => c.id !== item.id));
      mostrarToast('Compra enviada a papelera');
      router.refresh();
    } catch (err: any) {
      alert('Error al enviar a papelera: ' + err.message);
    }
  };

  const comprasFiltradas = useMemo(() => {
    return compras.filter((c) => {
      const q = busqueda.trim().toLowerCase();
      if (q) {
        const txt = `${c.concepto || ''} ${c.proveedor || ''} ${c.nro_orden || ''} ${
          c.proyecto_codigo || ''
        } ${c.proyecto_nombre || ''}`.toLowerCase();
        if (!txt.includes(q)) return false;
      }
      if (filtroProyecto !== 'Todas' && c.proyecto_codigo !== filtroProyecto) return false;
      if (filtroEstado !== 'Todos' && c.estado !== filtroEstado) return false;
      if (filtroMesAnio !== 'Todos' && !String(c.fecha || '').startsWith(filtroMesAnio)) {
        return false;
      }
      return true;
    });
  }, [compras, busqueda, filtroProyecto, filtroEstado, filtroMesAnio]);

  const totalUsdFiltrado = useMemo(() => {
    return comprasFiltradas.reduce((acc, c) => {
      const signo = c.tipo_comprobante === 'Nota de Crédito' ? -1 : 1;
      const usd =
        String(c.moneda || '').toUpperCase() === 'USD'
          ? Number(c.importe || 0)
          : Number(c.importe_usd || 0);
      return acc + signo * usd;
    }, 0);
  }, [comprasFiltradas]);

  const resumenPorProveedor = useMemo(() => {
    const mapa = new Map<
      string,
      {
        proveedor: string;
        netoArs: number;
        netoUsd: number;
        cantidadPedidos: number;
        comprasLista: any[];
      }
    >();

    for (const c of comprasFiltradas) {
      const nombre = String(c.proveedor || 'Sin proveedor').trim();
      const signo = c.tipo_comprobante === 'Nota de Crédito' ? -1 : 1;
      const mon = String(c.moneda || 'ARS').toUpperCase();
      const imp = Number(c.importe || 0);
      const cot = Number(c.valor_usd || 1450) || 1450;
      const ars = signo * (mon === 'ARS' ? imp : imp * cot);
      const usd = signo * (mon === 'USD' ? imp : Number(c.importe_usd || imp / cot));

      const actual = mapa.get(nombre) || {
        proveedor: nombre,
        netoArs: 0,
        netoUsd: 0,
        cantidadPedidos: 0,
        comprasLista: [],
      };
      actual.netoArs += ars;
      actual.netoUsd += usd;
      actual.cantidadPedidos += 1;
      actual.comprasLista.push(c);
      mapa.set(nombre, actual);
    }

    const lista = Array.from(mapa.values()).sort((a, b) => b.netoUsd - a.netoUsd);
    const totalUsdPositivo = lista.reduce((acc, i) => acc + Math.max(0, i.netoUsd), 0);

    return lista.map((item, idx) => ({
      ...item,
      porcentaje:
        totalUsdPositivo > 0 ? (Math.max(0, item.netoUsd) / totalUsdPositivo) * 100 : 0,
      color: COLORES_TORTA[idx % COLORES_TORTA.length],
    }));
  }, [comprasFiltradas]);

  const proveedorSeleccionadoObj = useMemo(
    () => resumenPorProveedor.find((r) => r.proveedor === proveedorExpandido) || null,
    [resumenPorProveedor, proveedorExpandido]
  );

  const totalArsProveedores = useMemo(
    () => resumenPorProveedor.reduce((acc, r) => acc + r.netoArs, 0),
    [resumenPorProveedor]
  );

  const conicGradientTorta = useMemo(() => {
    if (resumenPorProveedor.length === 0) return 'conic-gradient(#333 0% 100%)';
    let acumulado = 0;
    const segmentos = resumenPorProveedor.map((item) => {
      const inicio = acumulado;
      acumulado += item.porcentaje;
      return `${item.color} ${inicio.toFixed(2)}% ${acumulado.toFixed(2)}%`;
    });
    return `conic-gradient(${segmentos.join(', ')})`;
  }, [resumenPorProveedor]);

  return (
    <div className="min-h-screen text-white p-8 font-sans">
      {/* ENCABEZADO */}
      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Compras y Pedidos</h1>
          <p className="text-xs text-gray-400 mt-1">
            Control de materiales, facturas adjuntas, órdenes de compra y análisis por proveedor
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setCompraEditando(null);
            setModalCompra(true);
          }}
          className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-5 py-2.5 rounded-xl font-bold text-xs inline-flex items-center gap-2 cursor-pointer shadow-lg"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" /> Nueva compra / factura
        </button>
      </div>

      {/* SELECTOR DE VISTA */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-5">
        <div className="bg-[#242424] border border-white/10 rounded-xl p-1 inline-flex gap-1">
          <button
            type="button"
            onClick={() => setVista('listado')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
              vista === 'listado' ? 'bg-[#EAB308] text-black' : 'text-gray-300 hover:text-white'
            }`}
          >
            <List className="w-3.5 h-3.5" /> Listado de Compras
          </button>
          <button
            type="button"
            onClick={() => setVista('proveedores')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
              vista === 'proveedores'
                ? 'bg-[#EAB308] text-black'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" /> Resumen por Proveedor
          </button>
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-[#242424] border border-white/10 rounded-2xl p-4 mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por concepto, proveedor, N° factura u obra..."
            className="w-full bg-[#181818] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-gray-400"
          />
        </div>

        <select
          value={filtroMesAnio}
          onChange={(e) => setFiltroMesAnio(e.target.value)}
          className="bg-[#181818] border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-white cursor-pointer"
        >
          <option value="Todos">Mes / Año: Todos</option>
          {opcionesMesAnio.map((op) => (
            <option key={op.valor} value={op.valor}>
              {op.etiqueta}
            </option>
          ))}
        </select>

        <select
          value={filtroProyecto}
          onChange={(e) => setFiltroProyecto(e.target.value)}
          className="bg-[#181818] border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-white cursor-pointer"
        >
          <option value="Todas">Obra: Todas</option>
          {listaProyectos.map((p) => (
            <option key={p.codigo} value={p.codigo}>
              {p.codigo} · {p.nombre}
            </option>
          ))}
        </select>

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="bg-[#181818] border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-white cursor-pointer"
        >
          <option value="Todos">Estado: Todos</option>
          <option value="Entregado">Entregado</option>
          <option value="Encargado">Encargado</option>
          <option value="En tránsito">En tránsito</option>
          <option value="Pendiente de pago">Pendiente de pago</option>
        </select>

        <div className="bg-[#181818] border border-white/10 rounded-xl px-4 py-2 text-right">
          <div className="text-[10px] font-bold uppercase text-gray-400">TOTAL EQUIVALENTE USD</div>
          <div className="text-sm font-extrabold text-[#EAB308]">
            USD $
            {totalUsdFiltrado.toLocaleString('es-AR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
      </div>

      {/* VISTA 1: LISTADO */}
      {vista === 'listado' && (
        <div className="bg-[#242424] border border-white/10 rounded-2xl p-6 shadow-xl">
          <h2 className="text-sm font-extrabold text-white mb-4">
            Registros de Compras ({comprasFiltradas.length})
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  <th className="py-3 px-3">FECHA / FACTURA</th>
                  <th className="py-3 px-3">PROYECTO</th>
                  <th className="py-3 px-3">PROVEEDOR / CONCEPTO</th>
                  <th className="py-3 px-3">IMPORTE ORIGINAL</th>
                  <th className="py-3 px-3">EQUIV. USD</th>
                  <th className="py-3 px-3">ESTADO</th>
                  <th className="py-3 px-3 text-right">COMPROBANTE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-xs">
                {comprasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-gray-400">
                      No hay compras que coincidan con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  comprasFiltradas.map((c) => {
                    const esNc = c.tipo_comprobante === 'Nota de Crédito';
                    return (
                      <tr
                        key={c.id}
                        onClick={() => abrirEdicionCompra(c)}
                        className="hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <td className="py-3.5 px-3">
                          <div className="font-bold text-white">{c.fecha || '—'}</div>
                          <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
                            <span>{c.nro_orden || '—'}</span>
                            {esNc && (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-950/80 border border-emerald-700/50 text-emerald-400 text-[9px] font-extrabold">
                                NC
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          {c.proyecto_codigo ? (
                            <div>
                              <span className="bg-[#EAB308]/15 border border-[#EAB308]/40 text-[#EAB308] px-2 py-0.5 rounded text-[10px] font-extrabold">
                                {c.proyecto_codigo}
                              </span>
                              <div className="text-[11px] text-gray-300 mt-0.5">
                                {c.proyecto_nombre || ''}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">General</span>
                          )}
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="font-bold text-white">{c.proveedor}</div>
                          <div className="text-[11px] text-gray-400">{c.concepto}</div>
                        </td>

                        <td
                          className={`py-3.5 px-3 font-extrabold ${
                            esNc ? 'text-emerald-400' : 'text-white'
                          }`}
                        >
                          {esNc ? '-' : ''}
                          {String(c.moneda || 'ARS').toUpperCase() === 'USD' ? 'USD $ ' : '$ '}
                          {Number(c.importe || 0).toLocaleString('es-AR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>

                        <td
                          className={`py-3.5 px-3 font-extrabold ${
                            esNc ? 'text-emerald-400' : 'text-[#EAB308]'
                          }`}
                        >
                          {esNc ? '-' : ''}USD $
                          {Number(
                            String(c.moneda || '').toUpperCase() === 'USD'
                              ? c.importe || 0
                              : c.importe_usd || 0
                          ).toLocaleString('es-AR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>

                        <td className="py-3.5 px-3">
                          <span className="px-2.5 py-1 rounded-full bg-gray-800 text-gray-200 font-semibold text-[11px]">
                            {c.estado}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={(e) => abrirPdfBajoDemanda(e, c)}
                              className="px-2.5 py-1 rounded-lg bg-blue-500/15 border border-blue-500/40 text-blue-400 hover:bg-blue-500/25 font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              {cargandoPdfId === c.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <FileText className="w-3.5 h-3.5" />
                              )}
                              PDF
                            </button>

                            <button
                              type="button"
                              onClick={(e) => eliminarCompraDirecto(e, c)}
                              title="Eliminar compra (enviar a papelera)"
                              className="p-1.5 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-400 hover:bg-rose-500/30 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VISTA 2: RESUMEN POR PROVEEDOR CON DESPLIEGUE DE COMPRAS AL HACER CLIC */}
      {vista === 'proveedores' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 bg-[#242424] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
              <div className="px-5 py-4 border-b border-white/10 flex justify-between items-center">
                <h2 className="text-sm font-extrabold text-white">
                  Totales por Proveedor ({resumenPorProveedor.length})
                </h2>
                <span className="text-[11px] text-gray-400">
                  Tocá un proveedor para desplegar sus compras
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#181818] border-b border-white/10 text-[11px] font-bold uppercase text-gray-300">
                      <th className="py-3 px-4">PROVEEDOR</th>
                      <th className="py-3 px-4 text-right">NETO</th>
                      <th className="py-3 px-4 text-right">NETO USD</th>
                      <th className="py-3 px-3 text-right">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {resumenPorProveedor.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-400">
                          Sin datos de compras para agrupar.
                        </td>
                      </tr>
                    ) : (
                      resumenPorProveedor.map((row) => {
                        const activo = proveedorExpandido === row.proveedor;
                        return (
                          <tr
                            key={row.proveedor}
                            onClick={() =>
                              setProveedorExpandido((prev) =>
                                prev === row.proveedor ? null : row.proveedor
                              )
                            }
                            className={`transition-colors cursor-pointer ${
                              activo ? 'bg-[#EAB308]/10' : 'hover:bg-white/5'
                            }`}
                          >
                            <td className="py-2.5 px-4 font-bold text-white flex items-center gap-2 cursor-pointer">
                              {activo ? (
                                <ChevronDown className="w-3.5 h-3.5 text-[#EAB308] flex-shrink-0" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              )}
                              <span
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: row.color }}
                              />
                              <span className="truncate">{row.proveedor}</span>
                            </td>
                            <td className="py-2.5 px-4 text-right font-semibold text-gray-200 cursor-pointer">
                              ${' '}
                              {row.netoArs.toLocaleString('es-AR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            <td className="py-2.5 px-4 text-right font-extrabold text-[#EAB308] cursor-pointer">
                              USD $
                              {row.netoUsd.toLocaleString('es-AR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            <td className="py-2.5 px-3 text-right text-gray-400 font-bold cursor-pointer">
                              {row.porcentaje.toFixed(1)}%
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {resumenPorProveedor.length > 0 && (
                    <tfoot>
                      <tr className="bg-[#181818] border-t border-white/15 font-extrabold text-xs">
                        <td className="py-3 px-4 text-white">TOTAL GENERAL</td>
                        <td className="py-3 px-4 text-right text-white">
                          ${' '}
                          {totalArsProveedores.toLocaleString('es-AR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="py-3 px-4 text-right text-emerald-400">
                          USD $
                          {totalUsdFiltrado.toLocaleString('es-AR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="py-3 px-3 text-right text-white">100%</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            <div className="lg:col-span-6 bg-[#242424] border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
              <div>
                <h2 className="text-sm font-extrabold text-white">
                  Participación de Compras por Proveedor (%)
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Distribución porcentual sobre el total invertido en USD
                </p>
              </div>

              <div className="my-6 flex flex-col items-center justify-center">
                <div
                  className="w-64 h-64 rounded-full shadow-2xl border-4 border-[#181818] transition-all"
                  style={{ background: conicGradientTorta }}
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-4 border-t border-white/10 max-h-48 overflow-y-auto">
                {resumenPorProveedor.map((item) => {
                  const activo = proveedorExpandido === item.proveedor;
                  return (
                    <button
                      type="button"
                      key={item.proveedor}
                      onClick={() =>
                        setProveedorExpandido((prev) =>
                          prev === item.proveedor ? null : item.proveedor
                        )
                      }
                      className={`flex items-center justify-between gap-2 border rounded-lg px-2.5 py-1.5 text-[11px] cursor-pointer transition-colors ${
                        activo
                          ? 'bg-[#EAB308]/15 border-[#EAB308]'
                          : 'bg-[#181818] border-white/10 hover:border-white/25'
                      }`}
                    >
                      <span className="inline-flex items-center gap-1.5 truncate text-gray-200 font-semibold">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="truncate">{item.proveedor}</span>
                      </span>
                      <span className="font-extrabold text-white flex-shrink-0">
                        {item.porcentaje.toFixed(1)}%
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* DETALLE DESPLEGADO DE COMPRAS DEL PROVEEDOR SELECCIONADO */}
          {proveedorSeleccionadoObj && (
            <div className="bg-[#242424] border border-[#EAB308]/50 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: proveedorSeleccionadoObj.color }}
                    />
                    Compras realizadas a {proveedorSeleccionadoObj.proveedor} (
                    {proveedorSeleccionadoObj.comprasLista.length})
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Total neto: ARS ${' '}
                    {proveedorSeleccionadoObj.netoArs.toLocaleString('es-AR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    · USD $
                    {proveedorSeleccionadoObj.netoUsd.toLocaleString('es-AR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setProveedorExpandido(null)}
                  className="px-3 py-1.5 rounded-xl bg-[#181818] hover:bg-white/10 border border-white/10 text-xs font-bold text-gray-300 hover:text-white inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> Cerrar detalle
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      <th className="py-3 px-3">FECHA / FACTURA</th>
                      <th className="py-3 px-3">PROYECTO</th>
                      <th className="py-3 px-3">PROVEEDOR / CONCEPTO</th>
                      <th className="py-3 px-3">IMPORTE ORIGINAL</th>
                      <th className="py-3 px-3">EQUIV. USD</th>
                      <th className="py-3 px-3">ESTADO</th>
                      <th className="py-3 px-3 text-right">COMPROBANTE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 text-xs">
                    {proveedorSeleccionadoObj.comprasLista.map((c: any) => {
                      const esNc = c.tipo_comprobante === 'Nota de Crédito';
                      return (
                        <tr
                          key={c.id}
                          onClick={() => abrirEdicionCompra(c)}
                          className="hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <td className="py-3.5 px-3">
                            <div className="font-bold text-white">{c.fecha || '—'}</div>
                            <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
                              <span>{c.nro_orden || '—'}</span>
                              {esNc && (
                                <span className="px-1.5 py-0.2 rounded bg-emerald-950/80 border border-emerald-700/50 text-emerald-400 text-[9px] font-extrabold">
                                  NC
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-3">
                            {c.proyecto_codigo ? (
                              <div>
                                <span className="bg-[#D4EE36] text-black px-2.5 py-0.5 rounded-md text-[10px] font-extrabold">
                                  {c.proyecto_codigo}
                                </span>
                                <div className="text-[11px] text-gray-300 mt-0.5">
                                  {c.proyecto_nombre || ''}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400">General</span>
                            )}
                          </td>

                          <td className="py-3.5 px-3">
                            <div className="font-bold text-white">{c.proveedor}</div>
                            <div className="text-[11px] text-gray-400">{c.concepto}</div>
                          </td>

                          <td
                            className={`py-3.5 px-3 font-extrabold ${
                              esNc ? 'text-emerald-400' : 'text-white'
                            }`}
                          >
                            {esNc ? '-' : ''}
                            {String(c.moneda || 'ARS').toUpperCase() === 'USD' ? 'USD $ ' : '$ '}
                            {Number(c.importe || 0).toLocaleString('es-AR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>

                          <td
                            className={`py-3.5 px-3 font-extrabold ${
                              esNc ? 'text-emerald-400' : 'text-[#D4EE36]'
                            }`}
                          >
                            {esNc ? '-' : ''}USD $
                            {Number(
                              String(c.moneda || '').toUpperCase() === 'USD'
                                ? c.importe || 0
                                : c.importe_usd || 0
                            ).toLocaleString('es-AR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>

                          <td className="py-3.5 px-3">
                            <span className="px-3 py-1 rounded-full bg-[#1C2434] text-gray-200 font-semibold text-[11px]">
                              {c.estado}
                            </span>
                          </td>

                          <td className="py-3.5 px-3 text-right">
                            <div className="inline-flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={(e) => abrirPdfBajoDemanda(e, c)}
                                className="px-2.5 py-1 rounded-lg bg-blue-500/15 border border-blue-500/40 text-blue-400 hover:bg-blue-500/25 font-bold inline-flex items-center gap-1 cursor-pointer"
                              >
                                {cargandoPdfId === c.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <FileText className="w-3.5 h-3.5" />
                                )}
                                PDF
                              </button>

                              <button
                                type="button"
                                onClick={(e) => eliminarCompraDirecto(e, c)}
                                title="Eliminar compra (enviar a papelera)"
                                className="p-1.5 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-400 hover:bg-rose-500/30 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <VisorArchivoModal
        abierto={Boolean(visorArchivo)}
        url={visorArchivo?.url || ''}
        titulo={visorArchivo?.titulo}
        onClose={() => setVisorArchivo(null)}
      />

      <ModalCompraPedido
        abierto={modalCompra}
        onClose={() => {
          setModalCompra(false);
          setCompraEditando(null);
        }}
        onGuardado={(msg) => {
          mostrarToast(msg);
          recargarSoloComprasLivianas();
          router.refresh();
        }}
        compraEditando={compraEditando}
        proyectos={listaProyectos}
        proveedores={listaProveedores}
      />

      {toast &&
        montado &&
        createPortal(
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#161616] border border-gray-700/80 shadow-2xl rounded-xl px-5 py-3.5 flex items-center gap-3 z-[9999]">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-semibold text-white">{toast}</span>
          </div>,
          document.body
        )}
    </div>
  );
}