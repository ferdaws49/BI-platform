"use client";

import { AlertItem, AlertPriority } from "../types/alert.types";
import { AlertTriangle, AlertCircle, Info, Clock } from "lucide-react";

const priorityConfig: Record<
  AlertPriority,
  { icon: typeof AlertTriangle; color: string; bg: string; border: string }
> = {
  critical: {
    icon: AlertTriangle,
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
  },
  warning: {
    icon: AlertCircle,
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-200",
  },
  info: {
    icon: Info,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
};

export default function AlertCard({ alert }: { alert: AlertItem }) {
  const config = priorityConfig[alert.priority];
  const Icon = config.icon;

  const date = new Date(alert.createdAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={`flex gap-3 p-4 rounded-xl border ${config.bg} ${config.border} transition hover:shadow-sm`}
    >
      <div className={`mt-0.5 ${config.color}`}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-gray-900 truncate">
            {alert.title}
          </h4>
          <span
            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${config.color} bg-white/60`}
          >
            {alert.type}
          </span>
        </div>
        <p className="text-xs text-gray-600 mt-1 leading-relaxed">
          {alert.message}
        </p>
        {alert.action && (
          <p className="text-[11px] text-gray-500 mt-1.5 italic">
            → {alert.action}
          </p>
        )}
        <div className="flex items-center gap-1 mt-2 text-[11px] text-gray-400">
          <Clock size={12} />
          <span>{date}</span>
        </div>
      </div>
    </div>
  );
}