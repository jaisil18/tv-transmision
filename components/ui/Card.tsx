'use client';

import { ReactNode, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CardProps {
  children?: ReactNode;
  className?: string;
  onClick?: () => void;
  [key: string]: any;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <motion.div
      ref={ref}
      className={cn(
        "rounded-xl border border-uct-gray-200/50 bg-white/80 backdrop-blur-sm shadow-lg transition-all duration-300 hover:shadow-2xl hover:shadow-uct-primary/10 relative overflow-hidden group",
        className
      )}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ 
        y: -4,
        scale: 1.02,
        transition: { duration: 0.2, ease: "easeOut" }
      }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      {...props}
    >
      {/* Efecto de brillo sutil */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-uct-primary/5 via-transparent to-uct-secondary/5 opacity-0 group-hover:opacity-100"
        transition={{ duration: 0.3 }}
      />
      
      {/* Borde animado */}
      <motion.div
        className="absolute inset-0 rounded-xl border-2 border-transparent bg-gradient-to-r from-uct-primary/20 via-uct-secondary/20 to-uct-primary/20 opacity-0 group-hover:opacity-100"
        style={{ padding: '1px' }}
        transition={{ duration: 0.3 }}
      />
      
      <div className="relative z-10">
        {props.children}
      </div>
    </motion.div>
  )
);
Card.displayName = "Card";

const CardHeader = forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <motion.div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 p-6", className)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      {...props}
    />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = forwardRef<HTMLHeadingElement, CardProps>(
  ({ className, ...props }, ref) => (
    <motion.h3
      ref={ref}
      className={cn("text-lg font-semibold leading-none tracking-tight text-uct-dark bg-gradient-to-r from-uct-dark to-uct-primary bg-clip-text text-transparent", className)}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

const CardDescription = forwardRef<HTMLParagraphElement, CardProps>(
  ({ className, ...props }, ref) => (
    <motion.p
      ref={ref}
      className={cn("text-sm text-uct-gray-600", className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.3 }}
      {...props}
    />
  )
);
CardDescription.displayName = "CardDescription";

const CardContent = forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <motion.div 
      ref={ref} 
      className={cn("p-6 pt-0", className)} 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      {...props} 
    />
  )
);
CardContent.displayName = "CardContent";

const CardFooter = forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <motion.div
      ref={ref}
      className={cn("flex items-center p-6 pt-0", className)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.4 }}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };