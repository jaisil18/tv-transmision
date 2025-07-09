'use client';

import { ReactNode, forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-uct-primary to-uct-primary/90 text-white hover:from-uct-primary/90 hover:to-uct-primary focus-visible:ring-uct-primary shadow-lg hover:shadow-xl",
        destructive: "bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 focus-visible:ring-red-500 shadow-lg hover:shadow-xl",
        outline: "border-2 border-uct-gray-300 bg-white text-uct-gray-700 hover:bg-gradient-to-r hover:from-uct-gray-50 hover:to-white hover:border-uct-primary/50 focus-visible:ring-uct-primary shadow-sm hover:shadow-md",
        secondary: "bg-gradient-to-r from-uct-secondary to-uct-secondary/90 text-uct-primary hover:from-uct-secondary/90 hover:to-uct-secondary focus-visible:ring-uct-secondary shadow-lg hover:shadow-xl",
        ghost: "text-uct-gray-700 hover:bg-gradient-to-r hover:from-uct-gray-100 hover:to-uct-gray-50 focus-visible:ring-uct-primary",
        link: "text-uct-primary underline-offset-4 hover:underline focus-visible:ring-uct-primary hover:text-uct-primary/80",
        gradient: "bg-uct-gradient text-white hover:shadow-lg transform hover:scale-105 focus-visible:ring-uct-primary"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-8 text-base",
        xl: "h-14 px-10 text-lg",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends Omit<HTMLMotionProps<"button">, "ref">,
    VariantProps<typeof buttonVariants> {
  children: ReactNode;
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, children, loading, disabled, ...props }, ref) => {
    return (
      <motion.button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        whileHover={{ 
          scale: 1.02,
          y: -2,
          transition: { duration: 0.2, ease: "easeOut" }
        }}
        whileTap={{ 
          scale: 0.98,
          y: 0,
          transition: { duration: 0.1 }
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        {...props}
      >
        {/* Efecto de brillo al hover */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full"
          whileHover={{
            translateX: "200%",
            transition: { duration: 0.6, ease: "easeInOut" }
          }}
        />
        
        {loading && (
          <motion.svg
            className="-ml-1 mr-3 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </motion.svg>
        )}
        
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {children}
        </motion.span>
      </motion.button>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };