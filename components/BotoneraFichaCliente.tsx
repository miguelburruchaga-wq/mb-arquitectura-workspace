"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Plus, Wallet, Pencil, Trash2, X, AlertOctagon, RotateCcw } from 'lucide-react';

export default function BotoneraFichaCliente({ cliente }: { cliente: any }) {
  const router = useRouter();
  
  // Estados de los modales
  const [modalEditar, setModalEditar] = useState(false);
  const [modalCobro, setModalCobro] = useState(false);
  const [modalProyecto, setModalProyecto] = useState(false);
  const [modalEliminar, setModalEliminar] = useState(false); // NUEVO: Modal de eliminación
  
  // Estado del notificador de "Deshacer"
  const [toastDeshacer, setToastDeshacer] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [cargando, setCargando] = useState(false);

  // Estados del formulario de edición
  const [nombre, setNombre] = useState(cliente.nombre || '');
  const [identificacion, setIdentificacion] = useState(cliente.identificacion || '');
  const [email, setEmail] = useState(cliente.email || '');
  const [telefono, setTelefono] = useState(cliente.telefono || '');
  const [domicilio, setDomicilio] = useState(cliente.domicilio || '');
  const [notas, setNotas] = useState(cliente.notas || '');

  // Limpiamos el temporizador si el componente se desmonta
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // 1. Abre el modal con diseño para confirmar
  const pedirConfirmacion = () => {
    setModalEditar(false);
    setModalEliminar(true);
  };

  // 2. Cierra el modal, muestra el cartel de deshacer y arranca la cuenta regresiva de 4s
  const iniciarEliminacion = () => {
    setModalEliminar(false);
    setToastDeshacer(true);

    timerRef.current = setTimeout(async () => {
      setToastDeshacer(false);
      setCargando(true);
      
      // Pasaron 4 segundos sin deshacer: eliminamos en la base de datos
      const { error } = await supabase.from('clientes').delete().eq('id', cliente.id);
      
      if (!error) {
        router.push('/clientes'); 
        router.refresh();
      } else {
        setCargando(false);
        alert("Error al eliminar: " + error.message);
      }
    }, 4000); // 4000 milisegundos = 4 segundos
  };

  // 3. Frena la cuenta regresiva y cancela la eliminación
  const deshacerEliminacion = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToastDeshacer(false);
  };

  // Función para Guardar Cambios de Edición
  const actualizarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);

    const { error } = await supabase
      .from('clientes')
      .update({ nombre, identificacion, email, telefono, domicilio, notas })
      .eq('id', cliente.id);

    setCargando(false);

    if (!error) {
      setModalEditar(false);
      router.refresh(); 
    } else {
      alert("Error al actualizar: " + error.message);
    }
  };

  return (
    <>
      {/* BOTONERA SUPERIOR */}
      <div className="flex gap-3">
        <button 
          onClick={() => setModalProyecto(true)}
          disabled={toastDeshacer}
          className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> Nuevo proyecto con este cliente
        </button>
        <button 
          onClick={() => setModalCobro(true)}
          disabled={toastDeshacer}
          className="bg-[#059669] hover:bg-[#047857] text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <Wallet className="w-4 h-4" /> Registrar cobro
        </button>
        <button 
          onClick={() => setModalEditar(true)}
          disabled={toastDeshacer}
          className="bg-[#1A1A1A] border border-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <Pencil className="w-4 h-4 text-gray-400" /> Editar ficha
        </button>
        <button 
          onClick={pedirConfirmacion}
          disabled={toastDeshacer || cargando}
          className="bg-red-950/30 border border-red-900/50 hover:bg-red-900/40 text-red-500 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" /> Papelera
        </button>
      </div>

      {/* NUEVO MODAL: CONFIRMAR ELIMINACIÓN */}
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
                className="px-6 py-2.5 text-sm font-medium text-gray-300 hover:text-white bg-[#121212] border border-gray-700 hover:bg-gray-800 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={iniciarEliminacion}
                className="px-6 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-500 rounded-lg shadow-lg transition-colors"
              >
                Sí, eliminar cliente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICADOR FLOTANTE (TOAST) DE DESHACER */}
      {toastDeshacer && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-[#1A1A1A] border border-gray-700 shadow-2xl rounded-full px-6 py-3 flex items-center gap-6 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
            <span className="text-sm font-medium text-white">Eliminando cliente...</span>
          </div>
          <div className="w-px h-6 bg-gray-700"></div>
          <button 
            onClick={deshacerEliminacion}
            className="text-sm font-bold text-[#EAB308] hover:text-[#CA9A04] flex items-center gap-2 transition-colors"
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
              <button onClick={() => setModalEditar(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="form-editar" onSubmit={actualizarCliente} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">Código Cliente</label>
                    <input type="text" value={cliente.codigo} disabled className="w-full bg-[#121212] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-[#EAB308] font-medium opacity-70 cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">Nombre / Razón Social *</label>
                    <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required className="w-full bg-[#121212] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-gray-500" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">Identificación Fiscal</label>
                    <input type="text" value={identificacion} onChange={(e) => setIdentificacion(e.target.value)} className="w-full bg-[#121212] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-gray-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">Tipo de Cliente</label>
                    <input type="text" value={cliente.tipo} disabled className="w-full bg-[#121212] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white opacity-70 cursor-not-allowed" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">Email de Contacto</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#121212] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-gray-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">Teléfono</label>
                    <input type="text" value={telefono} onChange={(e) => setTelefono(e.target.value)} className="w-full bg-[#121212] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-gray-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">Domicilio / Sede</label>
                  <input type="text" value={domicilio} onChange={(e) => setDomicilio(e.target.value)} className="w-full bg-[#121212] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-gray-500" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">Notas del Cliente</label>
                  <textarea rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} className="w-full bg-[#121212] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-gray-500"></textarea>
                </div>
              </form>
            </div>

            <div className="p-5 border-t border-gray-800 flex justify-between bg-[#141414]">
              <button type="button" onClick={pedirConfirmacion} className="text-sm font-medium text-red-500 hover:text-red-400 flex items-center gap-2">
                <Trash2 className="w-4 h-4" /> Enviar a papelera
              </button>
              <div className="flex gap-4">
                <button onClick={() => setModalEditar(false)} className="text-sm text-gray-400 hover:text-white">Cancelar</button>
                <button type="submit" form="form-editar" disabled={cargando} className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-6 py-2 rounded-lg font-bold text-sm disabled:opacity-50">
                  {cargando ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALES MAQUETA (Cobro y Proyecto) */}
      {modalCobro && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 w-full max-w-xl shadow-2xl p-6 relative">
            <button onClick={() => setModalCobro(false)} className="absolute top-6 right-6 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            <h2 className="text-xl font-bold text-white mb-1">Nuevo Movimiento Financiero</h2>
            <p className="text-sm text-gray-400 mb-6">Registro multimoneda de honorarios, cobros y gastos</p>
            <div className="bg-[#121212] border border-gray-800 rounded-lg p-8 text-center text-gray-500 mb-6">Pronto conectaremos este formulario.</div>
            <div className="flex justify-end gap-4">
              <button onClick={() => setModalCobro(false)} className="text-sm text-gray-400 hover:text-white">Cancelar</button>
              <button className="bg-[#EAB308] text-black px-6 py-2 rounded-lg font-bold text-sm opacity-50 cursor-not-allowed">Registrar Movimiento</button>
            </div>
          </div>
        </div>
      )}

      {modalProyecto && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 w-full max-w-2xl shadow-2xl p-6 relative">
            <button onClick={() => setModalProyecto(false)} className="absolute top-6 right-6 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            <h2 className="text-xl font-bold text-white mb-1">Nuevo Proyecto</h2>
            <p className="text-sm text-gray-400 mb-6">Arquitectura, diseño de interiores, paisajismo, reforma u obra</p>
            <div className="bg-[#121212] border border-gray-800 rounded-lg p-8 text-center text-gray-500 mb-6">Pronto conectaremos este formulario.</div>
            <div className="flex justify-end gap-4">
              <button onClick={() => setModalProyecto(false)} className="text-sm text-gray-400 hover:text-white">Cancelar</button>
              <button className="bg-[#EAB308] text-black px-6 py-2 rounded-lg font-bold text-sm opacity-50 cursor-not-allowed">Crear Proyecto</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}