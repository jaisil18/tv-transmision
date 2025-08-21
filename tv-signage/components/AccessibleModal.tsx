'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import AccessibleButton from './AccessibleButton';

interface AccessibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl'
};

export default function AccessibleModal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md' 
}: AccessibleModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Guardar el elemento que tenía el foco
      previousFocusRef.current = document.activeElement as HTMLElement;
      
      // Enfocar el modal
      modalRef.current?.focus();
      
      // Prevenir scroll del body
      document.body.style.overflow = 'hidden';
    } else {
      // Restaurar el foco
      previousFocusRef.current?.focus();
      
      // Restaurar scroll del body
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        ref={modalRef}
        className={`relative w-full ${sizeClasses[size]} max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl focus:outline-none`}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-uct-gray-200">
          <h2 
            id="modal-title" 
            className="text-xl font-semibold text-uct-primary"
          >
            {title}
          </h2>
          <AccessibleButton
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="text-uct-gray-500 hover:text-uct-gray-700"
          >
            <X className="h-5 w-5" />
          </AccessibleButton>
        </div>

        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}