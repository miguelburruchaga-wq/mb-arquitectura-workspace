"use client";

import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/lib/supabase';
import { usePreferencias, Idioma } from '@/components/PreferenciasProvider';
import {
  Compass,
  Eye,
  EyeOff,
  LogIn,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

export interface UsuarioSesion {
  id?: number;
  nombre: string;
  email: string;
  rol: string;
  tipo_acceso: string;
  foto_url?: string;
}

interface RegistroEquipoAuth extends UsuarioSesion {
  estado?: string;
  password?: string;
}

interface AuthContextType {
  usuario: UsuarioSesion | null;
  cerrarSesion: () => void;
}

const AuthContext = createContext<AuthContextType>({
  usuario: null,
  cerrarSesion: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

const EMAIL_PROPIETARIO = 'alejandrofego1986@gmail.com';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { idioma, setIdioma } = usePreferencias();

  const [verificando, setVerificando] = useState(true);
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);

  const [modo, setModo] = useState<'login' | 'registro'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verPass, setVerPass] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const verificarCorreoAutorizado = async (
    correoIngresado: string,
    fotoGoogle?: string
  ): Promise<{ autorizado: boolean; motivo?: string; registro?: RegistroEquipoAuth }> => {
    const limpio = correoIngresado.trim().toLowerCase();

    const { data: listaEquipo } = await supabase
      .from('equipo')
      .select('id, nombre, email, rol, tipo_acceso, estado, foto_url, password')
      .ilike('email', limpio)
      .limit(1);

    const encontrado = listaEquipo?.[0];

    if (encontrado) {
      if (String(encontrado.estado || '').toLowerCase() === 'suspendido') {
        return { autorizado: false, motivo: 'Tu usuario se encuentra suspendido por el titular.' };
      }
      if (fotoGoogle && !encontrado.foto_url && encontrado.id) {
        supabase.from('equipo').update({ foto_url: fotoGoogle }).eq('id', encontrado.id).then(() => {});
      }
      return {
        autorizado: true,
        registro: { ...encontrado, foto_url: encontrado.foto_url || fotoGoogle },
      };
    }

    if (limpio === EMAIL_PROPIETARIO) {
      return {
        autorizado: true,
        registro: {
          nombre: 'Alejandro Fego',
          email: EMAIL_PROPIETARIO,
          rol: 'Dirección de Proyecto y Diseño',
          tipo_acceso: 'Titular del Estudio',
          foto_url: fotoGoogle,
        },
      };
    }

    return {
      autorizado: false,
      motivo:
        'Acceso privado: este correo no está habilitado. Pedile al titular del estudio que te sume desde la sección Equipo.',
    };
  };

  const iniciarSesionEnApp = (u: UsuarioSesion) => {
    setUsuario(u);
    try {
      localStorage.setItem('mb_sesion_usuario', JSON.stringify(u));
    } catch {
      // Silencioso
    }
  };

  const cerrarSesion = async () => {
    setUsuario(null);
    setPassword('');
    setErrorMsg(null);
    setOkMsg(null);
    try {
      localStorage.removeItem('mb_sesion_usuario');
      await supabase.auth.signOut();
    } catch {
      // Silencioso
    }
  };

  useEffect(() => {
    let activo = true;

    const inicializar = async () => {
      try {
        const saved = localStorage.getItem('mb_sesion_usuario');
        if (saved && activo) {
          setUsuario(JSON.parse(saved));
          setVerificando(false);
        }

        const params = new URLSearchParams(window.location.search);
        const inv = params.get('invitado');
        if (inv && activo) setEmail(inv);

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user?.email && activo) {
          const googleEmail = session.user.email;
          const googleAvatar = session.user.user_metadata?.avatar_url || '';
          const check = await verificarCorreoAutorizado(googleEmail, googleAvatar);

          if (check.autorizado && check.registro) {
            const reg = check.registro;
            if (reg.id && reg.estado === 'Invitado') {
              supabase.from('equipo').update({ estado: 'Activo' }).eq('id', reg.id).then(() => {});
            }
            iniciarSesionEnApp({
              id: reg.id,
              nombre: reg.nombre || session.user.user_metadata?.full_name || googleEmail,
              email: googleEmail,
              rol: reg.rol || 'Arquitecto Proyectista',
              tipo_acceso: reg.tipo_acceso || 'Invitado',
              foto_url: reg.foto_url || googleAvatar,
            });
          } else {
            await supabase.auth.signOut();
            localStorage.removeItem('mb_sesion_usuario');
            setUsuario(null);
            setErrorMsg(check.motivo || 'Cuenta de Google no autorizada.');
          }
        }
      } catch {
        // Silencioso
      } finally {
        if (activo) setVerificando(false);
      }
    };

    inicializar();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.email && activo) {
        const googleEmail = session.user.email;
        const googleAvatar = session.user.user_metadata?.avatar_url || '';
        const check = await verificarCorreoAutorizado(googleEmail, googleAvatar);

        if (check.autorizado && check.registro) {
          const reg = check.registro;
          iniciarSesionEnApp({
            id: reg.id,
            nombre: reg.nombre || session.user.user_metadata?.full_name || googleEmail,
            email: googleEmail,
            rol: reg.rol || 'Arquitecto Proyectista',
            tipo_acceso: reg.tipo_acceso || 'Invitado',
            foto_url: reg.foto_url || googleAvatar,
          });
        } else {
          await supabase.auth.signOut();
          setErrorMsg(check.motivo || 'Cuenta de Google no autorizada.');
        }
      }
    });

    return () => {
      activo = false;
      subscription.unsubscribe();
    };
  }, []);

  const manejarLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setOkMsg(null);
    setCargando(true);

    const check = await verificarCorreoAutorizado(email);

    if (!check.autorizado || !check.registro) {
      setCargando(false);
      setErrorMsg(check.motivo || 'Correo no autorizado.');
      return;
    }

    const reg = check.registro;

    if (modo === 'registro') {
      if (password.trim().length < 4) {
        setCargando(false);
        setErrorMsg('Elegí una contraseña de al menos 4 caracteres.');
        return;
      }
      if (reg.id) {
        await supabase
          .from('equipo')
          .update({ password: password.trim(), estado: 'Activo' })
          .eq('id', reg.id);
      }
      setCargando(false);
      iniciarSesionEnApp({
        id: reg.id,
        nombre: reg.nombre,
        email: reg.email || email.trim(),
        rol: reg.rol || 'Arquitecto Proyectista',
        tipo_acceso: reg.tipo_acceso || 'Invitado',
        foto_url: reg.foto_url,
      });
      return;
    }

    if (reg.password && reg.password !== password.trim()) {
      setCargando(false);
      setErrorMsg('Contraseña incorrecta. Verificá tus datos o tocá "¿Olvidaste tu contraseña?".');
      return;
    }

    if (reg.id && reg.estado === 'Invitado') {
      await supabase.from('equipo').update({ estado: 'Activo' }).eq('id', reg.id);
    }

    setCargando(false);
    iniciarSesionEnApp({
      id: reg.id,
      nombre: reg.nombre,
      email: reg.email || email.trim(),
      rol: reg.rol || 'Arquitecto Proyectista',
      tipo_acceso: reg.tipo_acceso || 'Invitado',
      foto_url: reg.foto_url,
    });
  };

  const manejarContinuarGoogle = async () => {
    setErrorMsg(null);
    setOkMsg(null);
    setCargando(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
        queryParams: {
          prompt: 'select_account',
        },
      },
    });

    if (error) {
      setCargando(false);
      setErrorMsg('No se pudo conectar con Google: ' + error.message);
    }
  };

  const entrarDemo = () => {
    iniciarSesionEnApp({
      nombre: 'Invitado Demo',
      email: 'demo@mbarquitectura.com',
      rol: 'Vista Previa',
      tipo_acceso: 'Demo',
    });
  };

  if (verificando) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin text-[#EAB308]" />
      </div>
    );
  }

  if (usuario) {
    return (
      <AuthContext.Provider value={{ usuario, cerrarSesion }}>
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 25% 45%, rgba(234, 179, 8, 0.14) 0%, transparent 45%), radial-gradient(circle at 75% 75%, rgba(120, 113, 108, 0.12) 0%, transparent 45%)',
        }}
      />

      <div className="fixed top-5 right-6 z-20 bg-[#18181B] border border-white/10 rounded-full p-1 flex items-center gap-1 shadow-xl">
        {(['ES', 'EN', 'PT'] as Idioma[]).map((lang) => (
          <button
            key={lang}
            type="button"
            onClick={() => setIdioma(lang)}
            className={`px-3 py-1 rounded-full text-[11px] font-extrabold transition-colors cursor-pointer ${
              idioma === lang ? 'bg-[#EAB308] text-black' : 'text-gray-300 hover:text-white'
            }`}
          >
            {lang}
          </button>
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center text-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-[#EAB308] text-black flex items-center justify-center shadow-[0_0_30px_rgba(234,179,8,0.35)] mb-4">
          <Compass className="w-6 h-6 stroke-[2.2]" />
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">
          Arquitectos Workspace
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Sistema de Gestión de Arquitectura · Claridad y Acción
        </p>
      </div>

      <div className="relative z-10 w-full max-w-md bg-[#141416]/95 border border-white/10 rounded-3xl p-7 shadow-2xl space-y-5">
        <div>
          <h2 className="text-lg font-extrabold text-white">
            {modo === 'registro' ? 'Activar cuenta habilitada' : 'Iniciar sesión'}
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            {modo === 'registro'
              ? 'Ingresá el correo que habilitó el titular y creá tu contraseña.'
              : 'Ingresá con Google o con tu correo y contraseña.'}
          </p>
        </div>

        <button
          type="button"
          disabled={cargando}
          onClick={manejarContinuarGoogle}
          className="w-full bg-[#1C1D22] hover:bg-[#24262D] border border-white/10 text-white py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"
            />
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.8-.1-1.7-.2-2.5H12v4.8h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
            />
            <path
              fill="#FBBC05"
              d="M5.3 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.6 7.4C.6 9.4 0 11.6 0 14s.6 4.6 1.6 6.6l3.7-2.8z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.8C3.5 21.4 7.4 24 12 24z"
            />
          </svg>
          <span>{cargando ? 'Conectando con Google...' : 'Continuar con Google'}</span>
        </button>

        <div className="flex items-center gap-3 text-[11px] text-gray-500">
          <div className="flex-1 h-px bg-white/10" />
          <span>o con tu correo</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {errorMsg && (
          <div className="bg-rose-950/70 border border-rose-800/70 text-rose-300 rounded-xl p-3 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {okMsg && (
          <div className="bg-emerald-950/70 border border-emerald-800/70 text-emerald-300 rounded-xl p-3 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
            <span>{okMsg}</span>
          </div>
        )}

        <form onSubmit={manejarLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-200 mb-1.5">
              Correo electrónico
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@estudio.com"
              className="w-full bg-[#1C1D22] border border-white/10 focus:border-[#EAB308] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-gray-200">Contraseña</label>
              {modo === 'login' && (
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setOkMsg(
                      'Si sos el titular o un invitado habilitado, podés restablecer tu clave desde "¿Es tu primer ingreso? Registrarme".'
                    );
                  }}
                  className="text-[11px] font-semibold text-[#EAB308] hover:underline cursor-pointer"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              )}
            </div>

            <div className="relative">
              <input
                type={verPass ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#1C1D22] border border-white/10 focus:border-[#EAB308] rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setVerPass(!verPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
              >
                {verPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-[#EAB308] hover:bg-[#CA9A04] text-black py-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-colors shadow-[0_0_25px_rgba(234,179,8,0.25)] cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>
              {cargando
                ? 'Verificando acceso...'
                : modo === 'registro'
                ? 'Activar cuenta e ingresar'
                : 'Iniciar Sesión'}
            </span>
          </button>
        </form>

        <div className="space-y-2.5 pt-1">
          {modo === 'login' ? (
            <div className="w-full bg-[#1A1B20] border border-white/10 rounded-xl py-2.5 px-4 text-center text-xs text-gray-300">
              ¿Es tu primer ingreso?{' '}
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setOkMsg(null);
                  setModo('registro');
                }}
                className="font-bold text-[#EAB308] underline cursor-pointer"
              >
                Registrarme
              </button>
            </div>
          ) : (
            <div className="w-full bg-[#1A1B20] border border-white/10 rounded-xl py-2.5 px-4 text-center text-xs text-gray-300">
              ¿Ya tenés cuenta activa?{' '}
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setOkMsg(null);
                  setModo('login');
                }}
                className="font-bold text-[#EAB308] underline cursor-pointer"
              >
                Volver a Iniciar Sesión
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={entrarDemo}
            className="w-full bg-[#241E11]/70 hover:bg-[#2E2615] border border-[#EAB308]/40 text-[#EAB308] py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Ver Demo interactiva</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="text-center pt-1">
          <span className="text-[11px] text-gray-500 underline cursor-pointer hover:text-gray-300">
            Condiciones de Uso y Política de Privacidad
          </span>
        </div>
      </div>
    </div>
  );
}