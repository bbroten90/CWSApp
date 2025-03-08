import * as React from "react";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode;
  onValueChange?: (value: string) => void;
  value?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = "", children, onValueChange, value, ...props }, ref) => {
    const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
      if (onValueChange) {
        onValueChange(event.target.value);
      }
    };

    return (
      <select
        className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        ref={ref}
        onChange={handleChange}
        value={value}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = "Select";

export default Select;
