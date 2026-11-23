"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { moverAPapelera } from '@/lib/papelera';
import {
  Plus,
  Wallet,
  Pencil,
  Trash2,
  X,
  AlertOctagon,
  RotateCcw,
  ChevronDown,
  CheckCircle2,
} from 'lucide-react';

export default function BotoneraFichaCliente({ cliente }: { cliente: any }) {
  const router = useRouter();

  // Estados de los modales
  const [modalEditar, setModalEditar] = useState(false);
  const [modalCobro, setModalCobro] = useState(false);
  const [modalProyecto, setModalProyecto] = useState(false);
  const [modalEliminar, setModalEliminar] = useState(false);

  // Si es null = Nuevo Movimiento | Si tiene datos = Editar Movimiento
  const [movimientoEditando, setMovimientoEditando] = useState<any | null>(null);

  // Notificadores flotantes (Toast)
  const [toastDeshacer, setToastDeshacer] = useState(false);
  const [toastExito, setToastExito] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [cargando, setCargando] = useState(false);

  // Estados del formulario de edición de cliente
  const [codigo, setCodigo] = useState(cliente.codigo || '');
  const [nombre, setNombre] = useState(cliente.nombre || '');
  const [identificacion, setIdentificacion] = useState(cliente.identificacion || '');
  const [email, setEmail] = useState(cliente.email || '');
  const [telefono, setTelefono] = useState(cliente.telefono || '');
  const [domicilio, setDomicilio] = useState(cliente.domicilio || '');
  const [notas, setNotas] = useState(cliente.notas || '');

  // Estados del formulario de Movimiento Financiero
  const hoy = new Date().toISOString().split('T')[0];
  const [tipoMovimiento, setTipoMovimiento] = useState<'ingreso' | 'egreso'>('ingreso');
  const [categoria, setCategoria] = useState('Honorarios Proyecto');
  const [nroFactura, setNroFactura] = useState('');
  const [concepto, setConcepto] = useState('');
  const [moneda, setMoneda] = useState('ARS');
  const [importe, setImporte] = useState('');
  const [estadoPago, setEstadoPago] = useState('Cobrado / Pagado');
  const [fechaMovimiento, setFechaMovimiento] = useState(hoy);
  const [proyectoAsociado, setProyectoAsociado] = useState('General del Estudio');
  const [proveedor, setProveedor] = useState('Ninguno');
  const [notasMovimiento, setNotasMovimiento] = useState('');

  const formatearNumeroAInput = (valor: number) => {
    return Number(valor || 0).toLocaleString('es-AR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  const abrirNuevoMovimiento = () => {
    setMovimientoEditando(null);
    setTipoMovimiento('ingreso');
    setCategoria('Honorarios Proyecto');
    setNroFactura('');
    setConcepto('');
    setMoneda('ARS');
    setImporte('');
    setEstadoPago('Cobrado / Pagado');
    setFechaMovimiento(new Date().toISOString().split('T')[0]);
    setProyectoAsociado('General del Estudio');
    setProveedor('Ninguno');
    setNotasMovimiento('');
    setModalCobro(true);
  };

  const abrirEditarMovimiento = (mov: any) => {
    setMovimientoEditando(mov);
    setTipoMovimiento(mov.tipo === 'egreso' ? 'egreso' : 'ingreso');
    setCategoria(mov.categoria || 'Honorarios Proyecto');
    setNroFactura(mov.nro_factura || '');
    setConcepto(mov.concepto || '');
    setMoneda(mov.moneda || 'ARS');
    setImporte(formatearNumeroAInput(mov.importe));
    setEstadoPago(mov.estado || 'Cobrado / Pagado');
    setFechaMovimiento(mov.fecha || hoy);
    setProyectoAsociado(mov.proyecto || 'General del Estudio');
    setProveedor(mov.proveedor || 'Ninguno');
    setNotasMovimiento(mov.notas || '');
    setModalCobro(true);
  };

  useEffect(() => {
    const onAbrirCobro = () => abrirNuevoMovimiento();
    const onEditarMovimiento = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        abrirEditarMovimiento(customEvent.detail);
      }
    };

    window.addEventListener('abrir-modal-cobro', onAbrirCobro);
    window.addEventListener('editar-movimiento', onEditarMovimiento);

    return () => {
      window.removeEventListener('abrir-modal-cobro', onAbrirCobro);
      window.removeEventListener('editar-movimiento', onEditarMovimiento);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const mostrarToastExito = (mensaje: string) => {
    setToastExito(mensaje);
    setTimeout(() => {
      setToastExito(null);
    }, 4000);
  };

  const manejarCambioImporte = (valor: string) => {
    const limpio = valor.replace(/[^0-9,]/g, '');
    const partes = limpio.split(',');

    const parteEntera = partes[0]
      .replace(/^0+(?=\d)/, '')
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    if (partes.length > 1) {
      const parteDecimal = partes[1].slice(0, 2);
      setImporte(`${parteEntera || '0'},${parteDecimal}`);
    } else {
      setImporte(parteEntera);
    }
  };

  const pedirConfirmacion = () => {
    setModalEditar(false);
    setModalEliminar(true);
  };

  const iniciarEliminacion = () => {
    setModalEliminar(false);
    setToastDeshacer(true);

    timerRef.current = setTimeout(async () => {
      setToastDeshacer(false);
      setCargando(true);
      try {
        await moverAPapelera({
          tabla: 'clientes',
          modulo: 'Clientes',
          titulo: cliente.nombre || 'Cliente sin nombre',
          subtitulo: cliente.email || cliente.codigo || '',
          registro: cliente,
        });
        router.push('/clientes');
        router.refresh();
      } catch (error: any) {
        setCargando(false);
        alert('Error al mover a papelera: ' + error.message);
      }
    }, 4000);
  };

  const deshacerEliminacion = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToastDeshacer(false);
  };

  const actualizarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);

    const nuevoCodigo = codigo.trim();

    const { error } = await supabase
      .from('clientes')
      .update({ codigo: nuevoCodigo, nombre, identificacion, email, telefono, domicilio, notas })
      .eq('id', cliente.id);

    setCargando(false);

    if (!error) {
      setModalEditar(false);
      if (nuevoCodigo !== cliente.codigo) {
        router.replace(`/clientes/${nuevoCodigo}`);
      } else {
        router.refresh();
      }
    } else {
      alert('Error al actualizar: ' + error.message);
    }
  };

  const guardarMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);

    const importeNumerico = parseFloat(importe.replace(/\./g, '').replace(',', '.')) || 0;

    const datosMovimiento = {
      cliente_id: String(cliente.id),
      tipo: tipoMovimiento,
      categoria,
      nro_factura: nroFactura || null,
      concepto,
      moneda,
      importe: importeNumerico,
      estado: estadoPago,
      fecha: fechaMovimiento,
      proyecto: proyectoAsociado,
      proveedor,
      notas: notasMovimiento || null,
    };

    let error;

    if (movimientoEditando) {
      const res = await supabase
        .from('movimientos')
        .update(datosMovimiento)
        .eq('id', movimientoEditando.id);
      error = res.error;
    } else {
      const res = await supabase.from('movimientos').insert([datosMovimiento]);
      error = res.error;
    }

    setCargando(false);

    if (!error) {
      setModalCobro(false);
      mostrarToastExito(movimientoEditando ? 'Cambios guardados' : 'Movimiento registrado');
      setMovimientoEditando(null);
      router.refresh();
    } else {
      alert('Error al guardar el movimiento: ' + error.message);
    }
  };

  const eliminarMovimiento = async () => {
    if (!movimientoEditando) return;
    setCargando(true);
    try {
      await moverAPapelera({
        tabla: 'movimientos',
        modulo: 'Finanzas',
        titulo: movimientoEditando.concepto || 'Movimiento sin concepto',
        subtitulo: `${movimientoEditando.moneda || 'ARS'} ${movimientoEditando.importe || 0}`,
        registro: movimientoEditando,
      });
      setModalCobro(false);
      setMovimientoEditando(null);
      mostrarToastExito('Movimiento enviado a papelera');
      router.refresh();
    } catch (error: any) {
      alert('Error al mover el movimiento a papelera: ' + error.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <>
      {/* BOTONERA SUPERIOR */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setModalProyecto(true)}
          disabled={toastDeshacer}
          className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Nuevo proyecto con este cliente
        </button>
        <button
          onClick={abrirNuevoMovimiento}
          disabled={toastDeshacer}
          className="bg-[#059669] hover:bg-[#047857] text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Wallet className="w-4 h-4" /> Registrar cobro
        </button>
        <button
          onClick={() => setModalEditar(true)}
          disabled={toastDeshacer}
          className="bg-[#1A1A1A] border border-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Pencil className="w-4 h-4 text-gray-400" /> Editar ficha
        </button>
        <button
          onClick={pedirConfirmacion}
          disabled={toastDeshacer || cargando}
          className="bg-red-950/30 border border-red-900/50 hover:bg-red-900/40 text-red-500 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Trash2 className="w-4 h-4" /> Papelera
        </button>
      </div>

      {/* CARTEL FLOTANTE DE CONFIRMACIÓN */}
      {toastExito && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#161616] border border-gray-700/80 shadow-2xl rounded-xl px-5 py-3.5 flex items-center justify-between gap-10 z-50 min-w-[320px]">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-semibold text-white">{toastExito}</span>
          </div>
          <button
            onClick={() => setToastExito(null)}
            className="text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* MODAL: CONFIRMAR ELIMINACIÓN DE CLIENTE */}
      {modalEliminar && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-[#1A1A1A] rounded-xl border border-red-900/30 w-full max-w-md shadow-2xl p-6 relative text-center">
            <div className="w-16 h-16 bg-red-950/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-900/50">
              <AlertOctagon className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">¿Eliminar a {cliente.nombre}?</h2>
            <p className="text-sm text-gray-400 mb-8">
              Estás a punto de mover este cliente a la papelera. Se ocultará de la lista y no podrás vincularle nuevos proyectos.
            </p>

            <div className="flex justify-center gap-4">
              <button
                onClick={() => setModalEliminar(false)}
                className="px-6 py-2.5 text-sm font-medium text-gray-300 hover:text-white bg-[#121212] border border-gray-700 hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={iniciarEliminacion}
                className="px-6 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-500 rounded-lg shadow-lg transition-colors cursor-pointer"
              >
                Sí, eliminar cliente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICADOR FLOTANTE (TOAST) DE DESHACER */}
      {toastDeshacer && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-[#1A1A1A] border border-gray-700 shadow-2xl rounded-full px-6 py-3 flex items-center gap-6 z-50">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
            <span className="text-sm font-medium text-white">Moviendo cliente a papelera...</span>
          </div>
          <div className="w-px h-6 bg-gray-700"></div>
          <button
            onClick={deshacerEliminacion}
            className="text-sm font-bold text-[#EAB308] hover:text-[#CA9A04] flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" /> Deshacer
          </button>
        </div>
      )}

      {/* MODAL: EDITAR CLIENTE */}
      {modalEditar && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-800 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-white">Editar Cliente</h2>
                <p className="text-sm text-gray-400 mt-1">Ficha de contacto, código identificador y datos fiscales</p>
              </div>
              <button onClick={() => setModalEditar(false)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <form id="form-editar" onSubmit={actualizarCliente} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">Código Cliente *</label>
                    <input
                      type="text"
                      value={codigo}
                      onChange={(e) => setCodigo(e.target.value)}
                      required
                      className="w-full bg-[#121212] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-[#EAB308] font-medium focus:border-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">Nombre / Razón Social *</label>
                    <input
                      type="text"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      required
                      className="w-full bg-[#121212] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-gray-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">Identificación Fiscal</label>
                    <input
                      type="text"
                      value={identificacion}
                      onChange={(e) => setIdentificacion(e.target.value)}
                      className="w-full bg-[#121212] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">Tipo de Cliente</label>
                    <input
                      type="text"
                      value={cliente.tipo}
                      disabled
                      className="w-full bg-[#121212] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white opacity-70 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">Email de Contacto</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#121212] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">Teléfono</label>
                    <input
                      type="text"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      className="w-full bg-[#121212] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-gray-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">Domicilio / Sede</label>
                  <input
                    type="text"
                    value={domicilio}
                    onChange={(e) => setDomicilio(e.target.value)}
                    className="w-full bg-[#121212] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">Notas del Cliente</label>
                  <textarea
                    rows={3}
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    className="w-full bg-[#121212] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-gray-500"
                  />
                </div>
              </form>
            </div>

            <div className="p-5 border-t border-gray-800 flex justify-between bg-[#141414]">
              <button
                type="button"
                onClick={pedirConfirmacion}
                className="text-sm font-medium text-red-500 hover:text-red-400 flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> Enviar a papelera
              </button>
              <div className="flex gap-4">
                <button
                  onClick={() => setModalEditar(false)}
                  className="text-sm text-gray-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  form="form-editar"
                  disabled={cargando}
                  className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-6 py-2 rounded-lg font-bold text-sm disabled:opacity-50 cursor-pointer"
                >
                  {cargando ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NUEVO O EDITAR MOVIMIENTO FINANCIERO */}
      {modalCobro && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800 w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 pt-6 pb-4 flex justify-between items-start">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {movimientoEditando ? 'Editar Movimiento Financiero' : 'Nuevo Movimiento Financiero'}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Registro multimoneda de honorarios, cobros y gastos</p>
              </div>
              <button onClick={() => setModalCobro(false)} className="text-gray-400 hover:text-white transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form id="form-movimiento" onSubmit={guardarMovimiento} className="px-6 pb-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 bg-[#121212] p-1 rounded-lg border border-gray-800">
                <button
                  type="button"
                  onClick={() => setTipoMovimiento('ingreso')}
                  className={`py-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    tipoMovimiento === 'ingreso'
                      ? 'bg-[#00D285] text-black shadow'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  + Ingreso / Honorario
                </button>
                <button
                  type="button"
                  onClick={() => setTipoMovimiento('egreso')}
                  className={`py-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    tipoMovimiento === 'egreso'
                      ? 'bg-red-600 text-white shadow'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  - Egreso / Costo
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Categoría</label>
                  <input
                    type="text"
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Nro. Factura / Recibo</label>
                  <input
                    type="text"
                    value={nroFactura}
                    onChange={(e) => setNroFactura(e.target.value)}
                    placeholder="Ej. FAC-A-0003-00189"
                    className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Concepto / Detalle *</label>
                <input
                  type="text"
                  required
                  value={concepto}
                  onChange={(e) => setConcepto(e.target.value)}
                  placeholder="Ej. Certificación #02 Proyecto Ejecutivo Casa Terrazas"
                  className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Moneda *</label>
                  <select
                    value={moneda}
                    onChange={(e) => setMoneda(e.target.value)}
                    className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-gray-500"
                  >
                    <option value="ARS">ARS</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Importe *</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={importe}
                    onChange={(e) => manejarCambioImporte(e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Estado</label>
                  <select
                    value={estadoPago}
                    onChange={(e) => setEstadoPago(e.target.value)}
                    className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-gray-500"
                  >
                    <option value="Cobrado / Pagado">Cobrado / Pagado</option>
                    <option value="Facturado">Facturado</option>
                    <option value="Pendiente">Pendiente</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Fecha *</label>
                  <input
                    type="date"
                    required
                    value={fechaMovimiento}
                    onChange={(e) => setFechaMovimiento(e.target.value)}
                    className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-gray-500 [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Corresponde al Proyecto (Opcional)</label>
                  <select
                    value={proyectoAsociado}
                    onChange={(e) => setProyectoAsociado(e.target.value)}
                    className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-gray-500"
                  >
                    <option value="General del Estudio">General del Estudio</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Cliente (Opcional)</label>
                  <div className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="border border-[#EAB308]/50 bg-[#EAB308]/10 text-[#EAB308] px-1.5 py-0.5 rounded text-[11px] font-bold flex-shrink-0">
                        {cliente.codigo}
                      </span>
                      <span className="text-sm font-semibold text-white truncate">
                        {cliente.nombre}
                      </span>
                      <span className="bg-cyan-950/60 border border-cyan-800/60 text-cyan-400 px-2 py-0.5 rounded-full text-[11px] font-medium flex-shrink-0">
                        {cliente.estado || 'Prospecto'}
                      </span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 ml-1" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Proveedor / Asesor (Opcional)</label>
                  <select
                    value={proveedor}
                    onChange={(e) => setProveedor(e.target.value)}
                    className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-gray-500"
                  >
                    <option value="Ninguno">Ninguno</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Notas / Observaciones</label>
                <textarea
                  rows={3}
                  value={notasMovimiento}
                  onChange={(e) => setNotasMovimiento(e.target.value)}
                  placeholder="Medio de pago, cuenta bancaria, cuotas o aclaraciones..."
                  className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500 resize-none"
                />
              </div>

              {/* Pie del modal */}
              <div className="flex justify-between items-center pt-3">
                <div>
                  {movimientoEditando && (
                    <button
                      type="button"
                      onClick={eliminarMovimiento}
                      disabled={cargando}
                      className="border border-transparent hover:border-red-500/40 hover:bg-red-500/15 text-red-500 hover:text-red-400 px-4 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" /> Eliminar movimiento
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setModalCobro(false)}
                    className="border border-transparent hover:border-gray-500/40 hover:bg-gray-500/15 text-gray-300 hover:text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={cargando}
                    className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-5 py-2.5 rounded-lg font-bold text-sm transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {cargando
                      ? 'Guardando...'
                      : movimientoEditando
                      ? 'Guardar Cambios'
                      : 'Registrar Movimiento'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MAQUETA: NUEVO PROYECTO */}
      {modalProyecto && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 w-full max-w-2xl shadow-2xl p-6 relative">
            <button onClick={() => setModalProyecto(false)} className="absolute top-6 right-6 text-gray-400 hover:text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-white mb-1">Nuevo Proyecto</h2>
            <p className="text-sm text-gray-400 mb-6">Arquitectura, diseño de interiores, paisajismo, reforma u obra</p>
            <div className="bg-[#121212] border border-gray-800 rounded-lg p-8 text-center text-gray-500 mb-6">Pronto conectaremos este formulario.</div>
            <div className="flex justify-end gap-4">
              <button onClick={() => setModalProyecto(false)} className="text-sm text-gray-400 hover:text-white cursor-pointer">Cancelar</button>
              <button className="bg-[#EAB308] text-black px-6 py-2 rounded-lg font-bold text-sm opacity-50 cursor-not-allowed">Crear Proyecto</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}