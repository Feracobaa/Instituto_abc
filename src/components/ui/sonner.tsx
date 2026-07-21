/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, toast as rawToast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

interface ToastProps {
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  variant?: "default" | "destructive" | "success" | "warning";
  duration?: number;
  [key: string]: any;
}

const customToast = (message: string | React.ReactNode | ToastProps, options?: any) => {
  if (message && typeof message === "object" && !React.isValidElement(message)) {
    const { title, description, variant, ...rest } = message as ToastProps;
    
    const toastFn = 
      variant === "destructive" ? rawToast.error :
      variant === "success" ? rawToast.success :
      rawToast;

    return toastFn(title as any || "", {
      description,
      ...rest,
      ...options,
    });
  }
  
  return rawToast(message as any, options);
};

customToast.success = (message: string | React.ReactNode, options?: any) => rawToast.success(message as any, options);
customToast.error = (message: string | React.ReactNode, options?: any) => rawToast.error(message as any, options);
customToast.info = (message: string | React.ReactNode, options?: any) => rawToast.info(message as any, options);
customToast.warning = (message: string | React.ReactNode, options?: any) => rawToast.warning(message as any, options);
customToast.message = (message: string | React.ReactNode, options?: any) => rawToast.message(message as any, options);
customToast.dismiss = (id?: string | number) => rawToast.dismiss(id);
customToast.custom = (jsx: (id: string | number) => React.ReactElement, options?: any) => rawToast.custom(jsx, options);
customToast.loading = (message: string | React.ReactNode, options?: any) => rawToast.loading(message as any, options);
customToast.promise = <T,>(promise: Promise<T> | (() => Promise<T>), options?: any) => rawToast.promise(promise, options);

export { Toaster, customToast as toast };

