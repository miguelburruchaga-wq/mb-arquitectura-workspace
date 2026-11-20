import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Phone, Mail, MapPin, User, AlertTriangle } from 'lucide-react';
import BotoneraFichaCliente from '@/components/BotoneraFichaCliente';

export default async function FichaCliente({ params }: { params: Promise<{ id: string }> }) {
  
  const parametros = await params;
  const clienteId = parametros.id;

  const { data: cliente, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('codigo', clienteId)
    .limit(1)
    .single();

  if (error || !cliente) {
    return (
      <div className="min-h-screen bg-[#121212] text-white p-8 flex flex-col items-center justify-center text-center">
        <AlertTriangle className="w-16 h-16 text-[#EAB308] mb-4" />
        <h1 className="text-3xl font-bold text-white mb-2">Cliente no encontrado</h1>
        <p className="text-gray-400 mb-6">
          Intentamos buscar el código <strong>{clienteId}</strong>, pero no apareció en la base de datos.<br/>
          <span className="text-sm text-red-400 mt-2 block">Detalle técnico: {error?.message || 'La fila no existe'}</span>
        </p>
        <Link href="/clientes" className="bg-[#1A1A1A] border border-gray-800 hover:bg-gray-800 px-6 py-2 rounded-lg font-medium transition-colors">
          Volver al Directorio
        </Link>
      </div>
    );
  }

  const inicial = cliente.nombre ? cliente.nombre.charAt(0).toUpperCase() : 'C';

  return (
    <div className="min-h-screen bg-[#121212] text-white p-8 font-sans">
      
      {/* Botones Superiores Dinámicos */}
      <div className="flex justify-between items-center mb-6">
        <Link 
          href="/clientes" 
          className="flex items-center gap-2 bg-[#1A1A1A] border border-gray-800 hover:bg-gray-800 px-4 py-2 rounded-lg text-sm text-gray-300 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al Directorio de Clientes
        </Link>

        {/* Llamamos al componente y le pasamos los datos del cliente */}
        <BotoneraFichaCliente cliente={cliente} />
      </div>

      {/* Cabecera del Cliente */}
      <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 p-6 mb-6 shadow-xl">
        <div className="flex items-start gap-5">
          <div className="w-14 h-14 rounded-full bg-[#3B2D00] flex items-center justify-center text-[#EAB308] font-bold text-xl flex-shrink-0">
            {inicial}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <span className="bg-blue-900/40 text-blue-400 border border-blue-800/50 px-2 py-0.5 rounded text-xs font-semibold">{cliente.codigo}</span>
              <span className="bg-[#EAB308]/20 text-[#EAB308] px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">{cliente.tipo}</span>
              <span className="text-gray-400 text-xs">ID Fiscal / Doc: {cliente.identificacion || 'No registrado'}</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-cyan-900/50 bg-cyan-900/20 text-cyan-400 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
                {cliente.estado}
              </span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-3">{cliente.nombre}</h1>
            
            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-300">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#EAB308]" />
                {cliente.telefono || 'Sin teléfono'}
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#EAB308]" />
                {cliente.email || 'Sin correo'}
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#EAB308]" />
                {cliente.domicilio || 'Sin domicilio registrado'}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-8">
          <button className="bg-[#EAB308]/10 border border-[#EAB308] text-[#EAB308] px-4 py-2 rounded-md text-sm font-semibold">
            Ficha de Contacto y Resumen
          </button>
          <button className="bg-[#121212] border border-gray-800 text-gray-400 hover:text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
            Proyectos Vinculados (0)
          </button>
          <button className="bg-[#121212] border border-gray-800 text-gray-400 hover:text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
            Cobros y Saldo Pendiente (0)
          </button>
          <button className="bg-[#121212] border border-gray-800 text-gray-400 hover:text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
            Visitas y Documentos (0)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Panel Izquierdo */}
        <div className="col-span-2 bg-[#1A1A1A] rounded-xl border border-gray-800 p-6 shadow-xl">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-[#EAB308]" />
              <div>
                <h2 className="text-white font-bold">Datos Completos de Contacto e Identificación</h2>
                <p className="text-xs text-gray-400 mt-0.5">Código de cliente, información administrativa, ubicación y notas del comitente</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
              <div className="text-white font-semibold">{cliente.identificacion || '-'}</div>
            </div>
            <div className="bg-[#121212] border border-gray-800 rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-1">Tipo de Comitente</div>
              <div className="text-white font-semibold">{cliente.tipo}</div>
            </div>

            <div className="bg-[#121212] border border-gray-800 rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-1">Teléfono / WhatsApp</div>
              <div className="text-white font-semibold">{cliente.telefono || '-'}</div>
            </div>
            <div className="bg-[#121212] border border-gray-800 rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-1">Correo Electrónico</div>
              <div className="text-white font-semibold">{cliente.email || '-'}</div>
            </div>

            <div className="bg-[#121212] border border-gray-800 rounded-lg p-4 col-span-2">
              <div className="text-xs text-gray-500 mb-1">Domicilio / Ubicación</div>
              <div className="text-white font-semibold">{cliente.domicilio || '-'}</div>
            </div>

            <div className="bg-[#121212] border border-gray-800 rounded-lg p-4 col-span-2 min-h-[100px]">
              <div className="text-xs text-gray-500 mb-1">Notas Comerciales, Preferencias y Acuerdos:</div>
              <div className="text-gray-400 text-sm mt-2">
                {cliente.notas || 'Sin observaciones registradas para este cliente.'}
              </div>
            </div>
          </div>
        </div>

        {/* Panel Derecho */}
        <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 p-6 shadow-xl flex flex-col gap-6">
          <div>
            <h2 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">ESTADO DE CUENTA CON EL CLIENTE</h2>
            <div className="bg-[#121212] border border-gray-800 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-2">
                <span className="text-[#EAB308] font-bold text-sm">Moneda ARS</span>
                <span className="text-gray-500 text-xs hover:text-white cursor-pointer">Ver cobros →</span>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-gray-400">
                  <span>Honorarios pactados:</span>
                  <span className="text-white font-medium">ARS $0</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Total cobrado:</span>
                  <span className="text-emerald-500 font-medium">ARS $0</span>
                </div>
                <div className="flex justify-between text-white font-bold pt-2 border-t border-gray-800">
                  <span>Saldo pendiente:</span>
                  <span className="text-emerald-500">ARS $0</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Proyectos vinculados (0)</h2>
              <span className="text-[#EAB308] text-xs hover:text-white cursor-pointer">Ver todos →</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}