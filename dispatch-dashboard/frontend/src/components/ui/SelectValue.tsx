import * as React from "react";

export interface SelectValueProps extends React.HTMLAttributes<HTMLSpanElement> {
  placeholder?: string;
}

const SelectValue = React.forwardRef<HTMLSpanElement, SelectValueProps>(
  ({ className, children, placeholder, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={`block truncate ${className}`}
        {...props}
      >
        {children || placeholder}
      </span>
    );
  }
);
SelectValue.displayName = "SelectValue";

export default SelectValue;
