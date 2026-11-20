import { Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import BotonNuevaTarea from '@/components/BotonNuevaTarea';

export default async function PanelTareas() {
  // Leemos desde la tabla nueva
  const { data: tareasReales, error } = await supabase
    .from('tareas_nueva')
    .select('id, titulo');

  if (error) {
    console.error("Error cargando tareas:", error.message);
  }

  const tareas = tareasReales || [];

  return (
    <div className="min-h-screen bg-[#121212] text-white p-8 font-sans">
      <header className="mb-8 border-b border-gray-800 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-orange-500 mb-2">Tareas y Entregables</h1>
          <p className="text-gray-400">MB Arquitectura Workspace - Gestión de equipo.</p>
        </div>
        <BotonNuevaTarea />
      </header>

      <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#141414] border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider">
            <tr>
              <th className="p-4 font-semibold">Tarea</th>
              <th className="p-4 font-semibold">Proyecto</th>
              <th className="p-4 font-semibold">Vence</th>
              <th className="p-4 font-semibold">Estado</th>
              <th className="p-4 font-semibold">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800 text-sm">
            {tareas.map((tarea) => (
              <tr key={tarea.id} className="hover:bg-gray-800/50 transition-colors">
                <td className="p-4 font-medium flex items-center gap-3">
                  <Clock className="w-5 h-5 text-orange-500" />
                  {tarea.titulo}
                </td>
                <td className="p-4 text-gray-300">-</td>
                <td className="p-4 text-gray-400">-</td>
                <td className="p-4">-</td>
                <td className="p-4">
                  <button className="text-orange-500 hover:text-orange-400 text-sm font-semibold transition-colors">Editar</button>
                </td>
              </tr>
            ))}
            
            {tareas.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  Aún no hay tareas cargadas en la base de datos de MB Arquitectura.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}