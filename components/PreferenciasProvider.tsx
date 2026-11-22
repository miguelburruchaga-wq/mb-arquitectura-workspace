"use client";

import { createContext, useContext, useEffect, useState } from 'react';

export type Idioma = 'ES' | 'EN' | 'PT';
export type ModoPantalla = 'claro' | 'oscuro';
export type TamanoLetra = 'estandar' | 'grande';
export type Paleta = 'clasica' | 'pastel' | 'madera';

const DICCIONARIO: Record<Idioma, Record<string, string>> = {
  ES: {
    // Sidebar y Topbar
    dashboard: 'Dashboard',
    clientes: 'Clientes',
    proyectos: 'Proyectos',
    tareas: 'Tareas',
    visitas: 'Visitas y Agenda',
    proveedores: 'Proveedores',
    compras: 'Compras y Pedidos',
    documentos: 'Documentos',
    finanzas: 'Finanzas',
    equipo: 'Equipo',
    papelera: 'Papelera',
    configuracion: 'Configuración',
    salir: 'Salir',
    buscarPlaceholder: 'Buscar clientes, proyectos, tareas...',
    claro: 'Claro',
    oscuro: 'Oscuro',
    recordatoriosSi: 'Recordatorios: Sí',
    recordatoriosNo: 'Recordatorios: No',
    titular: 'Titular',
    notificaciones: 'Notificaciones',
    instructivo: 'Instructivo',

    // Dashboard
    panelControl: 'Panel de Control',
    personalizar: 'Personalizar',
    ocultar: 'Ocultar',
    mostrarPortada: 'Mostrar portada del estudio',
    nuevoProyecto: 'Nuevo proyecto',
    nuevaTarea: 'Nueva tarea',
    proyectosActivos: 'Proyectos activos',
    tareasPendientes: 'Tareas pendientes',
    atrasadas: 'atrasadas',
    atrasada: 'Atrasada',
    cobrado: 'Cobrado',
    honorarios: 'Honorarios',
    porCobrar: 'Por cobrar',
    pendiente: 'Pendiente',
    ingresos: 'Ingresos',
    pendientes: 'Pendientes',
    gastos: 'Gastos',
    ingresosCobrados: 'Ingresos cobrados',
    pendientesCobro: 'Pendientes de cobro',
    gastosPeriodo: 'Gastos del período',
    abrirFinanzas: 'Abrir Finanzas',
    estadoProyectos: 'Estado de Proyectos y Entregas',
    activos: 'Activos',
    ejecucionObra: 'Ejecución / Obra',
    enDiseno: 'En Diseño',
    presupuesto: 'Presupuesto',
    seguimientoTareas: 'SEGUIMIENTO DE TAREAS',
    totales: 'TOTALES',
    enCurso: 'En curso',
    porRealizar: 'Por realizar',
    completadas: 'Completadas',
    abrirProyectos: 'Abrir Proyectos →',
    abrirTareas: 'Abrir Tareas →',
    sinTareasPendientes: 'No tenés tareas pendientes.',
    notasRapidas: 'Notas rápidas y recordatorios',
    notasPlaceholder: '· Anotá acá tus recordatorios rápidos del día, presupuestos a enviar, muestras de materiales o llamadas pendientes...',
    convertirTarea: '+ Convertir en tarea',
    agendaSemana: 'Agenda de la semana',
    hoy: 'Hoy',
    sinVisitasDia: 'Sin visitas agendadas el',
    abrirVisitas: 'Abrir Visitas y Calendario →',
    proyectosEnCurso: 'Proyectos en Curso',
    verTodosProyectos: 'Ver todos los proyectos',
    portada: 'Portada',
    etapa: 'Etapa:',
    bovedaPrivada: 'Bóveda privada del estudio',
    appCreadaPor: 'App creada por',
  },
  EN: {
    // Sidebar y Topbar
    dashboard: 'Dashboard',
    clientes: 'Clients',
    proyectos: 'Projects',
    tareas: 'Tasks',
    visitas: 'Visits & Schedule',
    proveedores: 'Suppliers',
    compras: 'Purchases & Orders',
    documentos: 'Documents',
    finanzas: 'Finances',
    equipo: 'Team',
    papelera: 'Trash',
    configuracion: 'Settings',
    salir: 'Exit',
    buscarPlaceholder: 'Search clients, projects, tasks...',
    claro: 'Light',
    oscuro: 'Dark',
    recordatoriosSi: 'Reminders: On',
    recordatoriosNo: 'Reminders: Off',
    titular: 'Owner',
    notificaciones: 'Notifications',
    instructivo: 'Guide',

    // Dashboard
    panelControl: 'Dashboard',
    personalizar: 'Customize',
    ocultar: 'Hide',
    mostrarPortada: 'Show studio cover',
    nuevoProyecto: 'New project',
    nuevaTarea: 'New task',
    proyectosActivos: 'Active projects',
    tareasPendientes: 'Pending tasks',
    atrasadas: 'overdue',
    atrasada: 'Overdue',
    cobrado: 'Collected',
    honorarios: 'Fees',
    porCobrar: 'Receivable',
    pendiente: 'Pending',
    ingresos: 'Income',
    pendientes: 'Pending',
    gastos: 'Expenses',
    ingresosCobrados: 'Collected income',
    pendientesCobro: 'Pending collection',
    gastosPeriodo: 'Period expenses',
    abrirFinanzas: 'Open Finances',
    estadoProyectos: 'Project Status & Deliveries',
    activos: 'Active',
    ejecucionObra: 'In Construction',
    enDiseno: 'In Design',
    presupuesto: 'Bidding / Other',
    seguimientoTareas: 'TASK TRACKING',
    totales: 'TOTAL',
    enCurso: 'In progress',
    porRealizar: 'To do',
    completadas: 'Completed',
    abrirProyectos: 'Open Projects →',
    abrirTareas: 'Open Tasks →',
    sinTareasPendientes: 'You have no pending tasks.',
    notasRapidas: 'Quick notes & reminders',
    notasPlaceholder: '· Write down your daily reminders, quotes to send, material samples, or pending calls...',
    convertirTarea: '+ Convert to task',
    agendaSemana: 'Weekly schedule',
    hoy: 'Today',
    sinVisitasDia: 'No visits scheduled on',
    abrirVisitas: 'Open Visits & Calendar →',
    proyectosEnCurso: 'Active Projects',
    verTodosProyectos: 'View all projects',
    portada: 'Cover',
    etapa: 'Stage:',
    bovedaPrivada: 'Private studio vault',
    appCreadaPor: 'App created by',
  },
  PT: {
    // Sidebar y Topbar
    dashboard: 'Painel',
    clientes: 'Clientes',
    proyectos: 'Projetos',
    tareas: 'Tarefas',
    visitas: 'Visitas e Agenda',
    proveedores: 'Fornecedores',
    compras: 'Compras e Pedidos',
    documentos: 'Documentos',
    finanzas: 'Finanças',
    equipo: 'Equipe',
    papelera: 'Lixeira',
    configuracion: 'Configurações',
    salir: 'Sair',
    buscarPlaceholder: 'Buscar clientes, projetos, tarefas...',
    claro: 'Claro',
    oscuro: 'Escuro',
    recordatoriosSi: 'Lembretes: Sim',
    recordatoriosNo: 'Lembretes: Não',
    titular: 'Titular',
    notificaciones: 'Notificações',
    instructivo: 'Guia',

    // Dashboard
    panelControl: 'Painel de Controle',
    personalizar: 'Personalizar',
    ocultar: 'Ocultar',
    mostrarPortada: 'Mostrar capa do escritório',
    nuevoProyecto: 'Novo projeto',
    nuevaTarea: 'Nova tarefa',
    proyectosActivos: 'Projetos ativos',
    tareasPendientes: 'Tarefas pendentes',
    atrasadas: 'atrasadas',
    atrasada: 'Atrasada',
    cobrado: 'Recebido',
    honorarios: 'Honorários',
    porCobrar: 'A receber',
    pendiente: 'Pendente',
    ingresos: 'Receitas',
    pendientes: 'Pendentes',
    gastos: 'Despesas',
    ingresosCobrados: 'Receitas recebidas',
    pendientesCobro: 'Pendentes de recebimento',
    gastosPeriodo: 'Despesas do período',
    abrirFinanzas: 'Abrir Finanças',
    estadoProyectos: 'Status de Projetos e Entregas',
    activos: 'Ativos',
    ejecucionObra: 'Em Obra',
    enDiseno: 'Em Projeto',
    presupuesto: 'Orçamento',
    seguimientoTareas: 'ACOMPANHAMENTO DE TAREFAS',
    totales: 'TOTAIS',
    enCurso: 'Em andamento',
    porRealizar: 'A fazer',
    completadas: 'Concluídas',
    abrirProyectos: 'Abrir Projetos →',
    abrirTareas: 'Abrir Tarefas →',
    sinTareasPendientes: 'Você não tem tarefas pendentes.',
    notasRapidas: 'Notas rápidas e lembretes',
    notasPlaceholder: '· Anote aqui seus lembretes rápidos do dia, orçamentos, amostras ou ligações pendentes...',
    convertirTarea: '+ Converter em tarefa',
    agendaSemana: 'Agenda da semana',
    hoy: 'Hoje',
    sinVisitasDia: 'Sem visitas agendadas em',
    abrirVisitas: 'Abrir Visitas e Calendário →',
    proyectosEnCurso: 'Projetos em Andamento',
    verTodosProyectos: 'Ver todos os projetos',
    portada: 'Capa',
    etapa: 'Etapa:',
    bovedaPrivada: 'Cofre privado do escritório',
    appCreadaPor: 'App criado por',
  },
};

interface PreferenciasContextType {
  idioma: Idioma;
  modoPantalla: ModoPantalla;
  tamanoLetra: TamanoLetra;
  paleta: Paleta;
  tr: (clave: string) => string;
  setIdioma: (v: Idioma) => void;
  setModoPantalla: (v: ModoPantalla) => void;
  setTamanoLetra: (v: TamanoLetra) => void;
  setPaleta: (v: Paleta) => void;
}

const PreferenciasContext = createContext<PreferenciasContextType | null>(null);

export function PreferenciasProvider({ children }: { children: React.ReactNode }) {
  const [idioma, setIdiomaState] = useState<Idioma>('ES');
  const [modoPantalla, setModoPantallaState] = useState<ModoPantalla>('oscuro');
  const [tamanoLetra, setTamanoLetraState] = useState<TamanoLetra>('estandar');
  const [paleta, setPaletaState] = useState<Paleta>('clasica');

  const aplicarAlDom = (m: ModoPantalla, f: TamanoLetra, p: Paleta) => {
    const html = document.documentElement;
    html.setAttribute('data-theme', m);
    html.setAttribute('data-font', f);
    html.setAttribute('data-paleta', p);
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem('mb_ajustes_estudio');
      if (raw) {
        const parsed = JSON.parse(raw);
        const m: ModoPantalla = parsed.modoPantalla === 'claro' ? 'claro' : 'oscuro';
        const f: TamanoLetra = parsed.tamanoLetra === 'grande' ? 'grande' : 'estandar';
        const p: Paleta =
          parsed.paleta === 'pastel' || parsed.paleta === 'madera' ? parsed.paleta : 'clasica';
        const l: Idioma = parsed.idioma === 'EN' || parsed.idioma === 'PT' ? parsed.idioma : 'ES';

        setModoPantallaState(m);
        setTamanoLetraState(f);
        setPaletaState(p);
        setIdiomaState(l);
        aplicarAlDom(m, f, p);
      } else {
        aplicarAlDom('oscuro', 'estandar', 'clasica');
      }
    } catch {
      aplicarAlDom('oscuro', 'estandar', 'clasica');
    }
  }, []);

  const guardarParcial = (cambios: Record<string, any>) => {
    try {
      const actual = JSON.parse(localStorage.getItem('mb_ajustes_estudio') || '{}');
      localStorage.setItem('mb_ajustes_estudio', JSON.stringify({ ...actual, ...cambios }));
    } catch {
      // Silencioso
    }
  };

  const setIdioma = (v: Idioma) => {
    setIdiomaState(v);
    guardarParcial({ idioma: v });
  };

  const setModoPantalla = (v: ModoPantalla) => {
    setModoPantallaState(v);
    aplicarAlDom(v, tamanoLetra, paleta);
    guardarParcial({ modoPantalla: v });
  };

  const setTamanoLetra = (v: TamanoLetra) => {
    setTamanoLetraState(v);
    aplicarAlDom(modoPantalla, v, paleta);
    guardarParcial({ tamanoLetra: v });
  };

  const setPaleta = (v: Paleta) => {
    setPaletaState(v);
    aplicarAlDom(modoPantalla, tamanoLetra, v);
    guardarParcial({ paleta: v });
  };

  const tr = (clave: string) => DICCIONARIO[idioma]?.[clave] || DICCIONARIO.ES[clave] || clave;

  return (
    <PreferenciasContext.Provider
      value={{
        idioma,
        modoPantalla,
        tamanoLetra,
        paleta,
        tr,
        setIdioma,
        setModoPantalla,
        setTamanoLetra,
        setPaleta,
      }}
    >
      {children}
    </PreferenciasContext.Provider>
  );
}

export function usePreferencias() {
  const ctx = useContext(PreferenciasContext);
  if (!ctx) {
    return {
      idioma: 'ES' as Idioma,
      modoPantalla: 'oscuro' as ModoPantalla,
      tamanoLetra: 'estandar' as TamanoLetra,
      paleta: 'clasica' as Paleta,
      tr: (k: string) => DICCIONARIO.ES[k] || k,
      setIdioma: () => {},
      setModoPantalla: () => {},
      setTamanoLetra: () => {},
      setPaleta: () => {},
    };
  }
  return ctx;
}