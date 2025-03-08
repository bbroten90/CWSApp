import * as React from "react";

export interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const DialogFooter = React.forwardRef<HTMLDivElement, DialogFooterProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-5 ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

DialogFooter.displayName = "DialogFooter";

export default DialogFooter;
