"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

export const Label = React.forwardRef<
  React.ComponentRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & {
    hint?: string;
  }
>(({ className, children, hint, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      "flex items-baseline gap-1.5 text-[13px] font-medium text-navy-800",
      className,
    )}
    {...props}
  >
    {children}
    {hint ? (
      <span className="text-[11px] font-normal text-navy-400">({hint})</span>
    ) : null}
  </LabelPrimitive.Root>
));
Label.displayName = "Label";
