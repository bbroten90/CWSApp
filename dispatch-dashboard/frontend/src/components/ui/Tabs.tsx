import * as React from "react";

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

const TabsContext = React.createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
}>({});

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ className, defaultValue, value, onValueChange, children, ...props }, ref) => {
    const [selectedValue, setSelectedValue] = React.useState(defaultValue || value);

    // Update internal state when value prop changes
    React.useEffect(() => {
      if (value !== undefined) {
        setSelectedValue(value);
      }
    }, [value]);

    const handleValueChange = React.useCallback((newValue: string) => {
      setSelectedValue(newValue);
      onValueChange?.(newValue);
    }, [onValueChange]);

    return (
      <TabsContext.Provider
        value={{
          value: selectedValue,
          onValueChange: handleValueChange,
        }}
      >
        <div
          ref={ref}
          className={className}
          {...props}
        >
          {children}
        </div>
      </TabsContext.Provider>
    );
  }
);
Tabs.displayName = "Tabs";

export { Tabs, TabsContext };
export default Tabs;
