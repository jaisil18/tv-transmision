'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98
  },
  in: {
    opacity: 1,
    y: 0,
    scale: 1
  },
  out: {
    opacity: 0,
    y: -20,
    scale: 1.02
  }
};

const pageTransition = {
  type: 'tween' as const,
  ease: 'anticipate' as const,
  duration: 0.5
};

const PageTransition: React.FC<PageTransitionProps> = ({ children, className = '' }) => {
  return (
    <motion.div
      className={`min-h-screen ${className}`}
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;

// Componente para animaciones de lista
export const ListAnimation: React.FC<{ children: ReactNode; delay?: number }> = ({ 
  children, 
  delay = 0 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ 
        duration: 0.3, 
        delay,
        ease: "easeOut"
      }}
    >
      {children}
    </motion.div>
  );
};

// Componente para efectos de aparición escalonada
export const StaggerContainer: React.FC<{ children: ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.1,
            delayChildren: 0.2
          }
        }
      }}
    >
      {children}
    </motion.div>
  );
};

// Componente para elementos individuales en listas
export const StaggerItem: React.FC<{ children: ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 20, scale: 0.95 },
        visible: { 
          opacity: 1, 
          y: 0, 
          scale: 1,
          transition: {
            duration: 0.4,
            ease: "easeOut"
          }
        }
      }}
    >
      {children}
    </motion.div>
  );
};

// Componente para efectos de hover premium
export const PremiumHover: React.FC<{ 
  children: ReactNode; 
  className?: string;
  scale?: number;
  y?: number;
}> = ({ 
  children, 
  className = '',
  scale = 1.05,
  y = -5
}) => {
  return (
    <motion.div
      className={className}
      whileHover={{ 
        scale,
        y,
        transition: { duration: 0.2, ease: "easeOut" }
      }}
      whileTap={{ 
        scale: 0.98,
        transition: { duration: 0.1 }
      }}
    >
      {children}
    </motion.div>
  );
};

// Componente para efectos de carga premium
export const LoadingSpinner: React.FC<{ size?: number; className?: string }> = ({ 
  size = 40, 
  className = '' 
}) => {
  return (
    <motion.div
      className={`inline-block ${className}`}
      style={{ width: size, height: size }}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <motion.circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="31.416"
          animate={{
            strokeDashoffset: [0, 31.416],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </svg>
    </motion.div>
  );
};

// Componente para efectos de pulso
export const PulseEffect: React.FC<{ children: ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <motion.div
      className={className}
      animate={{
        scale: [1, 1.02, 1],
        opacity: [1, 0.8, 1]
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
        type: "tween"
      }}
    >
      {children}
    </motion.div>
  );
};