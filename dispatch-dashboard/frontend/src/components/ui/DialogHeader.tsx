import * as React from "react";

export interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const DialogHeader = React.forwardRef<HTMLDivElement, DialogHeaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`flex flex-col space-y-1.5 text-center sm:text-left mb-5 ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

DialogHeader.displayName = "DialogHeader";

export default DialogHeader;
