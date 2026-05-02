"use client";

import { useState, useEffect } from "react";
import { Session, Apprenant } from "../page";

// ─── Types ────────────────────────────────────────────────────────────────────

// Correspond exactement à MarquerPresenceDto du backend
interface PresenceRecord {
  apprenantId: number;   // @IsInt()
  estPresent: boolean;   // @IsBoolean()
}

interface PresenceModalProps {
  session: Session;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

const AVATAR_COLORS = [
  "bg-indigo-100 text-indigo-800",
  "bg-teal-100 text-teal-800",
  "bg-violet-100 text-violet-800",
  "bg-amber-100 text-amber-800",
  "bg-rose-100 text-rose-800",
  "bg-emerald-100 text-emerald-800",
  "bg-sky-100 text-sky-800",
  "bg-orange-100 text-orange-800",
];

const API_URL = "http://localhost:5000";

// ─── Component ────────────────────────────────────────────────────────────────

export default function PresenceModal({ session, onClose }: PresenceModalProps) {
  const apprenants: Apprenant[] = session.apprenants ?? [];

  // null = non marqué, true = présent, false = absent
  const [presences, setPresences] = useState<Record<number, boolean | null>>(
    () => Object.fromEntries(apprenants.map((a) => [a.id, null])),
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // ── Charger les présences existantes ─────────────────────────────────────────
  // GET /responsable/sessions/:id/presences
  // Retourne : { apprenantId: number, estPresent: boolean }[]
  useEffect(() => {
    const token = localStorage.getItem("access_token");

    fetch(`${API_URL}/responsable/sessions/${session.id}/presences`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: PresenceRecord[] | null) => {
        if (data && Array.isArray(data)) {
          const map: Record<number, boolean | null> = Object.fromEntries(
            apprenants.map((a) => [a.id, null]),
          );
          // ⚠️ apprenantId est un number côté backend
          data.forEach((p) => {
            map[p.apprenantId] = p.estPresent;
          });
          setPresences(map);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session.id]);

  // ── Toggle présence ───────────────────────────────────────────────────────────
  const toggle = (apprenantId: number, value: boolean) => {
    setSaved(false);
    setPresences((prev) => ({
      ...prev,
      [apprenantId]: prev[apprenantId] === value ? null : value,
    }));
  };

  const marquerTous = (estPresent: boolean) => {
    setSaved(false);
    setPresences(Object.fromEntries(apprenants.map((a) => [a.id, estPresent])));
  };

  // ── Enregistrer ──────────────────────────────────────────────────────────────
  // POST /responsable/sessions/:id/presences
  // Body : MarquerPresenceDto[] = { apprenantId: number, estPresent: boolean }[]
  const handleSave = async () => {
    setSaving(true);
    const token = localStorage.getItem("access_token");

    // N'envoyer que les apprenants dont la présence a été marquée (pas null)
    const payload: PresenceRecord[] = apprenants
      .filter((a) => presences[a.id] !== null)
      .map((a) => ({
        apprenantId: a.id,            // number ✅
        estPresent: presences[a.id] as boolean,  // boolean ✅
      }));

    try {
      const res = await fetch(
        `${API_URL}/responsable/sessions/${session.id}/presences`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        const error = await res.json();
        alert(error.message || "Erreur lors de l'enregistrement");
        return;
      }
    } catch {
      alert("Erreur réseau");
      return;
    } finally {
      setSaving(false);
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  // ── Stats ─────────────────────────────────────────────────────────────────────
  const totalMarques = apprenants.filter((a) => presences[a.id] !== null).length;
  const totalPresents = apprenants.filter((a) => presences[a.id] === true).length;
  const totalAbsents = apprenants.filter((a) => presences[a.id] === false).length;
  const totalNonMarques = apprenants.length - totalMarques;
  const tauxPresence =
    apprenants.length > 0
      ? Math.round((totalPresents / apprenants.length) * 100)
      : 0;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900">Feuille de présence</h2>
            <p className="text-xs text-slate-400 mt-0.5">{session.formation}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Session info */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 shrink-0">
          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="capitalize">{formatDate(session.date)}</span>
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {/* heureDebut/heureFin sont "HH:mm" depuis le backend */}
              {session.heureDebut} – {session.heureFin}
            </span>
            {session.formateur && (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {session.formateur}
              </span>
            )}
          </div>
        </div>

        {/* Stats bar */}
        {apprenants.length > 0 && (
          <div className="px-6 py-3 border-b border-slate-100 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex gap-4 text-xs">
                <span className="flex items-center gap-1 font-semibold text-emerald-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  {totalPresents} présent{totalPresents !== 1 ? "s" : ""}
                </span>
                <span className="flex items-center gap-1 font-semibold text-red-600">
                  <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                  {totalAbsents} absent{totalAbsents !== 1 ? "s" : ""}
                </span>
                {totalNonMarques > 0 && (
                  <span className="flex items-center gap-1 text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />
                    {totalNonMarques} non marqué{totalNonMarques !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              {totalMarques > 0 && (
                <span className="text-xs font-bold text-slate-600">
                  {tauxPresence}% présence
                </span>
              )}
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
              {totalPresents > 0 && (
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${(totalPresents / apprenants.length) * 100}%` }}
                />
              )}
              {totalAbsents > 0 && (
                <div
                  className="h-full bg-red-400 transition-all duration-300"
                  style={{ width: `${(totalAbsents / apprenants.length) * 100}%` }}
                />
              )}
            </div>

            {/* Marquer tous */}
            <div className="flex gap-2 mt-2.5">
              <button
                onClick={() => marquerTous(true)}
                className="flex-1 text-xs font-medium py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
              >
                ✓ Tous présents
              </button>
              <button
                onClick={() => marquerTous(false)}
                className="flex-1 text-xs font-medium py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors"
              >
                ✗ Tous absents
              </button>
            </div>
          </div>
        )}

        {/* Liste apprenants */}
        <div className="flex-1 overflow-y-auto px-6 py-3">
          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : apprenants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-400">Aucun apprenant inscrit</p>
            </div>
          ) : (
            <div className="space-y-2">
              {apprenants.map((apprenant, idx) => {
                const etat = presences[apprenant.id];
                return (
                  <div
                    key={apprenant.id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                      etat === true
                        ? "border-emerald-200 bg-emerald-50"
                        : etat === false
                        ? "border-red-200 bg-red-50"
                        : "border-slate-100 bg-white hover:bg-slate-50"
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                        AVATAR_COLORS[idx % AVATAR_COLORS.length]
                      }`}
                    >
                      {`${apprenant.prenom?.[0] ?? ""}${apprenant.nom?.[0] ?? ""}`.toUpperCase()}
                    </div>

                    {/* Nom */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-semibold truncate ${
                          etat === true
                            ? "text-emerald-900"
                            : etat === false
                            ? "text-red-800"
                            : "text-slate-800"
                        }`}
                      >
                        {apprenant.prenom} {apprenant.nom}
                      </p>
                      {apprenant.email && (
                        <p className="text-xs text-slate-400 truncate">{apprenant.email}</p>
                      )}
                    </div>

                    {/* Statut label */}
                    <span
                      className={`text-xs font-medium shrink-0 ${
                        etat === true
                          ? "text-emerald-600"
                          : etat === false
                          ? "text-red-500"
                          : "text-slate-300"
                      }`}
                    >
                      {etat === true ? "Présent" : etat === false ? "Absent" : "—"}
                    </span>

                    {/* Toggle buttons */}
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => toggle(apprenant.id, true)}
                        title="Marquer présent"
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                          etat === true
                            ? "bg-emerald-500 text-white shadow-sm"
                            : "bg-slate-100 text-slate-400 hover:bg-emerald-100 hover:text-emerald-600"
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => toggle(apprenant.id, false)}
                        title="Marquer absent"
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                          etat === false
                            ? "bg-red-500 text-white shadow-sm"
                            : "bg-slate-100 text-slate-400 hover:bg-red-100 hover:text-red-500"
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between shrink-0">
          <p className="text-xs text-slate-400">
            {totalMarques}/{apprenants.length} marqué{totalMarques !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Fermer
            </button>
            <button
              onClick={handleSave}
              disabled={saving || totalMarques === 0}
              className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all shadow-sm ${
                saved
                  ? "bg-emerald-500 text-white"
                  : "bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white"
              }`}
            >
              {saving ? "Enregistrement..." : saved ? "✓ Enregistré !" : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}