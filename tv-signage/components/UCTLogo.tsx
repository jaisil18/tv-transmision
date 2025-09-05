'use client';

import Image from 'next/image';

interface UCTLogoProps {
  className?: string;
  size?: number;
  variant?: 'isotipo' | 'full';
}

export default function UCTLogo({ className = '', size = 40, variant = 'isotipo' }: UCTLogoProps) {
  if (variant === 'full') {
    // Para página principal usar el logo completo con texto
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        <Image
          src="/png_logo.png"
          alt="Universidad Católica de Trujillo"
          width={size * 4} // Logo completo es más ancho
          height={size}
          className="drop-shadow-sm object-contain"
          style={{ width: 'auto', height: 'auto' }}
          priority
        />
      </div>
    );
  }

  // Para sidebar y móvil usar el logo GO-UCT (mejor para fondos oscuros)
  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <Image
        src="/GO-UCT-min-650x390.png"
        alt="UCT Logo"
        width={650}
        height={390}
        className="drop-shadow-sm object-contain max-w-none"
        style={{
          width: 'auto',
          height: `${size}px`,
          maxWidth: 'none',
          objectFit: 'contain'
        }}
        priority
      />
    </div>
  );
}
