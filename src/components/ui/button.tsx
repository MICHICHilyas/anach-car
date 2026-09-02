import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold",
    "transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out",
    // Léger enfoncement au clic : le bouton répond au doigt comme au curseur.
    "active:scale-[0.985]",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    // Une icône PLACÉE APRÈS le libellé avance légèrement au survol. La
    // condition `:not(:first-child)` évite de faire bouger une icône seule
    // ou placée avant le texte, qui n'a aucune raison de se déplacer.
    "[&>svg:last-child:not(:first-child)]:transition-transform",
    "[&>svg:last-child:not(:first-child)]:duration-200",
    "hover:[&>svg:last-child:not(:first-child)]:translate-x-0.5",
    "rtl:hover:[&>svg:last-child:not(:first-child)]:-translate-x-0.5",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-teal-600 text-white shadow-[0_1px_2px_rgba(6,27,39,.12)] hover:bg-teal-700 hover:shadow-[0_4px_14px_-4px_rgba(15,140,134,.5)] active:bg-teal-800",
        navy: "bg-navy-900 text-white hover:bg-navy-800 hover:shadow-[0_4px_14px_-4px_rgba(6,27,39,.45)] active:bg-navy-950",
        outline:
          "border border-navy-200 bg-white text-navy-900 hover:border-teal-400 hover:bg-teal-50/60",
        ghost: "text-navy-700 hover:bg-navy-50 hover:text-navy-900",
        subtle: "bg-navy-50 text-navy-800 hover:bg-navy-100",
        danger: "bg-[var(--color-danger)] text-white hover:brightness-95",
        whatsapp: "bg-[#25D366] text-white hover:brightness-95",
        link: "text-teal-700 underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-3.5 text-[13px]",
        md: "h-11 px-5",
        lg: "h-13 px-7 text-[15px]",
        icon: "size-10",
        "icon-sm": "size-8 [&_svg]:size-3.5",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
