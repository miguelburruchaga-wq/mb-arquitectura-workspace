"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePreferencias } from '@/components/PreferenciasProvider';
import { useAuth } from '@/components/AuthGate';
import ModalAjustesEstudio from '@/components/ModalAjustesEstudio';
import {
  LayoutGrid,
  Users,
  Compass,
  CheckSquare,
  Calendar,
  Truck,
  ShoppingCart,
  FileText,
  BadgePercent,
  UserCheck,
  Trash2,
  Settings,
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const { tr } = usePreferencias();
  const { usuario, cerrarSesion } = useAuth();

  const [logoUrl, setLogoUrl] = useState('');
  const [nombreEstudio, setNombreEstudio] = useState('MB Arquitectura SA');
  const [modalAjustes, setModalAjustes] = useState(false);

  useEffect(() => {
    const leerDatosEstudio = () => {
      try {
        const rawAp = localStorage.getItem('mb_apariencia_estudio');
        if (rawAp) {
          const ap = JSON.parse(rawAp);
          setLogoUrl(ap.logoUrl || '');
        }
        const nom = localStorage.getItem('mb_estudio_nombre');
        if (nom) setNombreEstudio(nom);
      } catch {
        // Silencioso
      }
    };

    leerDatosEstudio();
    window.addEventListener('mb_apariencia_updated', leerDatosEstudio);
    window.addEventListener('storage', leerDatosEstudio);
    return () => {
      window.removeEventListener('mb_apariencia_updated', leerDatosEstudio);
      window.removeEventListener('storage', leerDatosEstudio);
    };
  }, []);

  const items = [
    { href: '/', label: tr('dashboard'), icon: LayoutGrid },
    { href: '/clientes', label: tr('clientes'), icon: Users },
    { href: '/proyectos', label: tr('proyectos'), icon: Compass },
    { href: '/tareas', label: tr('tareas'), icon: CheckSquare },
    { href: '/agenda', label: tr('visitas'), icon: Calendar },
    { href: '/proveedores', label: tr('proveedores'), icon: Truck },
    { href: '/compras', label: tr('compras'), icon: ShoppingCart },
    { href: '/documentos', label: tr('documentos'), icon: FileText },
    { href: '/finanzas', label: tr('finanzas'), icon: BadgePercent },
    { href: '/equipo', label: tr('equipo'), icon: UserCheck },
  ];

  const nombreMostrar = usuario?.nombre || 'Alejandro Fego';
  const esTitular =
    String(usuario?.tipo_acceso || '').toLowerCase().includes('titular') ||
    usuario?.email === 'alejandrofego1986@gmail.com';
  const badgeRol = esTitular
    ? tr('titular').toUpperCase()
    : (usuario?.tipo_acceso || 'INVITADO').toUpperCase();

  return (
    <>
      <aside className="w-60 sticky top-3 h-[calc(100vh-1.5rem)] my-3 ml-3 rounded-3xl bg-[#23272A] border border-white/10 flex flex-col justify-between flex-shrink-0 z-30 shadow-2xl overflow-hidden">
        {/* PARTE SUPERIOR + NAVEGACIÓN */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 pt-5 pb-4 border-b border-white/10">
            <Link href="/" className="flex items-center gap-3">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="w-10 h-10 rounded-xl object-cover bg-white shadow flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-white text-black font-black text-sm flex items-center justify-center shadow flex-shrink-0">
                  MB
                </div>
              )}
              <div>
                <div className="text-sm font-extrabold text-white leading-none tracking-wide">
                  ARQUITECTOS
                </div>
                <div className="text-[10px] font-semibold text-gray-400 tracking-widest mt-1.5">
                  | WORKSPACE
                </div>
              </div>
            </Link>
          </div>

          <nav className="p-3.5 space-y-1">
            {items.map((item) => {
              const Icon = item.icon;
              const activo =
                item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3.5 px-4 py-2.5 rounded-2xl text-[13px] transition-all ${
                    activo
                      ? 'bg-[#EAB308] text-black font-bold shadow-md'
                      : 'text-gray-200 font-medium hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0 stroke-[1.9]" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* PIE FIJO DEL MENÚ (PAPELERA, CONFIGURACIÓN Y QUIÉN INICIÓ SESIÓN) */}
        <div className="bg-[#1D2023] border-t border-white/10 p-3.5 space-y-1 flex-shrink-0">
          <Link
            href="/papelera"
            className="flex items-center justify-between px-3.5 py-2 rounded-xl text-[13px] font-medium text-gray-200 hover:bg-white/5 transition-colors"
          >
            <span className="inline-flex items-center gap-3">
              <Trash2 className="w-4 h-4 text-gray-300" />
              <span>{tr('papelera')}</span>
            </span>
            <span className="w-5 h-5 rounded-full bg-rose-950/90 border border-rose-800/60 text-rose-400 text-[10px] font-extrabold flex items-center justify-center">
              0
            </span>
          </Link>

          <button
            type="button"
            onClick={() => setModalAjustes(true)}
            className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-[13px] font-medium text-gray-200 hover:bg-white/5 transition-colors cursor-pointer text-left"
          >
            <Settings className="w-4 h-4 text-gray-300" />
            <span>{tr('configuracion')}</span>
          </button>

          {/* TARJETA DE QUIÉN INICIÓ SESIÓN */}
          <div className="pt-3 mt-2 border-t border-white/10 flex items-center justify-between gap-2 px-1.5">
            <button
              type="button"
              onClick={() => setModalAjustes(true)}
              title={`${nombreMostrar} (${usuario?.email || ''})`}
              className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer group"
            >
              {usuario?.foto_url || logoUrl ? (
                <img
                  src={usuario?.foto_url || logoUrl}
                  alt={nombreMostrar}
                  className="w-9 h-9 rounded-full object-cover bg-white flex-shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-white text-black font-black text-xs flex items-center justify-center flex-shrink-0">
                  MB
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white group-hover:text-[#EAB308] truncate transition-colors">
                    {nombreMostrar}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-[#EAB308]/20 border border-[#EAB308]/30 text-[#EAB308] text-[9px] font-extrabold tracking-wide flex-shrink-0">
                    {badgeRol}
                  </span>
                </div>
                <div className="text-[11px] text-gray-400 truncate mt-0.5">
                  {nombreEstudio}
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={cerrarSesion}
              className="text-xs font-bold text-gray-300 hover:text-white cursor-pointer flex-shrink-0"
            >
              {tr('salir')}
            </button>
          </div>
        </div>
      </aside>

      <ModalAjustesEstudio
        abierto={modalAjustes}
        onClose={() => setModalAjustes(false)}
      />
    </>
  );
}