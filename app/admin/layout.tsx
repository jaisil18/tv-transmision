'use client';

import { Inter } from 'next/font/google';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { NotificationProvider } from '@/components/notifications/NotificationSystem';
// Usar solo ResponsiveLayout que ya incluye el Sidebar
import ResponsiveLayout from '@/components/ResponsiveLayout';

const inter = Inter({ subsets: ['latin'] });

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  // Verificar horarios del sistema periódicamente
  useEffect(() => {
    const checkSchedule = async () => {
      try {
        await fetch('/api/system/schedule');
      } catch (error) {
        console.error('Error verificando horarios:', error);
      }
    };

    // Verificar inmediatamente
    checkSchedule();

    // Verificar cada 5 minutos
    const interval = setInterval(checkSchedule, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <NotificationProvider>
      <ResponsiveLayout>
        {children}
      </ResponsiveLayout>
    </NotificationProvider>
  );
}
