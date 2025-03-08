import * as React from "react";

export interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

const DialogTitle = React.forwardRef<HTMLHeadingElement, DialogTitleProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <h2
        ref={ref}
        className={`text-lg font-semibold ${className}`}
        {...props}
      >
        {children}
      </h2>
    );
  }
);

DialogTitle.displayName = "DialogTitle";

export default DialogTitle;
