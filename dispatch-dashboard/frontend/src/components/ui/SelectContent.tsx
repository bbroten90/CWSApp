import * as React from "react";

export interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        className={`absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-80 ${className}`}
        ref={ref}
        {...props}
      >
        <div className="p-1">{children}</div>
      </div>
    );
  }
);
SelectContent.displayName = "SelectContent";

export default SelectContent;
