import React, { ButtonHTMLAttributes, forwardRef } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'default', size = 'md', className = '', children, ...props }, ref) => {
    // Base classes
    const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-400 disabled:pointer-events-none disabled:opacity-50';
    
    // Variant classes
    const variantClasses = {
      default: 'bg-blue-600 text-white hover:bg-blue-700',
      outline: 'border border-gray-300 bg-transparent hover:bg-gray-100',
      ghost: 'bg-transparent hover:bg-gray-100',
      destructive: 'bg-red-600 text-white hover:bg-red-700',
    };
    
    // Size classes
    const sizeClasses = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-10 px-4 text-sm',
      lg: 'h-12 px-6 text-base',
    };
    
    // Combine classes
    const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
    
    return (
      <button className={combinedClasses} ref={ref} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
