'use client';

import { ReactNode, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from "@/components/Sidebar";
// NetworkStatus component removido
import NotificationCenter from "./NotificationCenter";
import { Menu, LogOut, Bell } from 'lucide-react';
import UCTLogo from '@/components/UCTLogo';
import PageTransition from '@/components/animations/PageTransition';

interface ResponsiveLayoutProps {
  children: ReactNode;
  showNotifications?: boolean;
}

export default function ResponsiveLayout({ children, showNotifications = true }: ResponsiveLayoutProps) {
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detectar dispositivo móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 1024) {
        setIsMobileOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      document.cookie.split(";").forEach(function(c) {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });

      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/';
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      window.location.href = '/';
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-uct-light to-uct-gray-50">
      {/* Overlay para móvil */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
          aria-label="Cerrar menú"
        />
      )}

      {/* Sidebar */}
      <div className={`lg:block ${isMobileOpen ? 'block' : 'hidden'} ${isMobileOpen ? 'fixed z-40' : ''}`}>
        <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      </div>

      {/* Contenido principal */}
      <div
        className={`flex-1 transition-all duration-300 min-w-0 ${
          isCollapsed ? 'lg:ml-20' : 'lg:ml-64'
        }`}
      >
        {/* Header responsivo mejorado */}
        <motion.header 
          className="bg-white/90 backdrop-blur-md shadow-lg sticky top-0 z-20 border-b border-uct-gray-200/50"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <div className="px-3 py-3 sm:px-6 sm:py-4">
            <div className="flex items-center justify-between">
              {/* Logo y título móvil */}
              <motion.div 
                className="flex items-center gap-3 lg:hidden"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <UCTLogo size={32} variant="isotipo" className="flex-shrink-0" />
                <div className="hidden sm:block">
                  <h1 className="text-lg font-bold text-uct-primary">TV CODECRAFT</h1>
                  <p className="text-xs text-uct-gray-600">Sistema de Transmisión Digital</p>
                </div>
              </motion.div>

              {/* Acciones del header */}
              <motion.div 
                className="flex items-center gap-2 sm:gap-4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                {/* Estado de red removido */}

                {/* Centro de notificaciones */}
                {showNotifications && (
                  <motion.button
                    onClick={() => setShowNotificationPanel(!showNotificationPanel)}
                    className="relative p-2 text-uct-gray-600 hover:text-uct-primary hover:bg-uct-gray-100 rounded-lg transition-all duration-200 overflow-hidden group"
                    aria-label="Notificaciones"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-uct-primary/10 to-uct-secondary/10 opacity-0 group-hover:opacity-100"
                      transition={{ duration: 0.2 }}
                    />
                    <Bell className="h-5 w-5 relative z-10" />
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse" />
                  </motion.button>
                )}

                {/* Botón de logout */}
                <motion.button
                  onClick={handleLogout}
                  className="p-2 text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 rounded-lg transition-all duration-200 relative overflow-hidden group"
                  aria-label="Cerrar sesión"
                  whileHover={{ scale: 1.05, y: -1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-red-600/10 opacity-0 group-hover:opacity-100"
                    transition={{ duration: 0.2 }}
                  />
                  <LogOut className="h-5 w-5 relative z-10" />
                </motion.button>

                {/* Menú móvil */}
                <motion.button
                  onClick={() => setIsMobileOpen(!isMobileOpen)}
                  className="lg:hidden p-2 text-uct-primary hover:bg-uct-gray-100 rounded-lg transition-all duration-200 relative overflow-hidden group"
                  aria-label="Abrir menú"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-uct-primary/10 to-uct-secondary/10 opacity-0 group-hover:opacity-100"
                    transition={{ duration: 0.2 }}
                  />
                  <Menu className="h-5 w-5 relative z-10" />
                </motion.button>
              </motion.div>
            </div>
          </div>
        </motion.header>

        {/* Panel de notificaciones */}
        {showNotifications && showNotificationPanel && (
          <div className="relative">
            <NotificationCenter onClose={() => setShowNotificationPanel(false)} />
          </div>
        )}

        {/* Contenido principal */}
        <main className="p-3 sm:p-6 lg:p-8 bg-gradient-to-br from-uct-light via-white to-uct-gray-50 relative">
          {/* Efectos de fondo premium */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-uct-primary/5 via-transparent to-uct-secondary/5 pointer-events-none"
            animate={{
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
              type: "tween"
            }}
          />
          
          <PageTransition className="relative z-10">
            {children}
          </PageTransition>
        </main>
      </div>
    </div>
  );
}