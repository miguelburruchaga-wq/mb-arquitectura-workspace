"use client";

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import ModalCompraPedido from '@/components/ModalCompraPedido';
import {
  Plus,
  Search,
  FileText,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';

export default function ComprasClient({
  comprasIniciales = [],
  proyectos = [],
  proveedores = [],
}: {
  comprasIniciales: any[];
  proyectos: any[];
  proveedores?: any[];
}) {
  const router = useRouter();

  const [busqueda, setBusqueda] = useState('');
  const [filtroProyecto, setFiltroProyecto] = useState('Todos');
  const [filtroEstado, setFiltroEstado] = useState('Todos');

  const [modalAbierto, setModalAbierto] = useState(false);
  const [compraEditando, setCompraEditando] = useState<any | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const mostrarToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
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

  const comprasFiltradas = useMemo(() => {
    return comprasIniciales.filter((c) => {
      const q = busqueda.toLowerCase().trim();
      const coincideBusq =
        !q ||
        (c.concepto || '').toLowerCase().includes(q) ||
        (c.proveedor || '').toLowerCase().includes(q) ||
        (c.nro_orden || '').toLowerCase().includes(q) ||
        (c.proyecto_nombre || '').toLowerCase().includes(q) ||
        (c.proyecto_codigo || '').toLowerCase().includes(q);

      const coincideProy = filtroProyecto === 'Todos' || c.proyecto_codigo === filtroProyecto;
      const coincideEst = filtroEstado === 'Todos' || c.estado === filtroEstado;
      return coincideBusq && coincideProy && coincideEst;
    });
  }, [comprasIniciales, busqueda, filtroProyecto, filtroEstado]);

  const totalUsdGeneral = useMemo(() => {
    return comprasFiltradas.reduce((acc, c) => {
      if (c.moneda === 'USD') return acc + Number(c.importe || 0);
      return acc + Number(c.importe_usd || 0);
    }, 0);
  }, [comprasFiltradas]);

  return (
    <div className="min-h-screen bg-[#121212] text-white p-8 font-sans">
      {/* CABECERA */}
      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Compras y Pedidos</h1>
          <p className="text-sm text-gray-400 mt-1">
            Control de materiales, facturas adjuntas, órdenes de compra y conversión a USD BNA
          </p>
        </div>

        <button
          onClick={() => {
            setCompraEditando(null);
            setModalAbierto(true);
          }}
          className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors shadow-[0_0_20px_rgba(234,179,8,0.2)] cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" /> Nueva compra / factura
        </button>
      </div>

      {/* FILTROS Y RESUMEN */}
      <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-4 mb-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por concepto, proveedor, N° factura u obra..."
              className="w-full bg-[#121212] border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500"
            />
          </div>

          <select
            value={filtroProyecto}
            onChange={(e) => setFiltroProyecto(e.target.value)}
            className="bg-[#121212] border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs font-medium text-gray-200"
          >
            <option value="Todos">Obra: Todas</option>
            {proyectos.map((p) => (
              <option key={p.codigo} value={p.codigo}>
                {p.codigo} · {p.nombre}
              </option>
            ))}
          </select>

          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="bg-[#121212] border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs font-medium text-gray-200"
          >
            <option value="Todos">Estado: Todos</option>
            <option value="Encargado">Encargado</option>
            <option value="En Acopio">En Acopio</option>
            <option value="Entregado">Entregado</option>
            <option value="Pagado">Pagado</option>
          </select>
        </div>

        <div className="bg-[#121212] border border-gray-800 rounded-xl px-4 py-2 text-right">
          <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">
            Total Equivalente USD
          </div>
          <div className="text-lg font-extrabold text-[#EAB308]">
            USD $
            {totalUsdGeneral.toLocaleString('es-AR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
      </div>

      {/* TABLA DE COMPRAS */}
      <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-5 shadow-xl">
        <h2 className="text-sm font-bold text-white mb-4">
          Registros de Compras ({comprasFiltradas.length})
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-800 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                <th className="py-3 px-3">FECHA / FACTURA</th>
                <th className="py-3 px-3">PROYECTO</th>
                <th className="py-3 px-3">PROVEEDOR / CONCEPTO</th>
                <th className="py-3 px-3">IMPORTE ORIGINAL</th>
                <th className="py-3 px-3">EQUIV. USD</th>
                <th className="py-3 px-3">ESTADO</th>
                <th className="py-3 px-3 text-right">COMPROBANTE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/70 text-sm">
              {comprasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-gray-400 text-xs">
                    No hay compras registradas con los filtros actuales.
                  </td>
                </tr>
              ) : (
                comprasFiltradas.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => {
                      setCompraEditando(c);
                      setModalAbierto(true);
                    }}
                    className="hover:bg-[#202020] transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-3 text-xs">
                      <div className="font-semibold text-white">{c.fecha || '—'}</div>
                      <div className="text-[11px] text-gray-400">
                        {c.nro_orden || c.tipo_comprobante}
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-xs">
                      <span className="bg-[#EAB308]/15 border border-[#EAB308]/40 text-[#EAB308] px-2 py-0.5 rounded font-bold text-[11px]">
                        {c.proyecto_codigo}
                      </span>
                      <div className="text-gray-300 mt-1">{c.proyecto_nombre}</div>
                    </td>

                    <td className="py-3.5 px-3 text-xs">
                      <div className="font-bold text-white">{c.proveedor}</div>
                      <div className="text-gray-400">{c.concepto}</div>
                    </td>

                    <td className="py-3.5 px-3 text-xs font-bold text-white">
                      {c.moneda === 'USD' ? 'USD $' : '$ '}
                      {Number(c.importe || 0).toLocaleString('es-AR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>

                    <td className="py-3.5 px-3 text-xs font-extrabold text-[#EAB308]">
                      USD $
                      {Number(
                        c.moneda === 'USD' ? c.importe || 0 : c.importe_usd || 0
                      ).toLocaleString('es-AR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>

                    <td className="py-3.5 px-3 text-xs">
                      <span className="px-2.5 py-1 rounded-full bg-gray-800 text-gray-200 font-semibold text-[11px]">
                        {c.estado}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-right text-xs">
                      <div className="inline-flex items-center gap-2">
                        {c.archivo_url && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              abrirArchivoAdjunto(c.archivo_url);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-blue-500/15 border border-blue-500/40 text-blue-400 hover:bg-blue-500/25 font-semibold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" /> PDF
                          </button>
                        )}
                        {c.enlace_externo && (
                          <a
                            href={c.enlace_externo}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-2.5 py-1 rounded-lg bg-gray-800 text-gray-200 hover:text-white font-semibold inline-flex items-center gap-1"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Link
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL COMPARTIDO: NUEVO / EDITAR PEDIDO O COMPRA */}
      <ModalCompraPedido
        abierto={modalAbierto}
        onClose={() => {
          setModalAbierto(false);
          setCompraEditando(null);
        }}
        onGuardado={(msg) => {
          mostrarToast(msg);
          router.refresh();
        }}
        compraEditando={compraEditando}
        proyectos={proyectos}
        proveedores={proveedores}
      />

      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#161616] border border-gray-700/80 shadow-2xl rounded-xl px-5 py-3.5 flex items-center gap-3 z-50">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-semibold text-white">{toast}</span>
        </div>
      )}
    </div>
  );
}