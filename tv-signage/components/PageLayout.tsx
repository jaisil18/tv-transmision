'use client';

import { ReactNode } from 'react';

interface PageLayoutProps {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}

export default function PageLayout({ title, actions, children }: PageLayoutProps) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-uct-primary">{title}</h2>
          <div className="h-1 w-16 bg-uct-accent-gradient rounded-full mt-2"></div>
        </div>
        {actions && <div className="flex-shrink-0">{actions}</div>}
      </div>
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-uct border border-uct-gray-200 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
