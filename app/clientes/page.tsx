"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import BotonNuevoCliente from '@/components/BotonNuevoCliente';
import { Search, Upload, Download, Lock, ArrowRight } from 'lucide-react';

export default function PanelClientes() {
  const router = useRouter();
  const [clientes, setClientes] = useState<any[]>([]);
  const [proyectos, setProyectos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [filtroTipo, setFiltroTipo] = useState('Todos');
  const [pagina, setPagina] = useState(1);
  const [filasPorPagina, setFilasPorPagina] = useState(10);

  const cargarDatos = async () => {
    setCargando(true);
    const [{ data: dataClientes }, { data: dataProyectos }] = await Promise.all([
      supabase.from('clientes').select('*').order('created_at', { ascending: false }),
      supabase.from('proyectos').select('id, cliente_codigo, cliente_nombre'),
    ]);

    setClientes(dataClientes || []);
    setProyectos(dataProyectos || []);
    setCargando(false);
  };

  useEffect(() => {
    cargarDatos();
    const onActualizado = () => cargarDatos();
    window.addEventListener('mb_clientes_actualizados', onActualizado);
    return () => window.removeEventListener('mb_clientes_actualizados', onActualizado);
  }, []);

  const contarProyectosCliente = (cliente: any) => {
    return proyectos.filter(
      (p) =>
        (cliente.codigo && p.cliente_codigo === cliente.codigo) ||
        (cliente.nombre && p.cliente_nombre === cliente.nombre)
    ).length;
  };

  const clientesFiltrados = useMemo(() => {
    return clientes.filter((c) => {
      const q = busqueda.toLowerCase().trim();
      const coincideBusq =
        !q ||
        (c.codigo || '').toLowerCase().includes(q) ||
        (c.nombre || '').toLowerCase().includes(q) ||
        (c.identificacion || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.telefono || '').toLowerCase().includes(q);

      const coincideEstado = filtroEstado === 'Todos' || c.estado === filtroEstado;
      const coincideTipo = filtroTipo === 'Todos' || c.tipo === filtroTipo;

      return coincideBusq && coincideEstado && coincideTipo;
    });
  }, [clientes, busqueda, filtroEstado, filtroTipo]);

  const totalPaginas = Math.max(1, Math.ceil(clientesFiltrados.length / filasPorPagina));
  const inicio = (pagina - 1) * filasPorPagina;
  const clientesPaginados = clientesFiltrados.slice(inicio, inicio + filasPorPagina);

  return (
    <div className="min-h-screen text-white p-8 font-sans">
      {/* ENCABEZADO */}
      <div className="mb-6 flex flex-wrap justify-between items-start gap-4 bg-transparent">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Clientes</h1>
          <p className="text-gray-300 text-sm mt-1">
            Gestión de clientes, datos de contacto y acceso a su ficha completa
          </p>
        </div>
        <BotonNuevoCliente totalClientes={clientes.length} onCreado={cargarDatos} />
      </div>

      {/* BARRA DE BÚSQUEDA Y FILTROS */}
      <div className="bg-[#242424]/85 backdrop-blur-md border border-white/10 rounded-2xl p-4 mb-6 shadow-xl flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[260px] relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPagina(1);
            }}
            placeholder="Buscar cliente por código (CLI-001), nombre, CUIT/DNI, email o teléfono..."
            className="w-full bg-[#181818]/90 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-white/25"
          />
        </div>

        <select
          value={filtroEstado}
          onChange={(e) => {
            setFiltroEstado(e.target.value);
            setPagina(1);
          }}
          className="bg-[#181818]/90 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-semibold text-gray-200 focus:outline-none cursor-pointer"
        >
          <option value="Todos">Estado: Todos</option>
          <option value="Prospecto">Estado: Prospecto</option>
          <option value="En Consulta / Presupuesto">Estado: En Consulta / Presupuesto</option>
          <option value="Activo">Estado: Activo</option>
        </select>

        <select
          value={filtroTipo}
          onChange={(e) => {
            setFiltroTipo(e.target.value);
            setPagina(1);
          }}
          className="bg-[#181818]/90 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-semibold text-gray-200 focus:outline-none cursor-pointer"
        >
          <option value="Todos">Tipo: Todos</option>
          <option value="Comitente Particular">Tipo: Comitente Particular</option>
          <option value="Empresa Desarrolladora">Tipo: Empresa Desarrolladora</option>
          <option value="Consorcio / Inmobiliaria">Tipo: Consorcio / Inmobiliaria</option>
        </select>

        <div className="w-px h-6 bg-white/10 hidden lg:block" />

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex items-center gap-2 bg-[#181818]/90 border border-white/10 hover:bg-white/10 px-3.5 py-2.5 rounded-xl text-xs font-medium text-gray-200 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" /> Importar
          </button>
          <button
            type="button"
            className="flex items-center gap-2 bg-[#181818]/90 border border-white/10 hover:bg-white/10 px-3.5 py-2.5 rounded-xl text-xs font-medium text-gray-200 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Exportar
          </button>
          <button
            type="button"
            className="flex items-center gap-2 bg-[#181818]/90 border border-white/10 hover:bg-white/10 px-3.5 py-2.5 rounded-xl text-xs font-medium text-gray-200 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" /> Restringir vista
          </button>
        </div>
      </div>

      {/* TABLA DE CLIENTES */}
      <div className="bg-[#242424]/85 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-white/10">
          <h2 className="text-white font-bold text-sm">Clientes ({clientesFiltrados.length})</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="border-b border-white/10 text-gray-400 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5 font-bold">CLIENTE</th>
                <th className="px-6 py-3.5 font-bold">CONTACTO</th>
                <th className="px-6 py-3.5 font-bold">PROYECTOS</th>
                <th className="px-6 py-3.5 font-bold">ESTADO</th>
                <th className="px-6 py-3.5 font-bold text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 text-sm">
              {cargando ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-400 text-xs">
                    Cargando clientes...
                  </td>
                </tr>
              ) : clientesPaginados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-400 text-xs">
                    No se encontraron clientes registrados.
                  </td>
                </tr>
              ) : (
                clientesPaginados.map((cliente) => {
                  const rutaFicha = `/clientes/${encodeURIComponent(cliente.codigo || cliente.id)}`;
                  return (
                    <tr
                      key={cliente.id}
                      onClick={() => router.push(rutaFicha)}
                      className="group cursor-pointer hover:bg-[#EAB308]/10 hover:outline hover:outline-1 hover:-outline-offset-1 hover:outline-[#EAB308]/60 transition-all"
                    >
                      <td className="px-6 py-4">
                        <div className="font-bold text-white group-hover:text-[#EAB308] text-sm transition-colors">
                          {cliente.nombre}
                        </div>
                        <div className="text-gray-400 text-xs mt-0.5">
                          {cliente.codigo} · {cliente.tipo}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-200 text-xs font-medium">
                          {cliente.telefono || 'Sin teléfono'}
                        </div>
                        <div className="text-gray-400 text-xs mt-0.5">
                          {cliente.email || 'Sin correo'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-200 text-xs font-bold">
                        {contarProyectosCliente(cliente)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-cyan-700/50 bg-cyan-950/60 text-cyan-300 text-xs font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                          {cliente.estado || 'Prospecto'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={rutaFicha}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-2 border border-white/20 bg-white/5 text-white group-hover:border-[#EAB308] group-hover:bg-[#EAB308] group-hover:text-black px-4 py-1.5 rounded-xl text-xs font-semibold transition-all"
                        >
                          Abrir ficha <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINACIÓN */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-t border-white/10 text-xs text-gray-300">
          <div className="flex items-center gap-3">
            <span>
              Mostrando{' '}
              <strong className="text-white">
                {clientesFiltrados.length === 0 ? 0 : inicio + 1}–
                {Math.min(inicio + filasPorPagina, clientesFiltrados.length)}
              </strong>{' '}
              de <strong className="text-white">{clientesFiltrados.length}</strong>
            </span>
            <span>·</span>
            <div className="flex items-center gap-2">
              <span>Filas por página:</span>
              <select
                value={filasPorPagina}
                onChange={(e) => {
                  setFilasPorPagina(Number(e.target.value));
                  setPagina(1);
                }}
                className="bg-[#181818] border border-white/15 rounded-lg px-2 py-1 text-white"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina === 1}
              className="px-3 py-1.5 rounded-lg bg-[#181818] border border-white/10 hover:bg-white/10 disabled:opacity-40 cursor-pointer"
            >
              ‹ Anterior
            </button>
            <span className="px-3.5 py-1.5 rounded-lg bg-[#EAB308] text-black font-bold">
              Página {pagina}
            </span>
            <button
              type="button"
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={pagina === totalPaginas}
              className="px-3 py-1.5 rounded-lg bg-[#181818] border border-white/10 hover:bg-white/10 disabled:opacity-40 cursor-pointer"
            >
              Siguiente ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}