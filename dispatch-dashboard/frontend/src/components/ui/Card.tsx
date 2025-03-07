import React, { HTMLAttributes, forwardRef } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;

export const CardHeader = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className = '', children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={`flex flex-col space-y-1.5 p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<
  HTMLHeadingElement,
  HTMLAttributes<HTMLHeadingElement>
>(({ className = '', children, ...props }, ref) => {
  return (
    <h3
      ref={ref}
      className={`font-semibold text-lg leading-none tracking-tight ${className}`}
      {...props}
    >
      {children}
    </h3>
  );
});

CardTitle.displayName = 'CardTitle';

export const CardContent = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className = '', children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={`p-6 pt-0 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

CardContent.displayName = 'CardContent';
