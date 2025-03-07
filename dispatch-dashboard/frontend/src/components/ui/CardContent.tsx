import React, { HTMLAttributes, forwardRef } from 'react';

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`p-6 pt-0 ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardContent.displayName = 'CardContent';

export default CardContent;
