/** shadcn/ui Button (padrão Radix/new-york), adaptado aos tokens Kurio. Licença MIT. */
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        default: 'bg-[var(--cobre)] text-[var(--fundo)] hover:bg-[#eeb878]',
        outline: 'border border-[var(--cobre)] text-[var(--cobre)] hover:bg-[#33231a]',
        ghost: 'text-[var(--texto)] hover:bg-[#33231a]',
      },
      size: { default: 'h-11 px-5 py-2', sm: 'h-9 px-3', icon: 'h-11 w-11' },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}
/** Compõe links e botões sem perder semântica nem o estado de foco. */
export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp className={twMerge(clsx(buttonVariants({ variant, size, className })))} {...props} />
  );
}
