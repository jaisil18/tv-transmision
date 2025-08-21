'use client';

import { ReactNode } from 'react';

interface Column {
  key: string;
  label: string;
  className?: string;
  mobileLabel?: string;
  hideOnMobile?: boolean;
}

interface ResponsiveTableProps {
  columns: Column[];
  data: any[];
  renderRow: (item: any, index: number) => ReactNode;
  renderMobileCard?: (item: any, index: number) => ReactNode;
  loading?: boolean;
  emptyMessage?: string;
  keyExtractor: (item: any) => string;
}

export default function ResponsiveTable({
  columns,
  data,
  renderRow,
  renderMobileCard,
  loading = false,
  emptyMessage = "No hay datos disponibles",
  keyExtractor
}: ResponsiveTableProps) {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-uct-primary border-t-transparent"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-uct-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      {/* Vista de tabla para desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.className || ''}`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item, index) => (
              <tr key={keyExtractor(item)} className="hover:bg-gray-50 transition-colors">
                {renderRow(item, index)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Vista de cards para móvil */}
      <div className="md:hidden space-y-4">
        {renderMobileCard ? (
          data.map((item, index) => (
            <div key={keyExtractor(item)} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              {renderMobileCard(item, index)}
            </div>
          ))
        ) : (
          data.map((item, index) => (
            <div key={keyExtractor(item)} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="space-y-2">
                {columns.filter(col => !col.hideOnMobile).map((column) => (
                  <div key={column.key} className="flex justify-between items-start">
                    <span className="text-sm font-medium text-gray-500">
                      {column.mobileLabel || column.label}:
                    </span>
                    <span className="text-sm text-gray-900 text-right ml-2">
                      {item[column.key]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
