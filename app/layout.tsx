import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar'; // Importamos la nueva barra

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MB Arquitectura Workspace',
  description: 'Gestión de proyectos y tareas',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <div className="flex min-h-screen bg-[#121212]">
          {/* El menú lateral izquierdo */}
          <Sidebar />
          
          {/* El contenedor principal */}
          <main className="flex-1 flex flex-col min-w-0">
            {/* La nueva barra superior que se verá en todas las páginas */}
            <TopBar />
            
            {/* El contenido de la página donde estés (Clientes, Tareas, etc.) */}
            <div className="flex-1">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}