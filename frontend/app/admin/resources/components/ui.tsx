"use client";

import * as React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ---------------- Button ----------------
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 gap-2",
          {
            "btn-primary": variant === "default",
            "bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl px-4 py-2": variant === "destructive",
            "border border-border bg-transparent hover:bg-accent hover:text-accent-foreground rounded-xl px-4 py-2": variant === "outline",
            "bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-xl px-4 py-2": variant === "secondary",
            "hover:bg-accent hover:text-accent-foreground rounded-xl px-4 py-2": variant === "ghost",
            "text-primary underline-offset-4 hover:underline": variant === "link",
            "h-9 px-3 text-sm": size === "sm",
            "h-11 px-8": size === "lg",
            "h-10 w-10 p-0 flex": size === "icon", // override padding for icon
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

// ---------------- Badge ----------------
export function Badge({ className, variant = "default", ...props }: React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "secondary" | "destructive" | "warning" }) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-xl border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        {
          "border-transparent bg-success text-success-foreground": variant === "default",
          "border-transparent bg-secondary text-secondary-foreground": variant === "secondary",
          "border-transparent bg-destructive text-destructive-foreground": variant === "destructive",
          "border-transparent bg-warning text-warning-foreground": variant === "warning",
        },
        className
      )}
      {...props}
    />
  );
}

// ---------------- Card ----------------
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  // Using global '.card' class
  return <div className={cn("card border border-border", className)} {...props} />;
}
export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-1", className)} {...props} />;
}

// ---------------- Forms ----------------
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input type={type} ref={ref} className={cn("input w-full", className)} {...props} />
  )
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn("input w-full min-h-[80px]", className)} {...props} />
  )
);
Textarea.displayName = "Textarea";

export const SelectNative = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select ref={ref} className={cn("input w-full", className)} {...props} />
  )
);
SelectNative.displayName = "SelectNative";

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label ref={ref} className={cn("text-sm font-medium leading-none mb-2 block text-foreground", className)} {...props} />
  )
);
Label.displayName = "Label";

// ---------------- Dialog ----------------
export function Dialog({ open, onOpenChange, children }: { open: boolean; onOpenChange: (open: boolean) => void; children: React.ReactNode }) {
  React.useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => onOpenChange(false)} className="fixed inset-0 bg-background/80 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} className="relative z-50 w-full max-w-lg overflow-hidden rounded-2xl bg-card border border-border p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            {children}
            <button onClick={() => onOpenChange(false)} className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition focus:outline-none focus:ring-2 focus:ring-ring">
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
export function DialogTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn("text-xl font-bold mb-4 text-foreground", className)} {...props}>
      {children}
    </h2>
  );
}
export function DialogFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mt-6 flex justify-end gap-2", className)} {...props}>
      {children}
    </div>
  );
}
