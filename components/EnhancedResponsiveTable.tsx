'use client';

import { ReactNode, useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Search, Filter } from 'lucide-react';

interface Column {
  key: string;
  label: string;
  className?: string;
  mobileLabel?: string;
  hideOnMobile?: boolean;
  sortable?: boolean;
  filterable?: boolean;
}

interface EnhancedResponsiveTableProps {
  columns: Column[];
  data: any[];
  renderRow: (item: any, index: number) => ReactNode;
  renderMobileCard?: (item: any, index: number) => ReactNode;
  loading?: boolean;
  emptyMessage?: string;
  keyExtractor: (item: any) => string;
  searchable?: boolean;
  filterable?: boolean;
  pagination?: boolean;
  itemsPerPage?: number;
}

export default function EnhancedResponsiveTable({
  columns,
  data,
  renderRow,
  renderMobileCard,
  loading = false,
  emptyMessage = "No hay datos disponibles",
  keyExtractor,
  searchable = true,
  filterable = false,
  pagination = true,
  itemsPerPage = 10
}: EnhancedResponsiveTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Filtrado y búsqueda
  const filteredData = useMemo(() => {
    let filtered = data;

    if (searchTerm) {
      filtered = filtered.filter(item =>
        Object.values(item).some(value =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    if (sortConfig) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [data, searchTerm, sortConfig]);

  // Paginación
  const paginatedData = useMemo(() => {
    if (!pagination) return filteredData;
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage, pagination]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return current.direction === 'asc' 
          ? { key, direction: 'desc' }
          : null;
      }
      return { key, direction: 'asc' };
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12" role="status" aria-label="Cargando">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-uct-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controles de búsqueda y filtros */}
      {(searchable || filterable) && (
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {searchable && (
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-uct-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-uct-gray-300 rounded-lg focus:ring-2 focus:ring-uct-primary focus:border-transparent"
                aria-label="Buscar en la tabla"
              />
            </div>
          )}
          
          {filterable && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border border-uct-gray-300 rounded-lg hover:bg-uct-gray-50 transition-colors"
              aria-label="Mostrar filtros"
            >
              <Filter className="h-4 w-4" />
              Filtros
            </button>
          )}
        </div>
      )}

      {/* Información de resultados */}
      <div className="text-sm text-uct-gray-600">
        Mostrando {paginatedData.length} de {filteredData.length} resultados
      </div>

      {paginatedData.length === 0 ? (
        <div className="text-center py-12 text-uct-gray-500">
          <div className="text-4xl mb-4">📭</div>
          <p className="text-lg font-medium mb-2">No se encontraron resultados</p>
          <p className="text-sm">{emptyMessage}</p>
        </div>
      ) : (
        <>
          {/* Vista de tabla para desktop */}
          <div className="hidden md:block overflow-x-auto bg-white rounded-lg shadow-sm border border-uct-gray-200">
            <table className="min-w-full divide-y divide-uct-gray-200">
              <thead className="bg-uct-gray-50">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      className={`px-6 py-4 text-left text-xs font-semibold text-uct-gray-700 uppercase tracking-wider ${
                        column.sortable ? 'cursor-pointer hover:bg-uct-gray-100' : ''
                      } ${column.className || ''}`}
                      onClick={column.sortable ? () => handleSort(column.key) : undefined}
                      role={column.sortable ? 'button' : undefined}
                      aria-label={column.sortable ? `Ordenar por ${column.label}` : undefined}
                    >
                      <div className="flex items-center gap-2">
                        {column.label}
                        {column.sortable && (
                          <div className="flex flex-col">
                            <ChevronUp 
                              className={`h-3 w-3 ${
                                sortConfig?.key === column.key && sortConfig.direction === 'asc'
                                  ? 'text-uct-primary'
                                  : 'text-uct-gray-400'
                              }`}
                            />
                            <ChevronDown 
                              className={`h-3 w-3 -mt-1 ${
                                sortConfig?.key === column.key && sortConfig.direction === 'desc'
                                  ? 'text-uct-primary'
                                  : 'text-uct-gray-400'
                              }`}
                            />
                          </div>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-uct-gray-200">
                {paginatedData.map((item, index) => (
                  <tr 
                    key={keyExtractor(item)} 
                    className="hover:bg-uct-gray-50 transition-colors"
                    role="row"
                  >
                    {renderRow(item, index)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Vista de cards para móvil */}
          <div className="md:hidden space-y-4">
            {renderMobileCard ? (
              paginatedData.map((item, index) => (
                <div 
                  key={keyExtractor(item)} 
                  className="bg-white border border-uct-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  {renderMobileCard(item, index)}
                </div>
              ))
            ) : (
              paginatedData.map((item, index) => (
                <div 
                  key={keyExtractor(item)} 
                  className="bg-white border border-uct-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="space-y-3">
                    {columns.filter(col => !col.hideOnMobile).map((column) => (
                      <div key={column.key} className="flex justify-between items-start">
                        <span className="text-sm font-medium text-uct-gray-600">
                          {column.mobileLabel || column.label}:
                        </span>
                        <span className="text-sm text-uct-gray-900 text-right ml-2 font-medium">
                          {item[column.key]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Paginación */}
          {pagination && totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-uct-gray-200 bg-white px-4 py-3 sm:px-6 rounded-b-lg">
              <div className="flex flex-1 justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-md border border-uct-gray-300 bg-white px-4 py-2 text-sm font-medium text-uct-gray-700 hover:bg-uct-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="relative ml-3 inline-flex items-center rounded-md border border-uct-gray-300 bg-white px-4 py-2 text-sm font-medium text-uct-gray-700 hover:bg-uct-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-uct-gray-700">
                    Mostrando página <span className="font-medium">{currentPage}</span> de{' '}
                    <span className="font-medium">{totalPages}</span>
                  </p>
                </div>
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Paginación">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center rounded-l-md px-2 py-2 text-uct-gray-400 ring-1 ring-inset ring-uct-gray-300 hover:bg-uct-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronUp className="h-5 w-5 rotate-[-90deg]" aria-hidden="true" />
                    </button>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                            pageNum === currentPage
                              ? 'z-10 bg-uct-primary text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-uct-primary'
                              : 'text-uct-gray-900 ring-1 ring-inset ring-uct-gray-300 hover:bg-uct-gray-50 focus:z-20 focus:outline-offset-0'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center rounded-r-md px-2 py-2 text-uct-gray-400 ring-1 ring-inset ring-uct-gray-300 hover:bg-uct-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronUp className="h-5 w-5 rotate-90" aria-hidden="true" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}