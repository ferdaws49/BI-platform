"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, ChevronRight, Loader2 } from "lucide-react";
import { AlertItem } from "../types/alert.types";
import { fetchAlerts } from "@/lib/financier-alert.api";
import AlertCard from "./AlertCard";
import Link from "next/link";

export default function AlertDropdown() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<{ alerts: AlertItem[]; total: number }>({
    alerts: [],
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  const badgeCount = data.total;

  useEffect(() => {
    fetchAlerts()
      .then((res) =>
        setData({
          alerts: res.alerts.slice(0, 3),
          total: res.critique + res.warning,
        })
      )
      .catch(() => setData({ alerts: [], total: 0 }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2.5 rounded-xl border transition-all hover:shadow-md"
        style={{ background: "#efefea", borderColor: "#e5eadd" }}
      >
        <Bell size={18} style={{ color: "#2d4a3e" }} />
        {badgeCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold text-white bg-red-600 border-2 border-[#f9f8f3]">
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-3 w-96 bg-white rounded-2xl shadow-2xl border z-[9999] overflow-hidden"
          style={{ borderColor: "#e5eadd" }}
        >
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "#e5eadd" }}>
            <h3 className="text-sm font-bold" style={{ color: "#2d4a3e" }}>
              Notifications
            </h3>
            {badgeCount > 0 && (
              <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                {badgeCount} alerte{badgeCount > 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 size={20} className="animate-spin text-gray-400" />
              </div>
            ) : data.alerts.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">Aucune alerte active</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {data.alerts.map((alert, i) => (
                  <div key={i} className="rounded-lg hover:bg-gray-50 transition">
                    <AlertCard alert={alert} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-2 border-t" style={{ borderColor: "#e5eadd" }}>
            <Link
              href="/financier/alerts"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-1 w-full py-2 text-xs font-semibold rounded-lg transition hover:bg-gray-100"
              style={{ color: "#1a7149" }}
            >
              Voir toutes les alertes
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}