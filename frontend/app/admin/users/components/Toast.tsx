"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle, XCircle, AlertCircle, X } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────
export type ToastType = "success" | "error" | "warning";

interface ToastProps {
  message: string;
  type?: ToastType;
  onClose: () => void;
}

// ─── Composant Toast (rendu via portal sur document.body) ────
function ToastItem({ message, type = "success", onClose }: ToastProps) {
  const [visible, setVisible] = useState(false);

  // Animation entrée
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  const styles = {
    success: {
      bg: "bg-emerald-600",
      icon: <CheckCircle size={16} className="text-white flex-shrink-0" />,
    },
    error: {
      bg: "bg-red-500",
      icon: <XCircle size={16} className="text-white flex-shrink-0" />,
    },
    warning: {
      bg: "bg-amber-500",
      icon: <AlertCircle size={16} className="text-white flex-shrink-0" />,
    },
  };

  const { bg, icon } = styles[type];

  return createPortal(
    <div
      className={`fixed top-5 right-5 z-[9999] flex items-center gap-3
                  ${bg} text-white text-sm font-medium px-4 py-3
                  rounded-xl shadow-xl max-w-sm
                  transition-all duration-300
                  ${visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}`}
    >
      {icon}
      <span className="flex-1">{message}</span>
      <button
        onClick={onClose}
        className="text-white/70 hover:text-white transition ml-1"
      >
        <X size={14} />
      </button>
    </div>,
    document.body,
  );
}

// ─── Hook useToast ────────────────────────────────────────────
// Utilisation dans n'importe quelle page :
//   const { showToast, ToastComponent } = useToast();
//   showToast("✓ Utilisateur créé", "success");
//   return <div>...{ToastComponent}</div>
export function useToast() {
  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
    key: number;
  } | null>(null);

  const showToast = (message: string, type: ToastType = "success") => {
    setToast({ message, type, key: Date.now() });
    setTimeout(() => setToast(null), 4000);
  };

  const ToastComponent = toast ? (
    <ToastItem
      key={toast.key}
      message={toast.message}
      type={toast.type}
      onClose={() => setToast(null)}
    />
  ) : null;

  return { showToast, ToastComponent };
}
