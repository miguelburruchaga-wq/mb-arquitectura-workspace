"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  FolderKanban, 
  CheckSquare, 
  Calendar, 
  ShoppingCart, 
  FileText, 
  DollarSign 
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  // Lista de todas tus secciones
  const menu = [
    { nombre: 'Dashboard', ruta: '/', icono: LayoutDashboard },
    { nombre: 'Clientes', ruta: '/clientes', icono: Users },
    { nombre: 'Proyectos', ruta: '/proyectos', icono: FolderKanban },
    { nombre: 'Tareas', ruta: '/tareas', icono: CheckSquare },
    { nombre: 'Visitas y Agenda', ruta: '/agenda', icono: Calendar },
    { nombre: 'Compras y Pedidos', ruta: '/compras', icono: ShoppingCart },
    { nombre: 'Documentos', ruta: '/documentos', icono: FileText },
    { nombre: 'Finanzas', ruta: '/finanzas', icono: DollarSign },
  ];

  return (
    <aside className="w-64 bg-[#0A0A0A] border-r border-gray-800 flex flex-col min-h-screen">
      <div className="p-6">
        <h2 className="text-xl font-bold text-orange-600">MB Arquitectura</h2>
        <p className="text-xs text-gray-500 tracking-widest mt-1">WORKSPACE</p>
      </div>
      
      <nav className="flex-1 px-4 space-y-2 mt-4">
        {menu.map((item) => {
          // Detectamos si la ruta actual coincide con la del botón
          const activo = pathname === item.ruta;
          
          return (
            <Link 
              key={item.nombre} 
              href={item.ruta}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                activo 
                  ? 'bg-orange-600/10 text-orange-500 border border-orange-600/20' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <item.icono className="w-5 h-5" />
              {item.nombre}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}