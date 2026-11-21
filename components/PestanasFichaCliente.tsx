"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  Phone,
  Mail,
  MapPin,
  User,
  Compass,
  Plus,
  Calendar,
  FileText,
  CheckCircle2,
} from 'lucide-react';

type Pestana = 'resumen' | 'proyectos' | 'cobros' | 'visitas';

export default function PestanasFichaCliente({
  cliente,
  movimientos = [],
}: {
  cliente: any;
  movimientos?: any[];
}) {
  const router = useRouter();
  const [pestanaActiva, setPestanaActiva] = useState<Pestana>('resumen');
  const [periodoCobros, setPeriodoCobros] = useState('todos');
  const [periodoVisitas, setPeriodoVisitas] = useState('todos');
  const [actualizandoId, setActualizandoId] = useState<number | null>(null);

  const inicial = cliente.nombre ? cliente.nombre.charAt(0).toUpperCase() : 'C';

  // Formatear fecha YYYY-MM-DD a DD/MM/YYYY
  const formatearFecha = (fechaStr: string) => {
    if (!fechaStr) return '';
    const partes = fechaStr.split('-');
    if (partes.length !== 3) return fechaStr;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  };

  // Formatear dinero estilo argentino ($20.000)
  const formatearMonto = (valor: number) => {
    return Number(valor || 0).toLocaleString('es-AR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  // Abrir el mismo modal de cobros que el botón superior
  const abrirModalCobro = () => {
    window.dispatchEvent(new CustomEvent('abrir-modal-cobro'));
  };

  // Abrir el modal de edición al hacer clic en un movimiento
  const abrirEditarMovimiento = (movimiento: any) => {
    window.dispatchEvent(new CustomEvent('editar-movimiento', { detail: movimiento }));
  };

  // Cambiar un movimiento de Pendiente / Por realizar -> Finalizado (Cobrado / Pagado)
  const marcarComoCobrado = async (movimientoId: number) => {
    setActualizandoId(movimientoId);
    const { error } = await supabase
      .from('movimientos')
      .update({ estado: 'Cobrado / Pagado' })
      .eq('id', movimientoId);

    setActualizandoId(null);

    if (!error) {
      router.refresh();
    } else {
      alert('Error al actualizar el estado: ' + error.message);
    }
  };

  // Filtrar movimientos por período
  const movimientosFiltrados = movimientos.filter((m) => {
    if (periodoCobros === 'todos') return true;
    const fechaMov = new Date(m.fecha + 'T00:00:00');
    const ahora = new Date();
    if (periodoCobros === 'mes') {
      return fechaMov.getMonth() === ahora.getMonth() && fechaMov.getFullYear() === ahora.getFullYear();
    }
    if (periodoCobros === 'trimestre') {
      const haceTresMeses = new Date();
      haceTresMeses.setMonth(ahora.getMonth() - 3);
      return fechaMov >= haceTresMeses;
    }
    if (periodoCobros === 'anio') {
      return fechaMov.getFullYear() === ahora.getFullYear();
    }
    return true;
  });

  // Calcular totales del estado de cuenta (usa la moneda del último movimiento o ARS)
  const monedaActiva = movimientos.length > 0 ? movimientos[0].moneda : 'ARS';
  const ingresosMoneda = movimientos.filter(
    (m) => m.tipo === 'ingreso' && m.moneda === monedaActiva
  );

  const cobrosRecibidos = ingresosMoneda
    .filter((m) => m.estado === 'Cobrado / Pagado')
    .reduce((acc, m) => acc + Number(m.importe || 0), 0);

  const saldoPendiente = ingresosMoneda
    .filter((m) => m.estado !== 'Cobrado / Pagado')
    .reduce((acc, m) => acc + Number(m.importe || 0), 0);

  const totalPactado = cobrosRecibidos + saldoPendiente;

  const cantProyectos = 0;
  const cantCobros = movimientos.length;
  const cantVisitasDocs = 0;

  return (
    <>
      {/* CABECERA DEL CLIENTE + BARRA DE PESTAÑAS */}
      <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 p-6 mb-6 shadow-xl">
        <div className="flex items-start gap-5">
          <div className="w-14 h-14 rounded-full bg-[#3B2D00] flex items-center justify-center text-[#EAB308] font-bold text-xl flex-shrink-0">
            {inicial}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <span className="bg-blue-900/40 text-blue-400 border border-blue-800/50 px-2.5 py-0.5 rounded text-xs font-semibold">
                {cliente.codigo}
              </span>
              <span className="bg-[#EAB308]/20 text-[#EAB308] px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider">
                {cliente.tipo}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-cyan-900/50 bg-cyan-900/20 text-cyan-400 text-xs font-medium">
                {cliente.estado || 'Prospecto'}
              </span>
            </div>

            <h1 className="text-4xl font-bold text-white mb-3">{cliente.nombre}</h1>

            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-300">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#EAB308]" />
                {cliente.telefono || 'Sin teléfono'}
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                {cliente.email || 'Sin correo'}
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                {cliente.domicilio || 'Sin dirección'}
              </div>
            </div>
          </div>
        </div>

        {/* SEPARADOR Y BOTONES DE PESTAÑAS */}
        <div className="border-t border-gray-800/80 mt-6 pt-5 flex flex-wrap gap-3">
          <button
            onClick={() => setPestanaActiva('resumen')}
            className={`px-4 py-2.5 rounded-xl text-sm transition-all ${
              pestanaActiva === 'resumen'
                ? 'bg-[#EAB308] text-black font-bold shadow-[0_0_15px_rgba(234,179,8,0.25)]'
                : 'bg-[#161B26] text-gray-300 hover:text-white hover:bg-[#1E2534] font-medium'
            }`}
          >
            Ficha de Contacto y Resumen
          </button>

          <button
            onClick={() => setPestanaActiva('proyectos')}
            className={`px-4 py-2.5 rounded-xl text-sm transition-all ${
              pestanaActiva === 'proyectos'
                ? 'bg-[#EAB308] text-black font-bold shadow-[0_0_15px_rgba(234,179,8,0.25)]'
                : 'bg-[#161B26] text-gray-300 hover:text-white hover:bg-[#1E2534] font-medium'
            }`}
          >
            Proyectos Vinculados ({cantProyectos})
          </button>

          <button
            onClick={() => setPestanaActiva('cobros')}
            className={`px-4 py-2.5 rounded-xl text-sm transition-all ${
              pestanaActiva === 'cobros'
                ? 'bg-[#EAB308] text-black font-bold shadow-[0_0_15px_rgba(234,179,8,0.25)]'
                : 'bg-[#161B26] text-gray-300 hover:text-white hover:bg-[#1E2534] font-medium'
            }`}
          >
            Cobros y Saldo Pendiente ({cantCobros})
          </button>

          <button
            onClick={() => setPestanaActiva('visitas')}
            className={`px-4 py-2.5 rounded-xl text-sm transition-all ${
              pestanaActiva === 'visitas'
                ? 'bg-[#EAB308] text-black font-bold shadow-[0_0_15px_rgba(234,179,8,0.25)]'
                : 'bg-[#161B26] text-gray-300 hover:text-white hover:bg-[#1E2534] font-medium'
            }`}
          >
            Visitas y Documentos ({cantVisitasDocs})
          </button>
        </div>
      </div>

      {/* PESTAÑA 1: FICHA DE CONTACTO Y RESUMEN */}
      {pestanaActiva === 'resumen' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#1A1A1A] rounded-xl border border-gray-800 p-6 shadow-xl">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-[#EAB308]" />
                <div>
                  <h2 className="text-white font-bold">Datos Completos de Contacto e Identificación</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Código de cliente, información administrativa, ubicación y notas del comitente
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#121212] border border-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-1">Código de Cliente</div>
                <div className="text-[#EAB308] font-semibold">{cliente.codigo}</div>
              </div>
              <div className="bg-[#121212] border border-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-1">Nombre o Razón Social</div>
                <div className="text-white font-semibold">{cliente.nombre}</div>
              </div>

              <div className="bg-[#121212] border border-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-1">Identificación Fiscal / Documento</div>
                <div className="text-white font-semibold">{cliente.identificacion || 'No registrado'}</div>
              </div>
              <div className="bg-[#121212] border border-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-1">Tipo de Comitente</div>
                <div className="text-white font-semibold">{cliente.tipo}</div>
              </div>

              <div className="bg-[#121212] border border-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-1">Teléfono / WhatsApp</div>
                <div className="text-white font-semibold">{cliente.telefono || 'No registrado'}</div>
              </div>
              <div className="bg-[#121212] border border-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-1">Correo Electrónico</div>
                <div className="text-white font-semibold">{cliente.email || 'No registrado'}</div>
              </div>

              <div className="bg-[#121212] border border-gray-800 rounded-lg p-4 md:col-span-2">
                <div className="text-xs text-gray-500 mb-1">Domicilio / Ubicación</div>
                <div className="text-white font-semibold">{cliente.domicilio || 'No registrado'}</div>
              </div>

              <div className="bg-[#121212] border border-gray-800 rounded-lg p-4 md:col-span-2 min-h-[100px]">
                <div className="text-xs text-gray-500 mb-1">Notas Comerciales, Preferencias y Acuerdos:</div>
                <div className="text-gray-400 text-sm mt-2">
                  {cliente.notas || 'Sin observaciones registradas para este cliente.'}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 p-6 shadow-xl flex flex-col gap-6">
            <div>
              <h2 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">
                ESTADO DE CUENTA CON EL CLIENTE
              </h2>
              <div className="bg-[#121212] border border-gray-800 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-2">
                  <span className="text-[#EAB308] font-bold text-sm">Moneda {monedaActiva}</span>
                  <button
                    onClick={() => setPestanaActiva('cobros')}
                    className="text-gray-400 text-xs hover:text-white transition-colors"
                  >
                    Ver cobros →
                  </button>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-gray-400">
                    <span>Honorarios pactados:</span>
                    <span className="text-white font-medium">{monedaActiva} ${formatearMonto(totalPactado)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Total cobrado:</span>
                    <span className="text-emerald-500 font-medium">{monedaActiva} ${formatearMonto(cobrosRecibidos)}</span>
                  </div>
                  <div className="flex justify-between text-white font-bold pt-2 border-t border-gray-800">
                    <span>Saldo pendiente:</span>
                    <span className="text-[#EAB308]">{monedaActiva} ${formatearMonto(saldoPendiente)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-gray-400 text-xs font-bold uppercase tracking-wider">
                  Proyectos vinculados ({cantProyectos})
                </h2>
                <button
                  onClick={() => setPestanaActiva('proyectos')}
                  className="text-[#EAB308] text-xs hover:text-white transition-colors"
                >
                  Ver todos →
                </button>
              </div>
              <p className="text-xs text-gray-500">Todavía no hay proyectos vinculados a este cliente.</p>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 2: PROYECTOS VINCULADOS */}
      {pestanaActiva === 'proyectos' && (
        <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 p-6 shadow-xl">
          <div className="flex flex-wrap justify-between items-center gap-4 pb-5 border-b border-gray-800/80 mb-5">
            <div>
              <h2 className="text-white font-bold flex items-center gap-2">
                <Compass className="w-5 h-5 text-[#EAB308]" />
                Proyectos y Encargos del Cliente ({cantProyectos})
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Hacé clic en cualquier proyecto para abrir su espacio de trabajo completo
              </p>
            </div>

            <button className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors">
              <Plus className="w-4 h-4" /> Nuevo proyecto para {cliente.nombre}
            </button>
          </div>

          <div className="bg-[#121212] border border-gray-800 rounded-xl p-8 text-center">
            <p className="text-sm text-gray-400">
              No hay proyectos vinculados a <strong className="text-white">{cliente.nombre}</strong> todavía.
            </p>
          </div>
        </div>
      )}

      {/* PESTAÑA 3: COBROS Y SALDO PENDIENTE */}
      {pestanaActiva === 'cobros' && (
        <div className="space-y-6">
          {/* Tarjeta superior: Estado de cuenta */}
          <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 p-5 shadow-xl max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <span className="bg-[#EAB308]/15 border border-[#EAB308]/30 text-[#EAB308] px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider">
                ESTADO DE CUENTA EN {monedaActiva}
              </span>
              <span className="text-xs text-gray-400">Moneda activa en el estudio</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#121212] border border-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-400 mb-1">Total Pactado</div>
                <div className="text-white font-bold text-lg">{monedaActiva} ${formatearMonto(totalPactado)}</div>
              </div>
              <div className="bg-[#121212] border border-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-400 mb-1">Cobros Recibidos</div>
                <div className="text-emerald-400 font-bold text-lg">{monedaActiva} ${formatearMonto(cobrosRecibidos)}</div>
              </div>
              <div className="bg-[#121212] border border-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-400 mb-1">Saldo Pendiente</div>
                <div className="text-[#EAB308] font-bold text-lg">{monedaActiva} ${formatearMonto(saldoPendiente)}</div>
              </div>
            </div>
          </div>

          {/* Encabezado del listado */}
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
              <h2 className="text-white font-bold text-base">
                Listado de Cobros, Anticipos y Certificaciones ({movimientosFiltrados.length})
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Filtrá por fecha o hacé clic en cualquier cobro para ver o editar su comprobante
              </p>
            </div>

            <button
              onClick={abrirModalCobro}
              className="bg-[#059669] hover:bg-[#047857] text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" /> Registrar nuevo cobro
            </button>
          </div>

          {/* Caja de listado y filtro */}
          <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 p-5 shadow-xl">
            <div className="flex justify-between items-center pb-4 border-b border-gray-800/80 mb-4">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-[#EAB308]" />
                <select
                  value={periodoCobros}
                  onChange={(e) => setPeriodoCobros(e.target.value)}
                  className="bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-gray-500"
                >
                  <option value="todos">Período: Todos</option>
                  <option value="mes">Este mes</option>
                  <option value="trimestre">Últimos 3 meses</option>
                  <option value="anio">Este año</option>
                </select>
              </div>
              <span className="text-xs text-gray-400">
                {movimientosFiltrados.length} {movimientosFiltrados.length === 1 ? 'movimiento' : 'movimientos'}
              </span>
            </div>

            {movimientosFiltrados.length === 0 ? (
              <div className="bg-[#121212] border border-gray-800 rounded-lg p-8 text-center">
                <p className="text-sm text-gray-400">
                  No hay cobros ni movimientos registrados en el período seleccionado.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {movimientosFiltrados.map((m) => {
                  const estaFinalizado = m.estado === 'Cobrado / Pagado';
                  const esIngreso = m.tipo === 'ingreso';

                  return (
                    <div
                      key={m.id}
                      onClick={() => abrirEditarMovimiento(m)}
                      className="bg-[#121212] border border-gray-800 hover:border-[#EAB308]/60 hover:bg-[#171717] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 transition-all cursor-pointer"
                    >
                      <div>
                        <div className="flex items-center gap-2.5 mb-1">
                          <span className="text-xs font-bold text-[#EAB308]">
                            {formatearFecha(m.fecha)}
                          </span>
                          <span className="text-sm font-bold text-white">{m.concepto}</span>
                        </div>
                        <div className="text-xs text-gray-400">
                          Categoría: {m.categoria || 'General'}
                          {m.proyecto && m.proyecto !== 'General del Estudio' ? ` · Proyecto: ${m.proyecto}` : ''}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {estaFinalizado ? (
                          <span className="bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 px-3 py-1 rounded-full text-xs font-semibold">
                            Finalizado
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                marcarComoCobrado(m.id);
                              }}
                              disabled={actualizandoId === m.id}
                              className="bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-700/60 text-emerald-400 px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {actualizandoId === m.id ? 'Guardando...' : 'Marcar cobrado'}
                            </button>
                            <span className="bg-blue-950/60 border border-blue-800/60 text-blue-400 px-3 py-1 rounded-full text-xs font-semibold">
                              Por realizar
                            </span>
                          </>
                        )}

                        <span
                          className={`text-sm font-bold min-w-[110px] text-right ${
                            esIngreso ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {esIngreso ? '+' : '-'}
                          {m.moneda} ${formatearMonto(m.importe)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PESTAÑA 4: VISITAS Y DOCUMENTOS */}
      {pestanaActiva === 'visitas' && (
        <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 p-6 shadow-xl space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-4 pb-5 border-b border-gray-800/80">
            <div>
              <h2 className="text-white font-bold text-base">Visitas y Documentación del Cliente</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Hacé clic en cualquier reunión o documento para ver más info o editarlo
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-[#EAB308]" />
              <select
                value={periodoVisitas}
                onChange={(e) => setPeriodoVisitas(e.target.value)}
                className="bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-gray-500"
              >
                <option value="todos">Período: Todos</option>
                <option value="mes">Este mes</option>
                <option value="trimestre">Últimos 3 meses</option>
                <option value="anio">Este año</option>
              </select>
            </div>
          </div>

          <div className="pb-6 border-b border-gray-800/80">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#EAB308] flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4" /> REUNIONES Y VISITAS REGISTRADAS (0)
            </h3>
            <p className="text-sm text-gray-400">No hay visitas registradas en el período seleccionado.</p>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4" /> PLANOS, PRESUPUESTOS Y DOCUMENTOS (0)
            </h3>
            <p className="text-sm text-gray-400">No hay documentos vinculados en el período seleccionado.</p>
          </div>
        </div>
      )}
    </>
  );
}