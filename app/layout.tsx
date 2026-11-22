import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import FondoGlobalApp from '@/components/FondoGlobalApp';
import AuthGate from '@/components/AuthGate';
import { PreferenciasProvider } from '@/components/PreferenciasProvider';

export const dynamic = 'force-dynamic';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ARQUITECTOS | WORKSPACE — Gestión Integral para Estudios de Arquitectura',
  description:
    'Plataforma de gestión de proyectos, obras, clientes, tareas y finanzas para estudios de arquitectura.',
  other: {
    google: 'notranslate',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      translate="no"
      className="notranslate"
      data-theme="oscuro"
      data-font="estandar"
      data-paleta="clasica"
    >
      <body className={`${inter.className} bg-[#121212] text-white antialiased`}>
        <PreferenciasProvider>
          <AuthGate>
            <FondoGlobalApp />
            <div className="relative z-10 flex min-h-screen text-white">
              <Sidebar />
              <div className="flex-1 flex flex-col min-w-0">
                <Topbar />
                <main className="flex-1">{children}</main>
              </div>
            </div>
          </AuthGate>
        </PreferenciasProvider>
      </body>
    </html>
  );
}