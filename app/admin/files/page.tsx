'use client';

import PageLayout from '@/components/PageLayout';
import FileManager from '@/components/FileManager';
import { Folder, Upload } from 'lucide-react';

export default function FilesPage() {
  const actions = (
    <div className="flex items-center gap-2">
      <div className="p-2 bg-uct-primary/10 rounded-lg">
        <Folder className="h-5 w-5 text-uct-primary" />
      </div>
    </div>
  );

  return (
    <PageLayout title="Gestión de Archivos" actions={actions}>
      <div className="space-y-6">
        {/* Sección de instrucciones eliminada */}

        {/* File Manager */}
        <FileManager />
      </div>
    </PageLayout>
  );
}
