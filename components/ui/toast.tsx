"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ToastVariant = "default" | "success" | "warning" | "error";

type ToastInput = {
  title?: string;
  description: string;
  variant?: ToastVariant;
  durationMs?: number;
};

type ToastRecord = Required<Omit<ToastInput, "durationMs">> & {
  id: string;
};

type ToastContextValue = {
  showToast: (toast: ToastInput) => string;
  dismissToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);
const MAX_TOASTS = 4;

const variantStyles: Record<ToastVariant, string> = {
  default: "border-border bg-white text-foreground",
  success: "border-border bg-white text-foreground",
  warning: "border-border bg-white text-foreground",
  error: "border-border bg-white text-foreground"
};

const variantIcons = {
  default: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle
};

function inferVariant(message: string): ToastVariant {
  if (/失败|错误|无法|不能|未启用|缺少|异常/.test(message)) {
    return "error";
  }

  if (/请先|再次点击|确认|没有|当前/.test(message)) {
    return "warning";
  }

  if (/已|成功|完成|通过/.test(message)) {
    return "success";
  }

  return "default";
}

function createToastId() {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: ToastInput) => {
      const id = createToastId();
      const record: ToastRecord = {
        id,
        title: toast.title ?? "提示",
        description: toast.description,
        variant: toast.variant ?? inferVariant(toast.description)
      };

      setToasts((current) => [record, ...current.filter((item) => item.description !== record.description)].slice(0, MAX_TOASTS));

      if (toast.durationMs !== 0) {
        window.setTimeout(() => dismissToast(id), toast.durationMs ?? 4500);
      }

      return id;
    },
    [dismissToast]
  );

  const value = useMemo(
    () => ({
      showToast,
      dismissToast
    }),
    [dismissToast, showToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed right-3 top-3 z-50 flex w-[calc(100vw-1.5rem)] max-w-sm flex-col gap-2 sm:right-4 sm:top-4 sm:w-96"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => {
          const Icon = variantIcons[toast.variant];

          return (
            <div
              key={toast.id}
              className={cn(
                "pointer-events-auto grid grid-cols-[auto_1fr_auto] gap-3 rounded-lg border p-3 text-sm shadow-lg",
                variantStyles[toast.variant]
              )}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold">{toast.title}</p>
                <p className="mt-1 break-words leading-5 text-muted">{toast.description}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => dismissToast(toast.id)}
                aria-label="关闭提示"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}

export function useToastMessage(message: string, options: { title?: string; variant?: ToastVariant } = {}) {
  const { showToast } = useToast();
  const lastMessageRef = useRef("");

  useEffect(() => {
    if (!message || message === lastMessageRef.current) {
      return;
    }

    lastMessageRef.current = message;
    showToast({
      title: options.title,
      description: message,
      variant: options.variant
    });
  }, [message, options.title, options.variant, showToast]);
}
