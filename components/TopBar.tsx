import { Search, Sun, AlarmClock, Bell, CircleHelp } from 'lucide-react';

export default function TopBar() {
  return (
    <div className="h-16 flex items-center justify-between px-8 bg-transparent mb-4">
      
      {/* Buscador global */}
      <div className="relative w-96">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
        <input 
          type="text" 
          placeholder="Buscar clientes, proyectos, tareas..." 
          className="w-full bg-[#1A1D27] border border-gray-800 rounded-full pl-11 pr-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-gray-600 transition-colors"
        />
      </div>

      {/* Botones de acción derecha */}
      <div className="flex items-center gap-3">
        
        <button className="flex items-center gap-2 bg-[#1A1A1A] border border-gray-800 hover:bg-gray-800 px-3 py-1.5 rounded-full text-xs text-gray-300 transition-colors">
          <Sun className="w-3.5 h-3.5 text-orange-500" /> Claro
        </button>
        
        <button className="flex items-center gap-2 bg-[#1A1A1A] border border-gray-800 hover:bg-gray-800 px-3 py-1.5 rounded-full text-xs text-gray-300 transition-colors">
          <AlarmClock className="w-3.5 h-3.5 text-orange-500" /> Recordatorios: Sí
        </button>

        <span className="border border-[#EAB308] text-[#EAB308] px-3 py-1.5 rounded-full text-xs font-semibold bg-[#EAB308]/10 ml-1 mr-1">
          Titular
        </span>

        <button className="flex items-center gap-2 bg-[#1A1A1A] border border-gray-800 hover:bg-gray-800 px-3 py-1.5 rounded-full text-xs text-gray-300 transition-colors">
          <Bell className="w-3.5 h-3.5 text-white" /> Notificaciones
        </button>

        <button className="flex items-center gap-2 bg-[#1A1A1A] border border-gray-800 hover:bg-gray-800 px-3 py-1.5 rounded-full text-xs text-gray-300 transition-colors">
          <CircleHelp className="w-3.5 h-3.5 text-white" /> Instructivo
        </button>

        {/* Avatar del usuario */}
        <div className="w-8 h-8 rounded-full bg-[#1A1A1A] border border-gray-700 flex items-center justify-center text-xs font-bold text-gray-300 cursor-pointer hover:bg-gray-800 transition-colors ml-1">
          AF
        </div>

      </div>
    </div>
  );
}