
"use client";
import { useEffect, useState } from "react";

export default function StepProgress({ total, current }: { total: number; current: number }) {
  const percent = Math.round((current / total) * 100);

  return (
    <div>
      <h2>Import en cours...</h2>

      <div
        style={{
          width: "100%",
          height: "20px",
          background: "#ddd",
          borderRadius: "10px",
        }}
      >
        <div
          style={{
            width: `${percent}%`,
            height: "100%",
            background: "#4caf50",
            borderRadius: "10px",
          }}
        />
      </div>

      <p>
        {current} / {total} ({percent}%)
      </p>
    </div>
  );
}