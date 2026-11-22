"use client";

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  Plus, Search, Upload, Download, Lock, ArrowRight, X,
  CheckCircle2, Trash2, MessageCircle, MapPin, Globe, Mail,
} from 'lucide-react';

const RUBROS_OBRA_CIVIL = [
  'Estructuras y Hormigón',
  'Albañilería y Mampostería',
  'Movimiento de Suelos y Demoliciones',
  'Corralón y Materiales Gruesos',
  'Electricidad',
  'Instalación Sanitaria y Gas',
  'Termomecánica y Climatización (HVAC)',
  'Aberturas y Carpintería de Aluminio / PVC',
  'Carpintería de Madera y Mobiliario',
  'Herrería y Estructuras Metálicas',
  'Pintura y Revestimientos Plásticos',
  'Pisos, Porcelanatos y Revestimientos',
  'Construcción en Seco (Durlock / Steel Frame)',
  'Impermeabilizaciones y Techos',
  'Vidriería y Cristales',
  'Iluminación y Artefactos',
  'Griferías y Sanitarios',
  'Marmolería y Mesadas',
  'Paisajismo y Riego',
  'Seguridad, Alarmas y Domótica',
  'Ascensores y Montacargas',
  'Alquiler de Maquinaria y Volquetes',
  'Fletes y Logística de Obra',
  'Otros / Servicios Generales',
];

export default function ProveedoresClient({
  proveedoresIniciales = [],
}: {
  proveedoresIniciales: any[];
}) {
  const router = useRouter();

  const [busqueda, setBusqueda] = useState('');
  const [filtroRubro, setFiltroRubro] = useState('Todos');
  const [pagina, setPagina] = useState(1);
  const [filasPorPagina, setFilasPorPagina] = useState(10);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [proveedorEditando, setProveedorEditando] = useState<any | null>(null);
  const [cargando, setCargando] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Campos del formulario
  const [codigo, setCodigo] = useState('PRV-001');
  const [nombre, setNombre] = useState('');
  const [rubro, setRubro] = useState('Estructuras y Hormigón');
  const [cuit, setCuit] = useState('');
  const [contactoNombre, setContactoNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [paginaWeb, setPaginaWeb] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [notas, setNotas] = useState('');

  const mostrarToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const generarSiguienteCodigo = () => {
    const numeros = proveedoresIniciales
      .map((p) => {
        const match = String(p.codigo || '').match(/PRV-(\d+)/i);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => !isNaN(n));
    const maxNum = numeros.length > 0 ? Math.max(...numeros) : 0;
    return `PRV-${String(maxNum + 1).padStart(3, '0')}`;
  };

  const obtenerUrlWhatsapp = (tel: string) => {
    const soloNumeros = String(tel || '').replace(/\D/g, '');
    if (!soloNumeros) return null;
    const numeroFinal = soloNumeros.length === 10 ? `549${soloNumeros}` : soloNumeros;
    return `https://wa.me/${numeroFinal}`;
  };

  const obtenerUrlMaps = (texto: string) => {
    const limpio = String(texto || '').trim();
    if (!limpio) return null;
    return /^https?:\/\//i.test(limpio)
      ? limpio
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(limpio)}`;
  };

  const obtenerUrlWeb = (url: string) => {
    const limpio = String(url || '').trim();
    if (!limpio) return null;
    return /^https?:\/\//i.test(limpio) ? limpio : `https://${limpio}`;
  };

  const obtenerUrlGmail = (correo: string) => {
    const limpio = String(correo || '').trim();
    if (!limpio || !limpio.includes('@')) return null;
    return `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(limpio)}`;
  };

  const abrirModalNuevo = () => {
    setProveedorEditando(null);
    setCodigo(generarSiguienteCodigo());
    setNombre('');
    setRubro('Estructuras y Hormigón');
    setCuit('');
    setContactoNombre('');
    setDireccion('');
    setPaginaWeb('');
    setEmail('');
    setTelefono('');
    setNotas('');
    setModalAbierto(true);
  };

  const abrirModalEditar = (p: any) => {
    setProveedorEditando(p);
    setCodigo(p.codigo || generarSiguienteCodigo());
    setNombre(p.nombre || '');
    setRubro(p.rubro || 'Estructuras y Hormigón');
    setCuit(p.cuit || '');
    setContactoNombre(p.contacto_nombre || '');
    setDireccion(p.direccion || '');
    setPaginaWeb(p.pagina_web || '');
    setEmail(p.email || '');
    setTelefono(p.telefono || '');
    setNotas(p.notas || '');
    setModalAbierto(true);
  };

  const guardarProveedor = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);

    const datos = {
      codigo: codigo.trim() || generarSiguienteCodigo(),
      nombre: nombre.trim(),
      rubro,
      cuit: cuit.trim() || null,
      contacto_nombre: contactoNombre.trim() || null,
      direccion: direccion.trim() || null,
      pagina_web: paginaWeb.trim() || null,
      email: email.trim() || null,
      telefono: telefono.trim() || null,
      notas: notas.trim() || null,
    };

    const { error } = proveedorEditando
      ? await supabase.from('proveedores').update(datos).eq('id', proveedorEditando.id)
      : await supabase.from('proveedores').insert([datos]);

    setCargando(false);

    if (!error) {
      setModalAbierto(false);
      mostrarToast(proveedorEditando ? 'Proveedor actualizado' : 'Proveedor creado correctamente');
      router.refresh();
    } else {
      alert('Error al guardar proveedor: ' + error.message);
    }
  };

  const eliminarProveedor = async () => {
    if (!proveedorEditando) return;
    setCargando(true);
    const { error } = await supabase.from('proveedores').delete().eq('id', proveedorEditando.id);
    setCargando(false);

    if (!error) {
      setModalAbierto(false);
      mostrarToast('Proveedor eliminado');
      router.refresh();
    } else {
      alert('Error al eliminar proveedor: ' + error.message);
    }
  };

  const proveedoresFiltrados = useMemo(() => {
    return proveedoresIniciales.filter((p) => {
      const q = busqueda.toLowerCase().trim();
      const coincideBusq =
        !q ||
        (p.codigo || '').toLowerCase().includes(q) ||
        (p.nombre || '').toLowerCase().includes(q) ||
        (p.cuit || '').toLowerCase().includes(q) ||
        (p.rubro || '').toLowerCase().includes(q) ||
        (p.contacto_nombre || '').toLowerCase().includes(q) ||
        (p.telefono || '').toLowerCase().includes(q);

      const coincideRubro = filtroRubro === 'Todos' || p.rubro === filtroRubro;
      return coincideBusq && coincideRubro;
    });
  }, [proveedoresIniciales, busqueda, filtroRubro]);

  const totalPaginas = Math.max(1, Math.ceil(proveedoresFiltrados.length / filasPorPagina));
  const inicio = (pagina - 1) * filasPorPagina;
  const proveedoresPaginados = proveedoresFiltrados.slice(inicio, inicio + filasPorPagina);

  return (
    <div className="min-h-screen bg-[#121212] text-white p-8 font-sans">
      {/* CABECERA */}
      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Proveedores</h1>
          <p className="text-sm text-gray-400 mt-1">
            Gestión de proveedores, rubros, datos de contacto y acceso a su ficha completa
          </p>
        </div>

        <button
          onClick={abrirModalNuevo}
          className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors shadow-[0_0_20px_rgba(234,179,8,0.2)] cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" /> Nuevo proveedor
        </button>
      </div>

      {/* PANEL DE BÚSQUEDA Y FILTROS */}
      <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-4 mb-6 shadow-xl">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setPagina(1);
              }}
              placeholder="Buscar proveedor por código (PRV-001), razón social, CUIT, rubro o contacto..."
              className="w-full bg-[#121212] border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-600"
            />
          </div>

          <select
            value={filtroRubro}
            onChange={(e) => {
              setFiltroRubro(e.target.value);
              setPagina(1);
            }}
            className="bg-[#121212] border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs font-medium text-gray-200 focus:outline-none focus:border-gray-600 max-w-[240px]"
          >
            <option value="Todos">Rubro: Todos</option>
            {RUBROS_OBRA_CIVIL.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <div className="w-px h-6 bg-gray-800 hidden xl:block" />

          <button className="bg-[#181818] hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2 cursor-pointer">
            <Upload className="w-3.5 h-3.5" /> Importar
          </button>
          <button className="bg-[#181818] hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2 cursor-pointer">
            <Download className="w-3.5 h-3.5" /> Exportar
          </button>
          <div className="w-px h-6 bg-gray-800 hidden xl:block" />
          <button className="bg-[#181818] hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2 cursor-pointer">
            <Lock className="w-3.5 h-3.5" /> Restringir vista
          </button>
        </div>
      </div>

      {/* TABLA DE PROVEEDORES */}
      <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-5 shadow-xl">
        <h2 className="text-sm font-bold text-white mb-4">
          Proveedores ({proveedoresFiltrados.length})
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-800 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                <th className="py-3 px-3">PROVEEDOR</th>
                <th className="py-3 px-3">RUBRO</th>
                <th className="py-3 px-3">CONTACTO</th>
                <th className="py-3 px-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/70 text-sm">
              {proveedoresPaginados.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-gray-400 text-xs">
                    Aún no hay proveedores cargados. Tocá &quot;+ Nuevo proveedor&quot; para registrar el primero.
                  </td>
                </tr>
              ) : (
                proveedoresPaginados.map((p) => {
                  const waUrl = obtenerUrlWhatsapp(p.telefono);
                  const mapsUrl = obtenerUrlMaps(p.direccion);
                  const webUrl = obtenerUrlWeb(p.pagina_web);
                  const gmailUrl = obtenerUrlGmail(p.email);

                  return (
                    <tr
                      key={p.id}
                      onClick={() => abrirModalEditar(p)}
                      className="hover:bg-[#202020] transition-colors cursor-pointer"
                    >
                      <td className="py-4 px-3">
                        <div className="font-bold text-white">{p.nombre}</div>
                        <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-gray-400 mt-0.5">
                          <span>{p.codigo}</span>
                          {mapsUrl && (
                            <a
                              href={mapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-amber-400 hover:underline"
                            >
                              <MapPin className="w-3 h-3" /> Maps
                            </a>
                          )}
                          {webUrl && (
                            <a
                              href={webUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-cyan-400 hover:underline"
                            >
                              <Globe className="w-3 h-3" /> Web
                            </a>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-3 text-xs text-gray-200">{p.rubro}</td>

                      <td className="py-4 px-3 text-xs">
                        <div className="font-semibold text-white">
                          {p.contacto_nombre || 'Sin contacto'}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-0.5">
                          {p.telefono &&
                            (waUrl ? (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-gray-300 hover:text-emerald-400 hover:underline transition-colors"
                                title="Abrir chat en WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                                <span>{p.telefono}</span>
                              </a>
                            ) : (
                              <span className="text-gray-400">{p.telefono}</span>
                            ))}

                          {gmailUrl && (
                            <a
                              href={gmailUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-gray-300 hover:text-rose-400 hover:underline transition-colors"
                              title="Enviar correo desde Gmail"
                            >
                              <Mail className="w-3.5 h-3.5 text-rose-400" />
                              <span>{p.email}</span>
                            </a>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            abrirModalEditar(p);
                          }}
                          className="px-4 py-2 rounded-xl border border-gray-700 hover:bg-gray-800 text-xs font-semibold text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          Abrir ficha <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINACIÓN */}
        <div className="mt-4 pt-4 border-t border-gray-800/80 flex flex-wrap justify-between items-center gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-3">
            <span>
              Mostrando{' '}
              <strong className="text-white">
                {proveedoresFiltrados.length === 0 ? 0 : inicio + 1}–
                {Math.min(inicio + filasPorPagina, proveedoresFiltrados.length)}
              </strong>{' '}
              de <strong className="text-white">{proveedoresFiltrados.length}</strong>
            </span>
            <span>·</span>
            <div className="flex items-center gap-2">
              <span>Filas por página:</span>
              <select
                value={filasPorPagina}
                onChange={(e) => {
                  setFilasPorPagina(Number(e.target.value));
                  setPagina(1);
                }}
                className="bg-[#121212] border border-gray-800 rounded-lg px-2 py-1 text-white"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina === 1}
              className="px-3 py-1.5 rounded-lg bg-[#121212] border border-gray-800 hover:bg-gray-800 disabled:opacity-40 cursor-pointer"
            >
              ‹ Anterior
            </button>
            <span className="px-3.5 py-1.5 rounded-lg bg-[#EAB308] text-black font-bold">
              Página {pagina}
            </span>
            <button
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={pagina === totalPaginas}
              className="px-3 py-1.5 rounded-lg bg-[#121212] border border-gray-800 hover:bg-gray-800 disabled:opacity-40 cursor-pointer"
            >
              Siguiente ›
            </button>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* MODAL: NUEVO / EDITAR PROVEEDOR                                   */}
      {/* ================================================================= */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800 w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 pt-6 pb-4 flex justify-between items-start">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {proveedorEditando ? 'Ficha de Proveedor' : 'Nuevo Proveedor'}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Código de identificación, rubro, datos fiscales y contacto técnico
                </p>
              </div>
              <button onClick={() => setModalAbierto(false)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={guardarProveedor} className="px-6 pb-6 overflow-y-auto space-y-4">
              {/* Código + Nombre Comercial */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Código Proveedor
                  </label>
                  <input
                    type="text"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    className="w-full bg-[#121212] border border-[#EAB308]/40 rounded-lg px-3 py-2.5 text-sm font-bold text-[#EAB308]"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Nombre Comercial / Razón Social *
                  </label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej. Hormigones del Plata S.A."
                    className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500"
                  />
                </div>
              </div>

              {/* Rubro + CUIT */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Rubro / Gremio / Especialidad
                  </label>
                  <select
                    value={rubro}
                    onChange={(e) => setRubro(e.target.value)}
                    className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white"
                  >
                    {RUBROS_OBRA_CIVIL.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    CUIT / RUT / ID Fiscal
                  </label>
                  <input
                    type="text"
                    value={cuit}
                    onChange={(e) => setCuit(e.target.value)}
                    placeholder="Ej. 30-65891204-2"
                    className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500"
                  />
                </div>
              </div>

              {/* Persona de Contacto + Ubicación (Google Maps) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Persona de Contacto
                  </label>
                  <input
                    type="text"
                    value={contactoNombre}
                    onChange={(e) => setContactoNombre(e.target.value)}
                    placeholder="Ej. Ing. Carlos Mendoza"
                    className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-gray-300">
                      Dirección / Showroom / Corralón
                    </label>
                    {obtenerUrlMaps(direccion) && (
                      <a
                        href={obtenerUrlMaps(direccion)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-bold text-[#EAB308] hover:underline inline-flex items-center gap-1"
                      >
                        <MapPin className="w-3 h-3" /> Abrir Maps
                      </a>
                    )}
                  </div>
                  <input
                    type="text"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    placeholder="Dirección o enlace de Google Maps"
                    className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500"
                  />
                </div>
              </div>

              {/* Email (Gmail) + Teléfono (WhatsApp) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-gray-300">Email</label>
                    {obtenerUrlGmail(email) && (
                      <a
                        href={obtenerUrlGmail(email)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-bold text-rose-400 hover:underline inline-flex items-center gap-1"
                      >
                        <Mail className="w-3 h-3" /> Enviar Gmail
                      </a>
                    )}
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ventas@proveedor.com"
                    className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-gray-300">Teléfono</label>
                    {obtenerUrlWhatsapp(telefono) && (
                      <a
                        href={obtenerUrlWhatsapp(telefono)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-bold text-emerald-400 hover:underline inline-flex items-center gap-1"
                      >
                        <MessageCircle className="w-3 h-3" /> Abrir WhatsApp
                      </a>
                    )}
                  </div>
                  <input
                    type="text"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="+54 / +52 / +34 ..."
                    className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500"
                  />
                </div>
              </div>

              {/* Página Web */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-300">Página Web</label>
                  {obtenerUrlWeb(paginaWeb) && (
                    <a
                      href={obtenerUrlWeb(paginaWeb)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-bold text-cyan-400 hover:underline inline-flex items-center gap-1"
                    >
                      <Globe className="w-3 h-3" /> Abrir Web
                    </a>
                  )}
                </div>
                <input
                  type="text"
                  value={paginaWeb}
                  onChange={(e) => setPaginaWeb(e.target.value)}
                  placeholder="https://www.proveedor.com.ar"
                  className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500"
                />
              </div>

              {/* Condiciones Comerciales / Notas */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Condiciones Comerciales / Notas
                </label>
                <textarea
                  rows={3}
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Plazos de entrega, acopio en planta, sucursal..."
                  className="w-full bg-[#121212] border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 resize-none"
                />
              </div>

              {/* Pie */}
              <div className="flex justify-between items-center pt-3 border-t border-gray-800/80">
                <div>
                  {proveedorEditando && (
                    <button
                      type="button"
                      onClick={eliminarProveedor}
                      disabled={cargando}
                      className="border border-transparent hover:border-red-500/40 hover:bg-red-500/15 text-red-500 px-4 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" /> Eliminar proveedor
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setModalAbierto(false)}
                    className="border border-transparent hover:border-gray-500/40 hover:bg-gray-500/15 text-gray-300 hover:text-white px-4 py-2.5 rounded-lg font-medium text-sm cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={cargando}
                    className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-5 py-2.5 rounded-lg font-bold text-sm cursor-pointer"
                  >
                    {cargando ? 'Guardando...' : proveedorEditando ? 'Guardar Cambios' : 'Crear Proveedor'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#161616] border border-gray-700/80 shadow-2xl rounded-xl px-5 py-3.5 flex items-center gap-3 z-50">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-semibold text-white">{toast}</span>
        </div>
      )}
    </div>
  );
}