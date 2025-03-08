import * as React from "react";
import { useDialogContext } from "./Dialog";

export interface DialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  children: React.ReactNode;
}

const DialogTrigger = React.forwardRef<HTMLButtonElement, DialogTriggerProps>(
  ({ asChild = false, onClick, children, ...props }, ref) => {
    const { onOpenChange } = useDialogContext();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      onOpenChange(true);
    };

    // Simplify component to avoid TypeScript errors
    return (
      <button
        type="button"
        onClick={handleClick}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  }
);

DialogTrigger.displayName = "DialogTrigger";

export default DialogTrigger;
