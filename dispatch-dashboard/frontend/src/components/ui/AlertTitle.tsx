import React, { HTMLAttributes, forwardRef } from 'react';

export interface AlertTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

const AlertTitle = forwardRef<HTMLHeadingElement, AlertTitleProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <h5
        ref={ref}
        className={`mb-1 font-medium leading-none tracking-tight ${className}`}
        {...props}
      >
        {children}
      </h5>
    );
  }
);

AlertTitle.displayName = 'AlertTitle';

export default AlertTitle;
