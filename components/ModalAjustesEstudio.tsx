"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { usePreferencias, Idioma, Paleta } from '@/components/PreferenciasProvider';
import {
  X,
  UserCheck,
  Globe,
  Languages,
  Sun,
  Moon,
  Type,
  Layers,
  Trash2,
  Building2,
  Shield,
  Download,
  Upload,
  Save,
  CheckCircle2,
  Palette,
} from 'lucide-react';

const MONEDAS_DISPONIBLES = [
  { codigo: 'ARS', nombre: 'Peso argentino' },
  { codigo: 'USD', nombre: 'Dólar estadounidense' },
  { codigo: 'EUR', nombre: 'Euro' },
  { codigo: 'UYU', nombre: 'Peso uruguayo' },
  { codigo: 'CLP', nombre: 'Peso chileno' },
  { codigo: 'MXN', nombre: 'Peso mexicano' },
  { codigo: 'BRL', nombre: 'Real brasileño' },
];

const ETAPAS_DEFAULT = [
  'Relevamiento y Concepto',
  'Anteproyecto y Diseño',
  'Proyecto Ejecutivo y Detalles',
  'Presupuesto y Compras',
  'Dirección y Ejecución de Obra',
  'Entrega y Post-Obra',
];

const TIPOLOGIAS_DEFAULT = [
  'Vivienda Unifamiliar',
  'Diseño de Interiores e Interiorismo',
  'Paisajismo y Diseño de Exteriores',
  'Reforma y Remodelación',
  'Local Comercial y Oficinas',
  'Edificio Residencial',
  'Mobiliario y Equipamiento',
  'Estación de Servicio',
];

const PALETAS_SISTEMA: {
  id: Paleta;
  nombre: string;
  desc: string;
  circulos: string[];
}[] = [
  {
    id: 'volt',
    nombre: 'Volt & Ébano',
    desc: 'Ébano #141513, volt lima #D5FF40, piedra #C0C2B8 y blanco #FFFFFF.',
    circulos: ['#141513', '#D5FF40', '#C0C2B8', '#FFFFFF'],
  },
  {
    id: 'claridad',
    nombre: 'Claridad y Acción',
    desc: 'Carbón #202020, grafito #333533, amarillo #FFD100 y gris #D6D6D6.',
    circulos: ['#202020', '#333533', '#FFD100', '#D6D6D6'],
  },
  {
    id: 'esmeralda',
    nombre: 'Esmeralda & Oro',
    desc: 'Ámbar dorado #EBAE29, esmeralda #589C80, petróleo #132228 y marfil #F5EED2.',
    circulos: ['#EBAE29', '#589C80', '#132228', '#F5EED2'],
  },
  {
    id: 'borgona',
    nombre: 'Borgoña & Coral',
    desc: 'Borgoña #4C1D3D, rubí #A33757, coral #DC586D y durazno #FFBB94.',
    circulos: ['#4C1D3D', '#A33757', '#DC586D', '#FFBB94'],
  },
  {
    id: 'hormigon',
    nombre: 'Hormigón & Cobre',
    desc: 'Hormigón #1F2124, cobre #C86D44, acero #8E959E y arena #F4EFEA.',
    circulos: ['#1F2124', '#C86D44', '#8E959E', '#F4EFEA'],
  },
  {
    id: 'azulplano',
    nombre: 'Azul Plano & Terracota',
    desc: 'Azul noche #16202C, terracota #D96B43, pizarra #475569 y papel #F1F4F8.',
    circulos: ['#16202C', '#D96B43', '#475569', '#F1F4F8'],
  },
];

const TEXTOS: Record<Idioma, Record<string, string>> = {
  ES: {
    pref: 'PREFERENCIAS DEL ESTUDIO',
    titulo: 'Ajustes del Estudio de Arquitectura y Diseño',
    s1: '1. Datos e identidad del estudio',
    nombreEstudio: 'Nombre del estudio',
    titular: 'Profesional titular',
    matricula: 'Matrícula / Registro',
    s2: '2. Idioma, país y moneda a utilizar',
    idiomaSis: 'Idioma del sistema',
    idiomaSub: 'Se aplica al instante y se sincroniza en tus dispositivos',
    pais: 'País',
    monedaAgregar: 'Moneda a utilizar (seleccionar para agregar)',
    s3: '3. Apariencia y lectura',
    modoPantalla: 'Modo de pantalla',
    claro: 'Modo Claro',
    oscuro: 'Modo Oscuro',
    tamanoLetra: 'Tamaño de letra',
    letraStd: 'Letra Estándar',
    letraGrande: 'Letra Amplia de Lectura',
    paleta: 'Paleta del sistema',
    enVivo: 'Aplicación en vivo',
    activa: '✓ Activa',
    s4: '4. Etapas y tipologías de obra',
    etapasTitulo: 'Etapas de proyecto y obra',
    tipologiasTitulo: 'Tipologías de obra del estudio',
    anadir: '+ Añadir',
    s5: '5. Respaldo y blindaje de datos (Copia de seguridad)',
    cerrar: 'Cerrar',
    guardar: 'Guardar ajustes',
  },
  EN: {
    pref: 'STUDIO PREFERENCES',
    titulo: 'Architecture & Design Studio Settings',
    s1: '1. Studio identity & details',
    nombreEstudio: 'Studio name',
    titular: 'Lead architect / Owner',
    matricula: 'License / Registration',
    s2: '2. Language, country & currency',
    idiomaSis: 'System language',
    idiomaSub: 'Applies instantly and syncs across your devices',
    pais: 'Country',
    monedaAgregar: 'Currency to use (select to add)',
    s3: '3. Appearance & readability',
    modoPantalla: 'Display mode',
    claro: 'Light Mode',
    oscuro: 'Dark Mode',
    tamanoLetra: 'Font size',
    letraStd: 'Standard Font',
    letraGrande: 'Large Reading Font',
    paleta: 'System color palette',
    enVivo: 'Live preview',
    activa: '✓ Active',
    s4: '4. Project stages & building types',
    etapasTitulo: 'Project & construction stages',
    tipologiasTitulo: 'Studio project typologies',
    anadir: '+ Add',
    s5: '5. Data backup & security',
    cerrar: 'Close',
    guardar: 'Save settings',
  },
  PT: {
    pref: 'PREFERÊNCIAS DO ESCRITÓRIO',
    titulo: 'Configurações do Escritório de Arquitetura e Design',
    s1: '1. Dados e identidade do escritório',
    nombreEstudio: 'Nome do escritório',
    titular: 'Profissional titular',
    matricula: 'Registro / CAU',
    s2: '2. Idioma, país e moeda',
    idiomaSis: 'Idioma do sistema',
    idiomaSub: 'Aplica-se instantaneamente e sincroniza nos seus dispositivos',
    pais: 'País',
    monedaAgregar: 'Moeda a utilizar (selecione para adicionar)',
    s3: '3. Aparência e leitura',
    modoPantalla: 'Modo de tela',
    claro: 'Modo Claro',
    oscuro: 'Modo Escuro',
    tamanoLetra: 'Tamanho da fonte',
    letraStd: 'Fonte Padrão',
    letraGrande: 'Fonte Ampla de Leitura',
    paleta: 'Paleta do sistema',
    enVivo: 'Aplicação ao vivo',
    activa: '✓ Ativa',
    s4: '4. Etapas e tipologias de obra',
    etapasTitulo: 'Etapas de projeto e obra',
    tipologiasTitulo: 'Tipologias de obra do escritório',
    anadir: '+ Adicionar',
    s5: '5. Backup e segurança de dados',
    cerrar: 'Fechar',
    guardar: 'Salvar ajustes',
  },
};

export default function ModalAjustesEstudio({
  abierto,
  onClose,
}: {
  abierto: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const {
    idioma,
    modoPantalla,
    tamanoLetra,
    paleta,
    setIdioma,
    setModoPantalla,
    setTamanoLetra,
    setPaleta,
  } = usePreferencias();

  const t = TEXTOS[idioma];
  const [montado, setMontado] = useState(false);

  const [nombreEstudio, setNombreEstudio] = useState('MB Arquitectura SA');
  const [titular, setTitular] = useState('Alejandro Fego');
  const [matricula, setMatricula] = useState('');
  const [pais, setPais] = useState('Argentina');
  const [monedasActivas, setMonedasActivas] = useState<string[]>(['USD', 'ARS']);
  const [monedaPrincipal, setMonedaPrincipal] = useState('ARS');
  const [etapas, setEtapas] = useState<string[]>(ETAPAS_DEFAULT);
  const [nuevaEtapa, setNuevaEtapa] = useState('');
  const [tipologias, setTipologias] = useState<string[]>(TIPOLOGIAS_DEFAULT);
  const [nuevaTipologia, setNuevaTipologia] = useState('');
  const [descargando, setDescargando] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setMontado(true);
  }, []);

  useEffect(() => {
    if (!abierto) return;
    try {
      const guardado = localStorage.getItem('mb_ajustes_estudio');
      if (guardado) {
        const parsed = JSON.parse(guardado);
        if (parsed.nombreEstudio) setNombreEstudio(parsed.nombreEstudio);
        if (parsed.titular) setTitular(parsed.titular);
        if (parsed.matricula !== undefined) setMatricula(parsed.matricula);
        if (parsed.pais) setPais(parsed.pais);
        if (Array.isArray(parsed.monedasActivas)) setMonedasActivas(parsed.monedasActivas);
        if (parsed.monedaPrincipal) setMonedaPrincipal(parsed.monedaPrincipal);
        if (Array.isArray(parsed.etapas)) setEtapas(parsed.etapas);
        if (Array.isArray(parsed.tipologias)) setTipologias(parsed.tipologias);
      }
    } catch {
      // Silencioso
    }
  }, [abierto]);

  if (!abierto || !montado) return null;

  const mostrarToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const agregarMoneda = (codigo: string) => {
    if (!monedasActivas.includes(codigo)) {
      setMonedasActivas([...monedasActivas, codigo]);
    }
  };

  const quitarMoneda = (codigo: string) => {
    if (monedasActivas.length <= 1) return;
    const restantes = monedasActivas.filter((m) => m !== codigo);
    setMonedasActivas(restantes);
    if (monedaPrincipal === codigo) setMonedaPrincipal(restantes[0]);
  };

  const agregarEtapa = () => {
    const val = nuevaEtapa.trim();
    if (!val || etapas.includes(val)) return;
    setEtapas([...etapas, val]);
    setNuevaEtapa('');
  };

  const agregarTipologia = () => {
    const val = nuevaTipologia.trim();
    if (!val || tipologias.includes(val)) return;
    const actualizadas = [...tipologias, val];
    setTipologias(actualizadas);
    setNuevaTipologia('');
    try {
      const actual = JSON.parse(localStorage.getItem('mb_ajustes_estudio') || '{}');
      localStorage.setItem(
        'mb_ajustes_estudio',
        JSON.stringify({ ...actual, tipologias: actualizadas })
      );
    } catch {
      // Silencioso
    }
    mostrarToast(`Tipología "${val}" agregada`);
  };

  const descargarRespaldo = async () => {
    setDescargando(true);
    try {
      const [
        { data: proyectos },
        { data: clientes },
        { data: tareas },
        { data: visitas },
        { data: movimientos },
        { data: compras },
        { data: documentos },
        { data: equipo },
      ] = await Promise.all([
        supabase.from('proyectos').select('*'),
        supabase.from('clientes').select('*'),
        supabase.from('tareas').select('*'),
        supabase.from('visitas').select('*'),
        supabase.from('movimientos').select('*'),
        supabase.from('compras').select('*'),
        supabase.from('documentos').select('*'),
        supabase.from('equipo').select('*'),
      ]);

      const respaldo = {
        estudio: nombreEstudio,
        fecha: new Date().toISOString(),
        proyectos: proyectos || [],
        clientes: clientes || [],
        tareas: tareas || [],
        visitas: visitas || [],
        movimientos: movimientos || [],
        compras: compras || [],
        documentos: documentos || [],
        equipo: equipo || [],
      };

      const blob = new Blob([JSON.stringify(respaldo, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `respaldo_${nombreEstudio.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      mostrarToast('Respaldo .JSON descargado');
    } catch {
      mostrarToast('No se pudo generar el respaldo');
    } finally {
      setDescargando(false);
    }
  };

  const restaurarRespaldo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        JSON.parse(String(reader.result || '{}'));
        mostrarToast(`Archivo ${file.name} validado`);
      } catch {
        mostrarToast('El archivo seleccionado no es un JSON válido');
      }
    };
    reader.readAsText(file);
  };

  const guardarAjustes = async () => {
    const titularLimpio = titular.trim() || 'Alejandro Fego';
    const estudioLimpio = nombreEstudio.trim() || 'MB Arquitectura SA';

    const payload = {
      nombreEstudio: estudioLimpio,
      titular: titularLimpio,
      matricula,
      idioma,
      pais,
      monedasActivas,
      monedaPrincipal,
      modoPantalla,
      tamanoLetra,
      paleta,
      etapas,
      tipologias,
    };

    try {
      localStorage.setItem('mb_ajustes_estudio', JSON.stringify(payload));
      localStorage.setItem('mb_estudio_nombre', estudioLimpio);

      // Actualizar sesión activa del usuario si es el titular
      const sesionRaw = localStorage.getItem('mb_sesion_usuario');
      if (sesionRaw) {
        const sesion = JSON.parse(sesionRaw);
        const actualizado = { ...sesion, nombre: titularLimpio };
        localStorage.setItem('mb_sesion_usuario', JSON.stringify(actualizado));
        if (sesion.id) {
          await supabase.from('equipo').update({ nombre: titularLimpio }).eq('id', sesion.id);
        }
      }

      window.dispatchEvent(new Event('mb_ajustes_actualizados'));
    } catch {
      // Silencioso
    }

    mostrarToast('Ajustes guardados correctamente');
    router.refresh();
    setTimeout(() => onClose(), 550);
  };

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#141414] border border-gray-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* CABECERA */}
        <div className="px-6 py-5 bg-[#10141B] border-b border-gray-800/80 flex justify-between items-start">
          <div>
            <div className="text-[10px] font-extrabold tracking-widest uppercase text-[#EAB308]">
              {t.pref}
            </div>
            <h2 className="text-xl font-extrabold text-white mt-0.5">{t.titulo}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white cursor-pointer p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENIDO */}
        <div className="p-6 overflow-y-auto space-y-7">
          {/* 1. DATOS E IDENTIDAD */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-gray-800/80">
              <UserCheck className="w-4 h-4 text-[#EAB308]" /> {t.s1}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  {t.nombreEstudio}
                </label>
                <input
                  type="text"
                  value={nombreEstudio}
                  onChange={(e) => setNombreEstudio(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  {t.titular}
                </label>
                <input
                  type="text"
                  value={titular}
                  onChange={(e) => setTitular(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  {t.matricula}
                </label>
                <input
                  type="text"
                  value={matricula}
                  onChange={(e) => setMatricula(e.target.value)}
                  placeholder="Ej. CPAU XX.XXX"
                  className="w-full bg-[#1A1A1A] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500"
                />
              </div>
            </div>
          </section>

          {/* 2. IDIOMA, PAÍS Y MONEDA */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-gray-800/80">
              <Globe className="w-4 h-4 text-[#EAB308]" /> {t.s2}
            </h3>

            <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <Languages className="w-4 h-4 text-[#EAB308]" /> {t.idiomaSis}
                </span>
                <span className="text-[11px] text-gray-400">{t.idiomaSub}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'ES' as Idioma, title: 'Español', sub: 'Español (LATAM / España)' },
                  { id: 'EN' as Idioma, title: 'English', sub: 'English (International)' },
                  { id: 'PT' as Idioma, title: 'Português', sub: 'Português (Brasil / Portugal)' },
                ].map((lang) => {
                  const activo = idioma === lang.id;
                  return (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => setIdioma(lang.id)}
                      className={`p-3.5 rounded-xl border text-left flex justify-between items-center cursor-pointer transition-all ${
                        activo
                          ? 'bg-[#EAB308]/10 border-[#EAB308]'
                          : 'bg-[#141414] border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-white">{lang.title}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5">{lang.sub}</div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                          activo ? 'bg-[#EAB308] text-black' : 'bg-gray-800 text-gray-300'
                        }`}
                      >
                        {lang.id}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">{t.pais}</label>
                <select
                  value={pais}
                  onChange={(e) => setPais(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white"
                >
                  <option value="Argentina">Argentina</option>
                  <option value="Uruguay">Uruguay</option>
                  <option value="Chile">Chile</option>
                  <option value="España">España</option>
                  <option value="México">México</option>
                  <option value="Brasil">Brasil</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  {t.monedaAgregar}
                </label>
                <select
                  value={monedaPrincipal}
                  onChange={(e) => agregarMoneda(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white"
                >
                  {MONEDAS_DISPONIBLES.map((m) => (
                    <option key={m.codigo} value={m.codigo}>
                      {m.codigo} — {m.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-4 space-y-2.5">
              <div className="text-xs font-bold text-white">Monedas a utilizar en el sistema:</div>
              <div className="flex flex-wrap gap-2 pt-1">
                {monedasActivas.map((cod) => {
                  const info = MONEDAS_DISPONIBLES.find((m) => m.codigo === cod);
                  const esPrincipal = monedaPrincipal === cod;
                  return (
                    <div
                      key={cod}
                      onClick={() => setMonedaPrincipal(cod)}
                      className={`px-3 py-1.5 rounded-xl border text-xs inline-flex items-center gap-2 cursor-pointer ${
                        esPrincipal
                          ? 'bg-[#EAB308]/10 border-[#EAB308] text-[#EAB308]'
                          : 'bg-[#141414] border-gray-700 text-gray-200'
                      }`}
                    >
                      <span className="font-bold">{cod}</span>
                      <span className="text-gray-400">— {info?.nombre || cod}</span>
                      {esPrincipal && (
                        <span className="bg-[#EAB308] text-black px-1.5 py-0.5 rounded text-[10px] font-extrabold">
                          Principal
                        </span>
                      )}
                      {monedasActivas.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            quitarMoneda(cod);
                          }}
                          className="text-gray-400 hover:text-white cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* 3. APARIENCIA Y LECTURA */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-white pb-2 border-b border-gray-800/80">
              {t.s3}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  {t.modoPantalla}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setModoPantalla('claro')}
                    className={`py-2.5 rounded-xl border text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      modoPantalla === 'claro'
                        ? 'bg-[#EAB308]/15 border-[#EAB308] text-white'
                        : 'bg-[#1A1A1A] border-gray-800 text-gray-400'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" /> {t.claro}
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoPantalla('oscuro')}
                    className={`py-2.5 rounded-xl border text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      modoPantalla === 'oscuro'
                        ? 'bg-[#EAB308]/15 border-[#EAB308] text-white'
                        : 'bg-[#1A1A1A] border-gray-800 text-gray-400'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" /> {t.oscuro}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  {t.tamanoLetra}
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setTamanoLetra(tamanoLetra === 'estandar' ? 'grande' : 'estandar')
                  }
                  className={`w-full py-2.5 rounded-xl border text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    tamanoLetra === 'grande'
                      ? 'bg-[#EAB308]/15 border-[#EAB308] text-white'
                      : 'bg-[#1A1A1A] border-gray-800 text-white hover:border-gray-700'
                  }`}
                >
                  <Type className="w-3.5 h-3.5 text-[#EAB308]" />
                  {tamanoLetra === 'estandar' ? t.letraStd : t.letraGrande}
                </button>
              </div>
            </div>

            <div className="bg-[#1A1A1A] border border-gray-800 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <Palette className="w-4 h-4 text-[#EAB308]" /> {t.paleta}
                </span>
                <span className="text-[11px] font-semibold text-gray-400">{t.enVivo}</span>
              </div>

              <div className="space-y-2.5">
                {PALETAS_SISTEMA.map((p) => {
                  const activa = paleta === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPaleta(p.id)}
                      className={`w-full p-4 rounded-2xl border text-left cursor-pointer transition-all flex items-center justify-between gap-4 ${
                        activa
                          ? 'bg-[#EAB308]/15 border-[#EAB308] shadow-md'
                          : 'bg-[#141414] border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span
                            className={`text-sm font-extrabold ${
                              activa ? 'text-[#EAB308]' : 'text-white'
                            }`}
                          >
                            {p.nombre}
                          </span>
                          {activa && (
                            <span className="bg-[#EAB308] text-black px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold">
                              {t.activa}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">{p.desc}</div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {p.circulos.map((hex, idx) => (
                          <span
                            key={idx}
                            style={{ backgroundColor: hex }}
                            className="w-6 h-6 rounded-full border border-white/25 shadow-sm"
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* 4. ETAPAS Y TIPOLOGÍAS DE OBRA */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-gray-800/80">
              <Layers className="w-4 h-4 text-[#EAB308]" /> {t.s4}
            </h3>

            <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-4 space-y-3">
              <div className="text-xs font-bold text-white">{t.etapasTitulo}</div>
              <div className="flex flex-wrap gap-2">
                {etapas.map((et, idx) => (
                  <div
                    key={et}
                    className="bg-[#141414] border border-gray-800 rounded-xl px-3 py-2 text-xs inline-flex items-center gap-2"
                  >
                    <span className="text-[#EAB308] font-bold">
                      {String(idx + 1).padStart(2, '0')}.
                    </span>
                    <span className="text-white font-semibold">{et}</span>
                    <button
                      type="button"
                      onClick={() => setEtapas(etapas.filter((item) => item !== et))}
                      className="text-gray-500 hover:text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={nuevaEtapa}
                  onChange={(e) => setNuevaEtapa(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      agregarEtapa();
                    }
                  }}
                  placeholder="Nueva etapa (ej. Interiorismo y Mobiliario)"
                  className="flex-1 bg-[#141414] border border-gray-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500"
                />
                <button
                  type="button"
                  onClick={agregarEtapa}
                  className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                >
                  {t.anadir}
                </button>
              </div>
            </div>

            <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-4 space-y-3">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#EAB308]" /> {t.tipologiasTitulo}
              </div>

              <div className="flex flex-wrap gap-2">
                {tipologias.map((tip) => (
                  <span
                    key={tip}
                    className="bg-[#141414] border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-gray-200 inline-flex items-center gap-2"
                  >
                    {tip}
                    <button
                      type="button"
                      onClick={() => setTipologias(tipologias.filter((x) => x !== tip))}
                      className="text-gray-500 hover:text-rose-400 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={nuevaTipologia}
                  onChange={(e) => setNuevaTipologia(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      agregarTipologia();
                    }
                  }}
                  placeholder="Nueva tipología (ej. Diseño de Exteriores)"
                  className="flex-1 bg-[#141414] border border-gray-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500"
                />
                <button
                  type="button"
                  onClick={agregarTipologia}
                  className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                >
                  {t.anadir}
                </button>
              </div>
            </div>
          </section>

          {/* 5. RESPALDO */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-gray-800/80">
              <Shield className="w-4 h-4 text-[#EAB308]" /> {t.s5}
            </h3>

            <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-4 flex flex-wrap justify-between items-center gap-4">
              <div className="max-w-md text-xs text-gray-400">
                Descargá una copia completa en formato .JSON con todos los datos de tu estudio.
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={descargando}
                  onClick={descargarRespaldo}
                  className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-4 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  {descargando ? 'Generando...' : 'Descargar respaldo (.JSON)'}
                </button>
                <label className="border border-[#EAB308]/50 hover:bg-[#EAB308]/10 text-[#EAB308] px-4 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" /> Restaurar respaldo
                  <input type="file" accept=".json" onChange={restaurarRespaldo} className="hidden" />
                </label>
              </div>
            </div>
          </section>
        </div>

        {/* PIE FIJO */}
        <div className="px-6 py-4 bg-[#101010] border-t border-gray-800 flex justify-between items-center">
          <div>
            {toast && (
              <span className="text-xs font-semibold text-emerald-400 inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> {toast}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-700 hover:bg-gray-800 text-xs font-semibold text-gray-200 cursor-pointer"
            >
              {t.cerrar}
            </button>
            <button
              type="button"
              onClick={guardarAjustes}
              className="bg-[#EAB308] hover:bg-[#CA9A04] text-black px-5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" /> {t.guardar}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}