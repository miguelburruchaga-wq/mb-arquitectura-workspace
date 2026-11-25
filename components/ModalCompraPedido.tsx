"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { moverAPapelera } from '@/lib/papelera';
import { X, Upload, Link2, Trash2, Loader2, Plus, Package } from 'lucide-react';

export interface ItemMaterialCompra {
  id: number;
  material: string;
  cantidad: string;
  unidad: string;
  estado: 'Encargado' | 'En tránsito' | 'Entregado' | 'Pendiente';
}

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
  if (s.includes(',')) return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
  const puntos = (s.match(/\./g) || []).length;
  if (puntos > 1) return parseFloat(s.replace(/\./g, '')) || 0;
  return parseFloat(s) || 0;
}

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

  const hoy = new Date().toISOString().split('T')[0];

  const [proyectoCodigo, setProyectoCodigo] = useState(
    proyectoFijoCodigo || proyectos[0]?.codigo || ''
  );
  const [proveedor, setProveedor] = useState('');
  const [concepto, setConcepto] = useState('');
  const [nroOrden, setNroOrden] = useState('');
  const [fecha, setFecha] = useState(hoy);
  const [moneda, setMoneda] = useState<'ARS' | 'USD'>('ARS');
  const [importeTexto, setImporteTexto] = useState('');
  const [valorUsdTexto, setValorUsdTexto] = useState('1.450');
  const [estado, setEstado] = useState('Entregado');
  const [archivoUrl, setArchivoUrl] = useState('');

  // Lista de materiales y cantidades del pedido
  const [itemsMateriales, setItemsMateriales] = useState<ItemMaterialCompra[]>([]);

  useEffect(() => {
    setMontado(true);
  }, []);

  useEffect(() => {
    if (!abierto) return;
    const hoyIso = new Date().toISOString().split('T')[0];

    if (compraEditando) {
      setProyectoCodigo(compraEditando.proyecto_codigo || proyectoFijoCodigo || '');
      setProveedor(compraEditando.proveedor || '');
      setConcepto(compraEditando.concepto || '');
      setNroOrden(compraEditando.nro_orden || '');
      setFecha(compraEditando.fecha || hoyIso);
      setMoneda(String(compraEditando.moneda || 'ARS').toUpperCase() === 'USD' ? 'USD' : 'ARS');
      const imp = Number(compraEditando.importe || 0);
      setImporteTexto(
        imp > 0
          ? imp.toLocaleString('es-AR', {
              minimumFractionDigits: imp % 1 === 0 ? 0 : 2,
              maximumFractionDigits: 2,
            })
          : ''
      );
      const cot = Number(compraEditando.valor_usd || 1450);
      setValorUsdTexto(
        cot.toLocaleString('es-AR', {
          minimumFractionDigits: cot % 1 === 0 ? 0 : 2,
          maximumFractionDigits: 2,
        })
      );
      setEstado(compraEditando.estado || 'Entregado');
      setArchivoUrl(compraEditando.archivo_url || '');
      setItemsMateriales(
        Array.isArray(compraEditando.items_materiales) ? compraEditando.items_materiales : []
      );
    } else {
      setProyectoCodigo(proyectoFijoCodigo || proyectos[0]?.codigo || '');
      setProveedor(proveedores[0]?.nombre || '');
      setConcepto('');
      setNroOrden('');
      setFecha(hoyIso);
      setMoneda('ARS');
      setImporteTexto('');
      setValorUsdTexto('1.450');
      setEstado('Entregado');
      setArchivoUrl('');
      setItemsMateriales([]);
    }
  }, [abierto, compraEditando, proyectoFijoCodigo]);

  if (!abierto || !montado) return null;

  const agregarMaterial = () => {
    setItemsMateriales((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        material: '',
        cantidad: '1',
        unidad: 'un.',
        estado: 'Entregado',
      },
    ]);
  };

  const actualizarMaterial = (id: number, campo: keyof ItemMaterialCompra, valor: string) => {
    setItemsMateriales((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [campo]: valor } : item))
    );
  };

  const quitarMaterial = (id: number) => {
    setItemsMateriales((prev) => prev.filter((item) => item.id !== id));
  };

  const subirArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendoArchivo(true);
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
    } finally {
      setSubiendoArchivo(false);
    }
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
      const materialesLimpios = itemsMateriales.filter((m) => m.material.trim() !== '');

      const payload: Record<string, any> = {
        proyecto_codigo: proy?.codigo || proyectoCodigo || null,
        proyecto_nombre: proy?.nombre || null,
        proveedor: proveedor.trim(),
        concepto: concepto.trim() || materialesLimpios[0]?.material || 'Compra de materiales',
        nro_orden: nroOrden.trim() || null,
        fecha,
        moneda,
        importe: imp,
        valor_usd: cot,
        importe_usd: impUsd,
        estado,
        archivo_url: archivoUrl.trim() || null,
        items_materiales: materialesLimpios,
      };

      const { error } = compraEditando
        ? await supabase.from('compras').update(payload).eq('id', compraEditando.id)
        : await supabase.from('compras').insert([payload]);

      if (error) {
        alert('Error al guardar compra: ' + error.message);
        return;
      }

      onClose();
      onGuardado(compraEditando ? 'Compra actualizada' : 'Compra registrada correctamente');
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

  return createPortal(
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
      <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="px-6 pt-5 pb-4 border-b border-gray-800 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-white">
              {compraEditando ? 'Editar Compra / Factura' : 'Nueva Compra / Factura'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Registrá proveedor, comprobante, importe y detalle de materiales adquiridos
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

        <form onSubmit={guardarCompra} className="px-6 py-5 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Obra / Proyecto
              </label>
              <select
                value={proyectoCodigo}
                disabled={Boolean(proyectoFijoCodigo)}
                onChange={(e) => setProyectoCodigo(e.target.value)}
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
              <label className="block text-xs font-semibold text-gray-300 mb-1">Proveedor *</label>
              <input
                type="text"
                list="lista-proveedores-sug"
                required
                value={proveedor}
                onChange={(e) => setProveedor(e.target.value)}
                placeholder="Ej. Electro Star"
                className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white"
              />
              <datalist id="lista-proveedores-sug">
                {proveedores.map((pr) => (
                  <option key={pr.id} value={pr.nombre} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Concepto / Descripción General *
              </label>
              <input
                type="text"
                required
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                placeholder="Ej. Materiales eléctricos y tableros"
                className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                N° Factura / Remito
              </label>
              <input
                type="text"
                value={nroOrden}
                onChange={(e) => setNroOrden(e.target.value)}
                placeholder="0004-00005127"
                className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Moneda e Importe Total *
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
                  placeholder="Ej. 125.328,50"
                  className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs font-bold text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Cotiz. USD
              </label>
              <input
                type="text"
                value={valorUsdTexto}
                onChange={(e) => setValorUsdTexto(formatearMilesDecimales(e.target.value))}
                className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Fecha</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white [color-scheme:dark]"
              />
            </div>
          </div>

          {/* DETALLE DE MATERIALES Y CANTIDADES DEL PEDIDO */}
          <div className="bg-[#141414] border border-gray-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-[#EAB308]" />
                <div>
                  <div className="text-xs font-bold text-white">
                    Detalle de Materiales y Cantidades ({itemsMateriales.length})
                  </div>
                  <div className="text-[11px] text-gray-400">
                    Visible al entrar al proveedor dentro de la ficha del proyecto
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={agregarMaterial}
                className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-3 py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar ítem
              </button>
            </div>

            {itemsMateriales.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-gray-800">
                {itemsMateriales.map((it) => (
                  <div key={it.id} className="grid grid-cols-12 gap-2 items-center">
                    <input
                      type="text"
                      value={it.material}
                      onChange={(e) => actualizarMaterial(it.id, 'material', e.target.value)}
                      placeholder="Material (ej. Cable 2.5mm)"
                      className="col-span-5 bg-[#121212] border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                    <input
                      type="text"
                      value={it.cantidad}
                      onChange={(e) => actualizarMaterial(it.id, 'cantidad', e.target.value)}
                      placeholder="Cant."
                      className="col-span-2 bg-[#121212] border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white text-center"
                    />
                    <input
                      type="text"
                      value={it.unidad}
                      onChange={(e) => actualizarMaterial(it.id, 'unidad', e.target.value)}
                      placeholder="Unid."
                      className="col-span-2 bg-[#121212] border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white text-center"
                    />
                    <select
                      value={it.estado}
                      onChange={(e) => actualizarMaterial(it.id, 'estado', e.target.value)}
                      className="col-span-2 bg-[#121212] border border-gray-700 rounded-lg px-1.5 py-1.5 text-[11px] text-white"
                    >
                      <option value="Entregado">Entregado</option>
                      <option value="Encargado">Encargado</option>
                      <option value="En tránsito">En tránsito</option>
                      <option value="Pendiente">Pendiente</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => quitarMaterial(it.id)}
                      className="col-span-1 text-rose-400 hover:text-rose-300 flex justify-center cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Estado General del Pedido
              </label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white"
              >
                <option value="Entregado">Entregado</option>
                <option value="Encargado">Encargado</option>
                <option value="En tránsito">En tránsito</option>
                <option value="Pendiente de pago">Pendiente de pago</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Comprobante PDF / Drive
              </label>
              <div className="flex items-center gap-2">
                <label className="bg-[#121212] border border-gray-800 hover:border-[#EAB308] px-3 py-2 rounded-lg text-xs font-bold text-gray-200 inline-flex items-center gap-1.5 cursor-pointer flex-shrink-0">
                  {subiendoArchivo ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5 text-[#EAB308]" />
                  )}
                  <span>PDF</span>
                  <input type="file" onChange={subirArchivo} className="hidden" />
                </label>
                <div className="flex-1 flex items-center gap-1">
                  <Link2 className="w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={archivoUrl}
                    onChange={(e) => setArchivoUrl(e.target.value)}
                    placeholder="URL Drive..."
                    className="w-full bg-[#121212] border border-gray-800 rounded-lg px-2.5 py-2 text-xs text-white"
                  />
                </div>
              </div>
            </div>
          </div>

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
                className="px-4 py-2 rounded-lg text-xs text-gray-300 hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={cargando}
                className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-5 py-2 rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {cargando ? 'Guardando...' : 'Guardar Compra'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}