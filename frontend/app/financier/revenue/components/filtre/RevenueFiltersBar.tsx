"use client";

import { useState, useEffect } from "react";
import { CalendarDays, BookOpen, Filter } from "lucide-react";

const PERIODS = [
  { label: "Mois", value: "month" },
  { label: "Trimestre", value: "quarter" },
  { label: "Année", value: "year" },
  { label: "Personnalisé", value: "custom" },
];


function getPeriodDates(period: string, customStart?: string, customEnd?: string) {
  const now = new Date();

  const format = (d: Date) => d.toISOString().split("T")[0];

  // 👇 نخدمو copy بش ما نبدلوش now
  const start = new Date(now);

  if (period === "month") {
    start.setDate(now.getDate() - 30);

    return {
      startDate: format(start),
      endDate: format(now),
    };
  }

  if (period === "quarter") {
    start.setDate(now.getDate() - 90);

    return {
      startDate: format(start),
      endDate: format(now),
    };
  }

  if (period === "year") {
    start.setDate(now.getDate() - 365);

    return {
      startDate: format(start),
      endDate: format(now),
    };
  }

  // custom
  return {
    startDate: period === "custom" && customStart ? customStart : format(start),
    endDate:  period === "custom" && customEnd ? customEnd : format(now),
  };
}

interface Props {
  onChange: (filters: Record<string, any>) => void;
  formations?: { id: number; title: string }[];
}

export default function RevenueFiltersBar({ onChange, formations = [] }: Props) {
  const [period, setPeriod] = useState("year");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [formationId, setFormationId] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  
  


 
  useEffect(() => {
    
    
  if (period !== "custom") {
    setCustomStart("");
    setCustomEnd("");
  }
}, [period]);

   useEffect(() => {
    // 1. On ne déclenche rien si on est en "custom" sans dates saisies
    const isCustomInvalid = period === "custom" && (!customStart || !customEnd);
    if (isCustomInvalid) return;

    const dates = getPeriodDates(period, customStart, customEnd);

    console.log("DATES 👉", dates);
    
    const f: Record<string, any> = { 
      
      startDate : dates.startDate,
      endDate : dates.endDate,
    };
    if (formationId && formationId !== "") {
      f.formationId = Number(formationId);
    }
    if (paymentStatus !== ""  && paymentStatus !== "undefined") {
      f.paymentStatus = paymentStatus;
    }
    console.log("FILTER SENT 👉", f);
    onChange(f);
  }, [period, formationId, paymentStatus, customStart, customEnd]);

  return (
    <div
      className="flex flex-wrap items-center gap-3 p-4 rounded-2xl"
      style={{
        background: "rgba(255,255,255,0.6)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(229,234,221,0.8)",
      }}
    >
      <div className="flex items-center gap-2">
        <CalendarDays size={16} style={{ color: "#1a7149" }} />
        <span className="text-sm font-medium" style={{ color: "#2d4a3e", opacity: 0.7 }}>
          Période :
        </span>
      </div>
      <div className="flex gap-1">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              period === p.value ? "bg-[#1a7149] text-white" : "bg-[#efefea] text-[#2d4a3e]"
            }`}
          >
            {p.label}
          </button>
          
        ))}
      </div>
      {period === "custom" && (
  <div className="flex gap-2 ml-2">
    <input
      type="date"
      value={customStart}
      onChange={(e) => setCustomStart(e.target.value)}
      className="px-2 py-1 rounded bg-[#efefea]"
    />
    <input
      type="date"
      value={customEnd}
      onChange={(e) => setCustomEnd(e.target.value)}
      className="px-2 py-1 rounded bg-[#efefea]"
    />
  </div>
)}

      <div className="w-px h-6 mx-1" style={{ background: "#e5eadd" }} />

      <div className="flex items-center gap-2">
        <BookOpen size={16} style={{ color: "#1a7149" }} />
        <div className="relative">
          <select
            value={formationId}
            onChange={(e) => setFormationId(e.target.value)}
            className="appearance-none bg-transparent text-sm outline-none pr-6 cursor-pointer px-3 py-1.5 rounded-lg"
            style={{ background: "#efefea", color: "#2d4a3e", fontFamily: "'DM Sans'" }}
          >
            <option value="">Toutes formations</option>
            {formations.map((f) => (
              <option key={f.id} value={f.id}>
                {f.title}
              </option>
            ))}
          </select>
          <svg
            className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#2d4a3e"
            strokeOpacity="0.4"
            strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      <div className="w-px h-6 mx-1" style={{ background: "#e5eadd" }} />

      <div className="flex items-center gap-2">
        <Filter size={16} style={{ color: "#1a7149" }} />
        <div className="relative">
          <select
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
            className="appearance-none bg-transparent text-sm outline-none pr-6 cursor-pointer px-3 py-1.5 rounded-lg"
            style={{ background: "#efefea", color: "#2d4a3e", fontFamily: "'DM Sans'" }}
          >
            <option value="">Tous statuts</option>
            <option value="paid">Payé</option>
            <option value="partial">Avance</option>
            <option value="unpaid">Impayé</option>
          </select>
          <svg
            className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#2d4a3e"
            strokeOpacity="0.4"
            strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>
    </div>
  );
}