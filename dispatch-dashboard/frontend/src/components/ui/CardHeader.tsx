import React, { HTMLAttributes, forwardRef } from 'react';

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`flex flex-col space-y-1.5 p-6 ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

export default CardHeader;
