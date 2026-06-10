"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Lightbulb } from "lucide-react";

export default function InsightsSection({ insights, loading }: { insights: any[], loading: boolean }) {
  const [page, setPage] = useState(1);
  const perPage = 4;
  const totalPages = Math.ceil(insights.length / perPage);
  const current = insights.slice((page - 1) * perPage, page * perPage);

  if (insights.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Lightbulb className="text-yellow-500" />
          <h2 className="text-lg font-bold">Insights IA</h2>
        </div>
        {totalPages > 1 && (
          <div className="flex gap-2">
            <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="p-1 border rounded disabled:opacity-20"><ChevronLeft/></button>
            <span className="text-sm font-bold">{page}/{totalPages}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages} className="p-1 border rounded disabled:opacity-20"><ChevronRight/></button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {current.map(ins => (
          <div key={ins.id} className="bg-white p-4 rounded-xl border border-border shadow-sm">
             <h4 className="font-bold text-[#2d4a3e]">{ins.title}</h4>
             <p className="text-xs text-gray-500 mt-2">{ins.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}