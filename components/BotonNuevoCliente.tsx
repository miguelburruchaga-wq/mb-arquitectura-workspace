"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { X } from 'lucide-react';

export default function BotonNuevoCliente() {
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const router = useRouter();

  // Estados para cada campo
  const [codigo, setCodigo] = useState('CLI-002');
  const [nombre, setNombre] = useState('');
  const [identificacion, setIdentificacion] = useState('');
  const [tipo, setTipo] = useState('Comitente Particular');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [domicilio, setDomicilio] = useState('');
  const [estado, setEstado] = useState('En Consulta / Presupuesto');
  const [notas, setNotas] = useState('');

  const guardarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);

    const { error } = await supabase
      .from('clientes')
      .insert([
        { 
          codigo, 
          nombre, 
          identificacion, 
          tipo, 
          email, 
          telefono, 
          domicilio, 
          estado, 
          notas 
        }
      ]);

    setCargando(false);
    
    if (!error) {
      setAbierto(false); 
      // Limpiar formulario
      setNombre(''); setIdentificacion(''); setEmail(''); 
      setTelefono(''); setDomicilio(''); setNotas('');
      router.refresh(); 
    } else {
      alert("Error al guardar: " + error.message);
    }
  };

  return (
    <>
      <button 
        onClick={() => setAbierto(true)}
        className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-4 py-2.5 rounded-md font-semibold text-sm flex items-center gap-2 transition-colors"
      >
        <span>+</span> Nuevo cliente
      </button>

      {abierto && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="p-6 border-b border-gray-800 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-white">Nuevo Cliente</h2>
                <p className="text-sm text-gray-400 mt-1">Ficha de contacto, código identificador y datos fiscales</p>
              </div>
              <button onClick={() => setAbierto(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="form-cliente" onSubmit={guardarCliente} className="space-y-5">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">Código Cliente</label>
                    <input 
                      type="text" value={codigo} onChange={(e) => setCodigo(e.target.value)} required
                      className="w-full bg-[#121212] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-[#EAB308] font-medium focus:border-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">Nombre / Razón Social *</label>
                    <input 
                      type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required
                      className="w-full bg-[#121212] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-gray-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">Identificación Fiscal</label>
                    <input 
                      type="text" value={identificacion} onChange={(e) => setIdentificacion(e.target.value)}
                      className="w-full bg-[#121212] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">Tipo de Cliente</label>
                    <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full bg-[#121212] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-gray-500">
                      <option>Comitente Particular</option>
                      <option>Empresa Desarrolladora</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">Email de Contacto</label>
                    <input 
                      type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#121212] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">Teléfono</label>
                    <input 
                      type="text" value={telefono} onChange={(e) => setTelefono(e.target.value)}
                      className="w-full bg-[#121212] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-gray-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">Domicilio / Sede</label>
                    <input 
                      type="text" value={domicilio} onChange={(e) => setDomicilio(e.target.value)}
                      className="w-full bg-[#121212] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">Estado</label>
                    <select value={estado} onChange={(e) => setEstado(e.target.value)} className="w-full bg-[#121212] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-gray-500">
                      <option>En Consulta / Presupuesto</option>
                      <option>Activo</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">Notas del Cliente</label>
                  <textarea 
                    rows={3} value={notas} onChange={(e) => setNotas(e.target.value)}
                    className="w-full bg-[#121212] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-gray-500"
                  ></textarea>
                </div>
                
              </form>
            </div>

            <div className="p-5 border-t border-gray-800 flex justify-end gap-4 bg-[#141414]">
              <button onClick={() => setAbierto(false)} className="text-sm text-gray-400 hover:text-white">Cancelar</button>
              <button 
                type="submit" form="form-cliente" disabled={cargando}
                className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-6 py-2 rounded-lg font-bold text-sm disabled:opacity-50"
              >
                {cargando ? 'Guardando...' : 'Crear Cliente'}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}