import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type = "text", ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      "flex h-11 w-full min-w-0 rounded-lg border border-navy-200 bg-white px-3.5 text-sm text-navy-900 shadow-[0_1px_1px_rgba(6,27,39,.03)] transition-[border-color,box-shadow] duration-200",
      "placeholder:text-navy-400",
      "hover:border-navy-300",
      "focus-visible:border-teal-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-500/15",
      "disabled:cursor-not-allowed disabled:bg-navy-50 disabled:text-navy-400",
      "aria-[invalid=true]:border-[var(--color-danger)] aria-[invalid=true]:ring-[var(--color-danger)]/10",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, rows = 4, ...props }, ref) => (
  <textarea
    ref={ref}
    rows={rows}
    className={cn(
      "flex w-full rounded-lg border border-navy-200 bg-white px-3.5 py-3 text-sm text-navy-900 transition-colors",
      "placeholder:text-navy-400",
      "focus-visible:border-teal-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-500/12",
      "aria-[invalid=true]:border-[var(--color-danger)]",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

/** <select> natif : sur mobile il ouvre le sélecteur système, plus rapide à utiliser. */
export const NativeSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "h-11 w-full min-w-0 appearance-none rounded-lg border border-navy-200 bg-white transition-[border-color,box-shadow] duration-200 hover:border-navy-300 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%234d8098%22 stroke-width=%222%22 stroke-linecap=%22round%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:18px] bg-[right_0.75rem_center] bg-no-repeat px-3.5 pe-10 text-sm text-navy-900 transition-colors",
      "focus-visible:border-teal-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-500/12",
      "disabled:cursor-not-allowed disabled:bg-navy-50",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
NativeSelect.displayName = "NativeSelect";
