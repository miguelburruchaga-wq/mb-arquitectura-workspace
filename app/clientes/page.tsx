import { Search, Upload, Download, Lock, ChevronRight, ChevronLeft, ArrowRight } from 'lucide-react';
import BotonNuevoCliente from '@/components/BotonNuevoCliente';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default async function PanelClientes() {
  // 1. Buscamos los clientes reales en la base de datos
  const { data: clientes, error } = await supabase
    .from('clientes')
    .select('*')
    .order('created_at', { ascending: false }); // Los más nuevos primero

  const listaClientes = clientes || [];

  return (
    <div className="min-h-screen bg-[#121212] text-white p-8 font-sans">
      
      <header className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Clientes</h1>
          <p className="text-gray-400 text-sm">Gestión de clientes, datos de contacto y acceso a su ficha completa</p>
        </div>
        <BotonNuevoCliente />
      </header>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex-1 min-w-[300px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Buscar cliente por código, nombre, email..." 
            className="w-full bg-[#1A1A1A] border border-gray-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-gray-600 transition-colors"
          />
        </div>
        
        <select className="bg-[#1A1A1A] border border-gray-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none appearance-none">
          <option>Estado: Todos</option>
        </select>
        
        <select className="bg-[#1A1A1A] border border-gray-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none appearance-none">
          <option>Tipo: Todos</option>
        </select>

        <div className="flex items-center gap-3 ml-2">
          <button className="flex items-center gap-2 bg-[#1A1A1A] border border-gray-800 hover:bg-gray-800 px-4 py-2.5 rounded-lg text-sm text-gray-300">
            <Upload className="w-4 h-4" /> Importar
          </button>
          <button className="flex items-center gap-2 bg-[#1A1A1A] border border-gray-800 hover:bg-gray-800 px-4 py-2.5 rounded-lg text-sm text-gray-300">
            <Download className="w-4 h-4" /> Exportar
          </button>
          <button className="flex items-center gap-2 bg-[#1A1A1A] border border-gray-800 hover:bg-gray-800 px-4 py-2.5 rounded-lg text-sm text-gray-300">
            <Lock className="w-4 h-4" /> Restringir vista
          </button>
        </div>
      </div>

      <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 overflow-hidden shadow-2xl">
        
        <div className="p-5 border-b border-gray-800">
          <h2 className="text-white font-semibold text-sm">Clientes ({listaClientes.length})</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#1A1A1A] border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Cliente</th>
                <th className="px-6 py-4 font-semibold">Contacto</th>
                <th className="px-6 py-4 font-semibold">Proyectos</th>
                <th className="px-6 py-4 font-semibold">Estado</th>
                <th className="px-6 py-4 font-semibold text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-sm">
              
              {/* 2. Mostramos cada cliente real de la base de datos */}
              {listaClientes.map((cliente) => (
                <tr key={cliente.id} className="hover:bg-gray-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-bold text-white text-base">{cliente.nombre}</div>
                    <div className="text-gray-400 text-xs mt-0.5">{cliente.codigo} · {cliente.tipo}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-200">{cliente.telefono || 'Sin teléfono'}</div>
                    <div className="text-gray-400 text-xs mt-0.5">{cliente.email || 'Sin correo'}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-200">0</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-cyan-900/50 bg-cyan-900/20 text-cyan-400 text-xs font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
                      {cliente.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link 
                      href={`/clientes/${cliente.codigo}`}
                      className="inline-flex items-center gap-2 border border-gray-600 text-gray-300 hover:text-white hover:bg-gray-700 px-4 py-1.5 rounded-full text-xs font-medium transition-colors"
                    >
                      Abrir ficha <ArrowRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}

              {/* Mensaje por si la tabla está vacía */}
              {listaClientes.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    Todavía no hay clientes registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800 bg-[#1A1A1A]">
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>Mostrando <strong className="text-white">{listaClientes.length > 0 ? 1 : 0}-{listaClientes.length}</strong> de <strong className="text-white">{listaClientes.length}</strong></span>
          </div>
        </div>

      </div>
    </div>
  );
}