import * as React from "react";

export interface DialogProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

const DialogContext = React.createContext<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>({
  open: false,
  onOpenChange: () => {},
});

export function useDialogContext() {
  return React.useContext(DialogContext);
}

const Dialog = React.forwardRef<HTMLDivElement, DialogProps>(
  ({ open = false, onOpenChange, children, ...props }, ref) => {
    const [isOpen, setIsOpen] = React.useState(open);

    React.useEffect(() => {
      setIsOpen(open);
    }, [open]);

    const handleOpenChange = React.useCallback(
      (value: boolean) => {
        setIsOpen(value);
        onOpenChange?.(value);
      },
      [onOpenChange]
    );

    return (
      <DialogContext.Provider
        value={{
          open: isOpen,
          onOpenChange: handleOpenChange,
        }}
      >
        <div ref={ref} {...props}>
          {children}
        </div>
      </DialogContext.Provider>
    );
  }
);

Dialog.displayName = "Dialog";

export default Dialog;
