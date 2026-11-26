"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ModalAjustesEstudio from '@/components/ModalAjustesEstudio';
import {
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  Compass,
  CheckSquare,
  Calendar,
  Truck,
  ShoppingCart,
  FileText,
  CircleDollarSign,
  UserCheck,
  Trash2,
  Settings,
} from 'lucide-react';

const MENU_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/presupuestos', label: 'Presupuestos', icon: FileSpreadsheet },
  { href: '/proyectos', label: 'Proyectos', icon: Compass },
  { href: '/tareas', label: 'Tareas', icon: CheckSquare },
  { href: '/agenda', label: 'Visitas y Agenda', icon: Calendar },
  { href: '/proveedores', label: 'Proveedores', icon: Truck },
  { href: '/compras', label: 'Compras y Pedidos', icon: ShoppingCart },
  { href: '/documentos', label: 'Documentos', icon: FileText },
  { href: '/finanzas', label: 'Finanzas', icon: CircleDollarSign },
  { href: '/equipo', label: 'Equipo', icon: UserCheck },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [modalAjustesAbierto, setModalAjustesAbierto] = useState(false);
  const [estudioNombre, setEstudioNombre] = useState('MB Arquitectura SA');
  const [usuario, setUsuario] = useState<{
    nombre: string;
    rol: string;
    foto_url?: string;
    rol_sistema?: string;
  }>({
    nombre: 'Alejandro Fego',
    rol: 'Director de Estudio',
    rol_sistema: 'Titular',
  });
  const [cantidadPapelera, setCantidadPapelera] = useState(0);

  const sincronizarIdentidad = () => {
    try {
      const saved = localStorage.getItem('mb_sesion_usuario');
      let parsedUser = saved ? JSON.parse(saved) : null;

      const ajustesRaw = localStorage.getItem('mb_ajustes_estudio');
      const ajustes = ajustesRaw ? JSON.parse(ajustesRaw) : null;

      if (ajustes?.nombreEstudio) {
        setEstudioNombre(ajustes.nombreEstudio);
      }

      if (parsedUser?.nombre) {
        if (ajustes?.titular && (parsedUser.rol_sistema === 'Titular' || !parsedUser.rol_sistema)) {
          parsedUser = { ...parsedUser, nombre: ajustes.titular };
        }
        setUsuario(parsedUser);
      } else if (ajustes?.titular) {
        setUsuario((prev) => ({ ...prev, nombre: ajustes.titular }));
      }
    } catch {
      // Silencioso
    }
  };

  useEffect(() => {
    sincronizarIdentidad();
    window.addEventListener('mb_ajustes_actualizados', sincronizarIdentidad);

    const cargarPapelera = async () => {
      const { count } = await supabase
        .from('papelera')
        .select('*', { count: 'exact', head: true });
      if (typeof count === 'number') setCantidadPapelera(count);
    };
    cargarPapelera();

    return () => {
      window.removeEventListener('mb_ajustes_actualizados', sincronizarIdentidad);
    };
  }, [pathname]);

  const cerrarSesion = () => {
    localStorage.removeItem('mb_sesion_usuario');
    router.push('/login');
  };

  if (pathname === '/login') return null;

  const iniciales = usuario.nombre
    .replace(/^Arq\.\s*/i, '')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <aside className="w-64 m-3 h-[calc(100vh-1.5rem)] sticky top-3 bg-[#181818] border border-white/10 rounded-[28px] shadow-2xl flex flex-col justify-between p-4 flex-shrink-0 select-none z-30">
        <div className="overflow-y-auto pr-0.5">
          <div className="flex items-center gap-3 px-2 py-2.5 mb-5">
            <div className="w-10 h-10 rounded-full bg-white text-black font-black text-sm flex items-center justify-center shadow">
              MB
            </div>
            <div>
              <div className="text-sm font-extrabold tracking-wide text-white leading-tight">
                ARQUITECTOS
              </div>
              <div className="text-[10px] tracking-[0.2em] text-gray-400 font-semibold">
                | WORKSPACE
              </div>
            </div>
          </div>

          <nav className="space-y-1">
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              const activo =
                item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activo
                      ? 'bg-[#D4EE36] text-black shadow-md'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="pt-3 border-t border-white/10 space-y-1.5">
          <Link
            href="/papelera"
            className={`flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
              pathname.startsWith('/papelera')
                ? 'bg-white/10 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="inline-flex items-center gap-2.5">
              <Trash2 className="w-4 h-4" /> Papelera
            </span>
            {cantidadPapelera > 0 && (
              <span className="bg-rose-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                {cantidadPapelera}
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={() => setModalAjustesAbierto(true)}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              modalAjustesAbierto
                ? 'bg-white/10 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Settings className="w-4 h-4" /> Configuración
          </button>

          <div className="bg-[#121212] border border-white/10 rounded-2xl p-2.5 flex items-center justify-between gap-2 mt-2">
            <div className="flex items-center gap-2.5 min-w-0">
              {usuario.foto_url ? (
                <img
                  src={usuario.foto_url}
                  alt={usuario.nombre}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-white text-black font-extrabold text-xs flex items-center justify-center flex-shrink-0">
                  {iniciales}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white truncate">{usuario.nombre}</span>
                  <span className="bg-[#EAB308] text-black text-[9px] font-extrabold px-1.5 py-0.2 rounded">
                    TITULAR
                  </span>
                </div>
                <div className="text-[10px] text-gray-400 truncate">{estudioNombre}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={cerrarSesion}
              className="text-[11px] font-bold text-gray-400 hover:text-white cursor-pointer flex-shrink-0"
            >
              Salir
            </button>
          </div>
        </div>
      </aside>

      <ModalAjustesEstudio
        abierto={modalAjustesAbierto}
        onClose={() => setModalAjustesAbierto(false)}
      />
    </>
  );
}