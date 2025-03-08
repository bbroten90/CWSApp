import * as React from "react";
import { useDialogContext } from "./Dialog";

export interface DialogCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  children: React.ReactNode;
}

const DialogClose = React.forwardRef<HTMLButtonElement, DialogCloseProps>(
  ({ asChild = false, onClick, children, ...props }, ref) => {
    const { onOpenChange } = useDialogContext();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      onOpenChange(false);
    };

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

DialogClose.displayName = "DialogClose";

export default DialogClose;
