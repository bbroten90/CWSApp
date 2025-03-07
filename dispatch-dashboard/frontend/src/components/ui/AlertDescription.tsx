import React, { HTMLAttributes, forwardRef } from 'react';

export interface AlertDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

const AlertDescription = forwardRef<HTMLParagraphElement, AlertDescriptionProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={`text-sm leading-relaxed ${className}`}
        {...props}
      >
        {children}
      </p>
    );
  }
);

AlertDescription.displayName = 'AlertDescription';

export default AlertDescription;
