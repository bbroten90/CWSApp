import React, { HTMLAttributes, forwardRef } from 'react';

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive';
  children: React.ReactNode;
}

const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ className = '', variant = 'default', children, ...props }, ref) => {
    const variantClasses = {
      default: 'bg-blue-50 border-blue-200 text-blue-800',
      destructive: 'bg-red-50 border-red-200 text-red-800',
    };

    return (
      <div
        ref={ref}
        className={`border p-4 rounded-md ${variantClasses[variant]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Alert.displayName = 'Alert';

export default Alert;
