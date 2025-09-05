'use client';

import { ReactNode, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from "@/components/Sidebar";
import NetworkStatus from "@/components/NetworkStatus";
import NotificationCenter from "./NotificationCenter";
import { Menu, LogOut, Bell } from 'lucide-react';
import UCTLogo from '@/components/UCTLogo';

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
        <header className="bg-white shadow-lg sticky top-0 z-20 border-b border-uct-gray-200">
          <div className="px-3 py-3 sm:px-6 sm:py-4">
            <div className="flex items-center justify-between">
              {/* Logo y título móvil */}
              <div className="flex items-center gap-3 lg:hidden">
                <UCTLogo size={32} variant="isotipo" className="flex-shrink-0" />
                <div className="hidden sm:block">
                  <h1 className="text-lg font-bold text-uct-primary">TV CODECRAFT</h1>
                  <p className="text-xs text-uct-gray-600">Sistema de Transmisión Digital</p>
                </div>
              </div>

              {/* Acciones del header */}
              <div className="flex items-center gap-2 sm:gap-4">
                {/* Estado de red - solo desktop */}
                <div className="hidden lg:block">
                  <NetworkStatus />
                </div>

                {/* Centro de notificaciones */}
                {showNotifications && (
                  <button
                    onClick={() => setShowNotificationPanel(!showNotificationPanel)}
                    className="relative p-2 text-uct-gray-600 hover:text-uct-primary hover:bg-uct-gray-100 rounded-lg transition-colors"
                    aria-label="Notificaciones"
                  >
                    <Bell className="h-5 w-5" />
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse" />
                  </button>
                )}

                {/* Botón de logout */}
                <button
                  onClick={handleLogout}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  aria-label="Cerrar sesión"
                >
                  <LogOut className="h-5 w-5" />
                </button>

                {/* Menú móvil */}
                <button
                  onClick={() => setIsMobileOpen(!isMobileOpen)}
                  className="lg:hidden p-2 text-uct-primary hover:bg-uct-gray-100 rounded-lg transition-colors"
                  aria-label="Abrir menú"
                >
                  <Menu className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Panel de notificaciones */}
        {showNotifications && showNotificationPanel && (
          <div className="relative">
            <NotificationCenter onClose={() => setShowNotificationPanel(false)} />
          </div>
        )}

        {/* Contenido principal */}
        <main className="p-3 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}