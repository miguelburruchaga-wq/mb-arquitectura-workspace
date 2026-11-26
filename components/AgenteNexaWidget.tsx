"use client";

import { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Sparkles,
  X,
  Send,
  Loader2,
  CheckCircle2,
  Trash2,
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface MensajeChat {
  id: string;
  rol: 'user' | 'assistant';
  texto: string;
  accionEjecutada?: boolean;
}

const SUGERENCIAS_RAPIDAS = [
  '¿Qué tareas tenemos atrasadas hoy?',
  '¿Cómo viene el balance de Finanzas?',
  '¿Cuánto llevamos comprado por obra?',
  'Creá una tarea para mañana revisar planos',
  'Agendá una visita de obra para el viernes a las 10:00',
];

export default function AgenteNexaWidget() {
  const pathname = usePathname();
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [ampliado, setAmpliado] = useState(false);
  const [input, setInput] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [usuarioNombre, setUsuarioNombre] = useState('Equipo MB');
  const [mensajes, setMensajes] = useState<MensajeChat[]>([
    {
      id: 'bienvenida',
      rol: 'assistant',
      texto:
        'Hola, soy **Nexa**, la agente IA de **MB Arquitectura SA**. Consulto en vivo Proyectos, Tareas, Agenda, Finanzas, Compras, Proveedores y Clientes. También puedo crear tareas o agendar visitas por vos. ¿En qué te ayudo?',
    },
  ]);

  const refFinChat = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('mb_sesion_usuario');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.nombre) setUsuarioNombre(parsed.nombre);
      }
    } catch {
      // Silencioso
    }
  }, [pathname]);

  useEffect(() => {
    refFinChat.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, abierto, ampliado]);

  if (pathname === '/login') return null;

  const enviarMensaje = async (textoDirecto?: string) => {
    const contenido = (textoDirecto ?? input).trim();
    if (!contenido || enviando) return;

    const nuevoUser: MensajeChat = {
      id: String(Date.now()),
      rol: 'user',
      texto: contenido,
    };

    setMensajes((prev) => [...prev, nuevoUser]);
    if (!textoDirecto) setInput('');
    setEnviando(true);

    try {
      const res = await fetch('/api/nexa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensaje: contenido,
          usuario: usuarioNombre,
          historial: mensajes.filter((m) => m.id !== 'bienvenida'),
        }),
      });

      const data = await res.json();
      const respuestaBot: MensajeChat = {
        id: String(Date.now() + 1),
        rol: 'assistant',
        texto: data?.respuesta || 'No obtuve respuesta.',
        accionEjecutada: Boolean(data?.accionEjecutada),
      };

      setMensajes((prev) => [...prev, respuestaBot]);

      if (data?.accionEjecutada) {
        router.refresh();
      }
    } catch {
      setMensajes((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          rol: 'assistant',
          texto: 'Error de conexión al consultar con Nexa. Intentá de nuevo.',
        },
      ]);
    } finally {
      setEnviando(false);
    }
  };

  const limpiarChat = () => {
    setMensajes([
      {
        id: 'bienvenida',
        rol: 'assistant',
        texto: 'Conversación reiniciada. ¿Qué querés consultar o agendar en el estudio?',
      },
    ]);
  };

  return (
    <>
      {!abierto && (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="fixed bottom-6 right-6 z-[9990] bg-[#161616] hover:bg-[#202020] border-2 border-[#D4EE36] text-white px-4 py-3 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.65)] flex items-center gap-2.5 cursor-pointer transition-transform hover:scale-105 group"
        >
          <span className="w-8 h-8 rounded-full bg-[#D4EE36] text-black flex items-center justify-center font-black shadow">
            <Sparkles className="w-4 h-4" />
          </span>
          <div className="text-left pr-1">
            <div className="text-xs font-extrabold text-white leading-tight flex items-center gap-1.5">
              Nexa IA
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="text-[10px] text-gray-400">Copiloto del estudio</div>
          </div>
        </button>
      )}

      {abierto && (
        <div
          className={`fixed bottom-6 right-6 z-[9995] bg-[#141414] border border-[#D4EE36]/60 rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
            ampliado
              ? 'w-[720px] max-w-[calc(100vw-2rem)] h-[84vh] max-h-[calc(100vh-3rem)]'
              : 'w-[400px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-3rem)]'
          }`}
        >
          {/* CABECERA */}
          <div className="px-5 py-3.5 bg-[#1A1A1A] border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#D4EE36] text-black flex items-center justify-center font-black shadow">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-extrabold text-white leading-tight">Nexa</div>
                <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Conectada a todos los módulos
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setAmpliado((prev) => !prev)}
                title={ampliado ? 'Reducir ventana' : 'Ampliar ventana'}
                className="p-1.5 rounded-lg text-gray-400 hover:text-[#D4EE36] hover:bg-white/10 cursor-pointer"
              >
                {ampliado ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={limpiarChat}
                title="Nueva conversación"
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                title="Minimizar"
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* MENSAJES */}
          <div
            className={`flex-1 overflow-y-auto p-4 space-y-3 ${
              ampliado ? 'text-sm' : 'text-xs'
            }`}
          >
            {mensajes.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${
                  m.rol === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-4 py-3 leading-relaxed whitespace-pre-wrap ${
                    m.rol === 'user'
                      ? 'bg-[#D4EE36] text-black font-semibold rounded-br-sm'
                      : 'bg-[#1E1E1E] border border-white/10 text-gray-100 rounded-bl-sm'
                  }`}
                >
                  {m.texto.split('**').map((parte, i) =>
                    i % 2 === 1 ? (
                      <strong key={i} className={m.rol === 'user' ? 'font-black' : 'text-[#D4EE36]'}>
                        {parte}
                      </strong>
                    ) : (
                      <span key={i}>{parte}</span>
                    )
                  )}

                  {m.accionEjecutada && (
                    <div className="mt-2 pt-2 border-t border-white/10 text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Acción registrada en el sistema
                    </div>
                  )}
                </div>
              </div>
            ))}

            {enviando && (
              <div className="flex items-center gap-2 text-gray-400 bg-[#1E1E1E] border border-white/10 rounded-2xl px-3.5 py-2.5 w-fit">
                <Loader2 className="w-3.5 h-3.5 text-[#D4EE36] animate-spin" />
                <span>Nexa está analizando los datos del estudio...</span>
              </div>
            )}
            <div ref={refFinChat} />
          </div>

          {/* PÍLDORAS DE CONSULTA RÁPIDA */}
          <div className="px-3.5 py-2 border-t border-white/10 bg-[#181818] flex gap-1.5 overflow-x-auto no-scrollbar">
            {SUGERENCIAS_RAPIDAS.map((sug) => (
              <button
                key={sug}
                type="button"
                disabled={enviando}
                onClick={() => enviarMensaje(sug)}
                className="flex-shrink-0 bg-[#242424] hover:bg-[#D4EE36]/20 border border-white/10 hover:border-[#D4EE36]/50 text-gray-200 px-2.5 py-1 rounded-full text-[11px] transition-colors cursor-pointer"
              >
                {sug}
              </button>
            ))}
          </div>

          {/* CAMPO DE ENTRADA */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              enviarMensaje();
            }}
            className="p-3 bg-[#141414] border-t border-white/10 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribile a Nexa..."
              className={`flex-1 bg-[#1E1E1E] border border-white/10 focus:border-[#D4EE36] rounded-xl px-3.5 py-2.5 text-white placeholder-gray-400 outline-none ${
                ampliado ? 'text-sm' : 'text-xs'
              }`}
            />
            <button
              type="submit"
              disabled={enviando || !input.trim()}
              className="bg-[#D4EE36] hover:bg-[#c3de28] disabled:opacity-40 text-black px-3.5 py-2.5 rounded-xl font-extrabold text-xs inline-flex items-center gap-1 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}