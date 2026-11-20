export default function DashboardPrincipal() {
  return (
    <div className="min-h-screen bg-[#121212] text-white p-8 font-sans">
      <header className="mb-8 border-b border-gray-800 pb-4">
        <h1 className="text-3xl font-bold text-orange-500 mb-2">Dashboard</h1>
        <p className="text-gray-400">Resumen general de MB Arquitectura.</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 p-6 shadow-xl">
          <h3 className="text-gray-400 font-medium mb-2">Tareas Pendientes</h3>
          <p className="text-3xl font-bold text-white">0</p>
        </div>
        <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 p-6 shadow-xl">
          <h3 className="text-gray-400 font-medium mb-2">Obras Activas</h3>
          <p className="text-3xl font-bold text-white">0</p>
        </div>
        <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 p-6 shadow-xl">
          <h3 className="text-gray-400 font-medium mb-2">Visitas Hoy</h3>
          <p className="text-3xl font-bold text-white">0</p>
        </div>
      </div>
    </div>
  );
}