"use client";

import { useEffect, useState } from "react";

interface ConfirmAnnulerSessionModalProps {
  open: boolean;
  title?: string;
  description?: string;
  loading?: boolean;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmAnnulerSessionModal({
  open,
  title = "Annuler la session ?",
  description = "La session sera marquée comme annulée.",
  loading = false,
  confirmText = "Annuler",
  cancelText = "Retour",
  onConfirm,
  onCancel,
}: ConfirmAnnulerSessionModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!open || !mounted) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M12 7v5" />
                <path d="M12 17h.01" />
              </svg>
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-900">{title}</h2>
              <p className="text-sm text-slate-500 mt-1">{description}</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold disabled:opacity-50"
          >
            {loading ? "Annulation..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
