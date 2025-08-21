'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Monitor,
  PlaySquare,
  FileVideo,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Folder
} from 'lucide-react';
import UCTLogo from './UCTLogo';
import { useSystemSettings } from '@/hooks/useSystemSettings';

const menuItems = [
  { icon: LayoutDashboard, label: 'Tablero', href: '/admin' },
  { icon: Monitor, label: 'Pantallas', href: '/admin/screens' },
  { icon: PlaySquare, label: 'Listas de reproducción', href: '/admin/playlists' },
  { icon: Folder, label: 'Archivos', href: '/admin/files' },
  { icon: Settings, label: 'Configuración', href: '/admin/settings' },
];

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (isCollapsed: boolean) => void;
}

export default function Sidebar({ isCollapsed, setIsCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { settings } = useSystemSettings();

  const handleLogout = async () => {
    try {
      console.log('🔓 [Logout] Iniciando cierre de sesión...');

      // Mostrar cookies antes del logout
      console.log('🍪 [Logout] Cookies antes:', document.cookie);

      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 [Logout] Respuesta del servidor:', response.status, response.statusText);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [Logout] Logout exitoso:', data);
      } else {
        console.warn('⚠️ [Logout] Respuesta no exitosa:', response.status);
      }

      // Mostrar cookies después del logout
      console.log('🍪 [Logout] Cookies después:', document.cookie);

      // Limpiar todas las cookies manualmente como respaldo
      document.cookie.split(";").forEach(function(c) {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });

      // Limpiar cualquier estado local
      localStorage.clear();
      sessionStorage.clear();

      console.log('🧹 [Logout] Estado local limpiado');

      // Forzar recarga completa para limpiar el estado
      console.log('🔄 [Logout] Redirigiendo a página principal...');
      window.location.href = '/';

    } catch (error) {
      console.error('❌ [Logout] Error al cerrar sesión:', error);

      // Limpiar todo manualmente como respaldo
      document.cookie.split(";").forEach(function(c) {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      localStorage.clear();
      sessionStorage.clear();

      // Aún así redirigir al login
      window.location.href = '/';
    }
  };

  return (
    <aside className={`fixed left-0 top-0 z-40 h-screen bg-uct-gradient text-white shadow-uct-lg transition-all duration-300 flex flex-col ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div className="flex h-32 items-center justify-center border-b border-white/10 relative px-4">
        <div className="flex items-center justify-center w-full">
          <div className="flex items-center justify-center">
            <UCTLogo size={45} variant="isotipo" />
          </div>
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-4 top-1/2 -translate-y-1/2 bg-uct-primary border-2 border-uct-secondary text-uct-secondary p-1 rounded-full hidden lg:block hover:bg-uct-secondary hover:text-uct-primary transition-colors"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
      
      <nav className="mt-6 px-2">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200
                    ${isActive
                      ? 'bg-uct-secondary text-uct-primary shadow-md'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }
                    ${isCollapsed ? 'justify-center' : ''}`}
                >
                  <Icon className="h-5 w-5" />
                  {!isCollapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Espaciador para empujar el contenido hacia abajo */}
        <div className="flex-1"></div>

        {/* Botón de Logout */}
        <div className="px-2 mb-4">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 text-red-300 hover:bg-red-500/20 hover:text-red-200 ${isCollapsed ? 'justify-center' : ''}`}
            title="Cerrar Sesión"
          >
            <LogOut className="h-5 w-5" />
            {!isCollapsed && <span>Cerrar Sesión</span>}
          </button>
        </div>

        {/* CODECRAFT debajo del botón de logout */}
        {!isCollapsed && (
          <div className="px-4 pb-4 text-center">
            <span className="text-sm font-bold text-white/90">
              {settings?.systemName || 'TV CODECRAFT'}
            </span>
          </div>
        )}
      </nav>
    </aside>
  );
}
