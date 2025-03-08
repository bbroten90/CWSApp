import * as React from "react";
import { useDialogContext } from "./Dialog";

export interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, ...props }, ref) => {
    const { open } = useDialogContext();

    if (!open) {
      return null;
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
        <div
          ref={ref}
          className={`relative bg-background p-6 shadow-lg rounded-lg w-full max-w-lg max-h-[85vh] overflow-auto ${className}`}
          {...props}
        >
          {children}
        </div>
      </div>
    );
  }
);

DialogContent.displayName = "DialogContent";

export default DialogContent;
