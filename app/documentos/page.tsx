export default function PanelDocumentos() {
  return (
    <div className="min-h-screen bg-[#121212] text-white p-8 font-sans">
      <header className="mb-8 border-b border-gray-800 pb-4">
        <h1 className="text-3xl font-bold text-orange-500 mb-2">Documentos</h1>
        <p className="text-gray-400">Planos, contratos y archivos adjuntos.</p>
      </header>
      <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 p-8 text-center text-gray-500 shadow-xl">
        Aquí conectaremos el almacenamiento de archivos.
      </div>
    </div>
  );
}