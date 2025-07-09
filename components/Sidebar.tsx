'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
import { StaggerContainer, StaggerItem } from '@/components/animations/PageTransition';

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
    <motion.aside 
      className={`fixed left-0 top-0 z-40 h-screen bg-uct-gradient text-white shadow-uct-lg transition-all duration-300 flex flex-col ${isCollapsed ? 'w-20' : 'w-64'}`}
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <motion.div 
        className="flex h-32 items-center justify-center border-b border-white/10 relative px-4 bg-gradient-to-r from-white/5 to-white/10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="flex items-center justify-center w-full">
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.div 
                className="flex items-center justify-center"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
              >
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ duration: 0.2 }}
                >
                  <UCTLogo size={45} variant="isotipo" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {isCollapsed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ duration: 0.2 }}
            >
              <UCTLogo size={35} variant="isotipo" />
            </motion.div>
          )}
        </div>
        <motion.button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-4 top-1/2 -translate-y-1/2 bg-uct-primary border-2 border-uct-secondary text-uct-secondary p-1 rounded-full hidden lg:block hover:bg-uct-secondary hover:text-uct-primary transition-all duration-200 relative overflow-hidden group"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-uct-secondary/20 to-uct-primary/20 opacity-0 group-hover:opacity-100"
            transition={{ duration: 0.2 }}
          />
          <AnimatePresence mode="wait">
            {isCollapsed ? (
              <motion.div
                key="expand"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronRight size={16} className="relative z-10" />
              </motion.div>
            ) : (
              <motion.div
                key="collapse"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronLeft size={16} className="relative z-10" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </motion.div>
      
      <nav className="mt-6 px-2">
        <StaggerContainer>
          <ul className="space-y-1">
            {menuItems.map((item, index) => {
              const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <StaggerItem key={item.href}>
                  <li>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 group relative overflow-hidden
                        ${isActive
                          ? 'bg-uct-secondary text-uct-primary shadow-md'
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                        }
                        ${isCollapsed ? 'justify-center' : ''}`}
                    >
                      {/* Efecto de brillo al hover */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full"
                        whileHover={{
                          translateX: "200%",
                          transition: { duration: 0.6, ease: "easeInOut" }
                        }}
                      />
                      
                      {/* Indicador activo animado */}
                      {isActive && (
                        <motion.div
                          className="absolute left-0 top-0 bottom-0 w-1 bg-white"
                          initial={{ scaleY: 0 }}
                          animate={{ scaleY: 1 }}
                          transition={{ duration: 0.3, ease: "easeOut" }}
                        />
                      )}
                      
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Icon className="h-5 w-5 relative z-10" />
                      </motion.div>
                      
                      <AnimatePresence>
                        {!isCollapsed && (
                          <motion.span 
                            className="relative z-10"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </Link>
                  </li>
                </StaggerItem>
              );
            })}
          </ul>
        </StaggerContainer>

        {/* Espaciador para empujar el contenido hacia abajo */}
        <div className="flex-1"></div>

        {/* Botón de Logout */}
        <motion.div 
          className="px-2 mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
        >
          <motion.button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 text-red-300 hover:bg-red-500/20 hover:text-red-200 group relative overflow-hidden ${isCollapsed ? 'justify-center' : ''}`}
            title="Cerrar Sesión"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Efecto de brillo al hover */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/20 to-transparent -translate-x-full"
              whileHover={{
                translateX: "200%",
                transition: { duration: 0.6, ease: "easeInOut" }
              }}
            />
            
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ duration: 0.2 }}
            >
              <LogOut className="h-5 w-5 relative z-10" />
            </motion.div>
            
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span 
                  className="relative z-10"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  Cerrar Sesión
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </motion.div>

        {/* CODECRAFT debajo del botón de logout */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div 
              className="px-4 pb-4 text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
            >
              <motion.span 
                className="text-sm font-bold bg-gradient-to-r from-white/90 to-uct-secondary bg-clip-text text-transparent"
                animate={{
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                {settings?.systemName || 'TV CODECRAFT'}
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </motion.aside>
  );
}
