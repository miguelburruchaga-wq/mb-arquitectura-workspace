"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { X, Plus } from 'lucide-react';

export default function BotonNuevoCliente({
  totalClientes = 0,
  onCreado,
}: {
  totalClientes?: number;
  onCreado?: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [montado, setMontado] = useState(false);
  const router = useRouter();

  const generarSiguienteCodigo = () => {
    const num = totalClientes + 1;
    return `CLI-${String(num).padStart(3, '0')}`;
  };

  const [codigo, setCodigo] = useState(generarSiguienteCodigo);
  const [nombre, setNombre] = useState('');
  const [identificacion, setIdentificacion] = useState('');
  const [tipo, setTipo] = useState('Comitente Particular');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [domicilio, setDomicilio] = useState('');
  const [estado, setEstado] = useState('Prospecto');
  const [notas, setNotas] = useState('');

  useEffect(() => {
    setMontado(true);
  }, []);

  useEffect(() => {
    if (abierto) {
      setCodigo(generarSiguienteCodigo());
    }
  }, [abierto, totalClientes]);

  const guardarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);

    const { error } = await supabase
      .from('clientes')
      .insert([
        {
          codigo: codigo.trim(),
          nombre: nombre.trim(),
          identificacion: identificacion.trim() || null,
          tipo,
          email: email.trim() || null,
          telefono: telefono.trim() || null,
          domicilio: domicilio.trim() || null,
          estado,
          notas: notas.trim() || null,
        },
      ]);

    setCargando(false);

    if (!error) {
      setAbierto(false);
      setNombre('');
      setIdentificacion('');
      setEmail('');
      setTelefono('');
      setDomicilio('');
      setNotas('');
      if (onCreado) onCreado();
      window.dispatchEvent(new Event('mb_clientes_actualizados'));
      router.refresh();
    } else {
      alert("Error al guardar cliente: " + error.message);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors shadow-[0_0_20px_rgba(234,179,8,0.2)] cursor-pointer"
      >
        <Plus className="w-4 h-4 stroke-[2.5]" /> Nuevo cliente
      </button>

      {abierto &&
        montado &&
        createPortal(
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
            <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800 w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-gray-800 flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-white">Nuevo Cliente</h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Ficha de contacto, código identificador y datos fiscales
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAbierto(false)}
                  className="text-gray-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto">
                <form id="form-cliente" onSubmit={guardarCliente} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1.5">
                        Código Cliente *
                      </label>
                      <input
                        type="text"
                        value={codigo}
                        onChange={(e) => setCodigo(e.target.value)}
                        required
                        className="w-full bg-[#121212] border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-[#EAB308] font-bold focus:outline-none focus:border-[#EAB308]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1.5">
                        Nombre / Razón Social *
                      </label>
                      <input
                        type="text"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        required
                        placeholder="Ej. Estudio Arq. Pérez / Juan Gómez"
                        className="w-full bg-[#121212] border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1.5">
                        Identificación Fiscal (CUIT / DNI)
                      </label>
                      <input
                        type="text"
                        value={identificacion}
                        onChange={(e) => setIdentificacion(e.target.value)}
                        placeholder="Ej. 20-34567890-1"
                        className="w-full bg-[#121212] border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1.5">
                        Tipo de Cliente
                      </label>
                      <select
                        value={tipo}
                        onChange={(e) => setTipo(e.target.value)}
                        className="w-full bg-[#121212] border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-gray-500"
                      >
                        <option value="Comitente Particular">Comitente Particular</option>
                        <option value="Empresa Desarrolladora">Empresa Desarrolladora</option>
                        <option value="Consorcio / Inmobiliaria">Consorcio / Inmobiliaria</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1.5">
                        Email de Contacto
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="cliente@email.com"
                        className="w-full bg-[#121212] border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1.5">
                        Teléfono
                      </label>
                      <input
                        type="text"
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value)}
                        placeholder="+54 9 11 ..."
                        className="w-full bg-[#121212] border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1.5">
                        Domicilio / Sede
                      </label>
                      <input
                        type="text"
                        value={domicilio}
                        onChange={(e) => setDomicilio(e.target.value)}
                        placeholder="Dirección o localidad"
                        className="w-full bg-[#121212] border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1.5">
                        Estado
                      </label>
                      <select
                        value={estado}
                        onChange={(e) => setEstado(e.target.value)}
                        className="w-full bg-[#121212] border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-gray-500"
                      >
                        <option value="Prospecto">Prospecto</option>
                        <option value="En Consulta / Presupuesto">En Consulta / Presupuesto</option>
                        <option value="Activo">Activo</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">
                      Notas del Cliente
                    </label>
                    <textarea
                      rows={3}
                      value={notas}
                      onChange={(e) => setNotas(e.target.value)}
                      placeholder="Observaciones, preferencias o datos adicionales..."
                      className="w-full bg-[#121212] border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500 resize-none"
                    />
                  </div>
                </form>
              </div>

              <div className="p-5 border-t border-gray-800 flex justify-end gap-4 bg-[#141414]">
                <button
                  type="button"
                  onClick={() => setAbierto(false)}
                  className="text-sm text-gray-400 hover:text-white px-4 py-2 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  form="form-cliente"
                  disabled={cargando}
                  className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-6 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50 cursor-pointer"
                >
                  {cargando ? 'Guardando...' : 'Crear Cliente'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}