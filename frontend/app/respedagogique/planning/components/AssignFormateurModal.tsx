"use client";

import { useState } from "react";
import { Session, Formateur } from "../page";

interface AssignFormateurModalProps {
  session: Session;
  formateurs: Formateur[];
  onClose: () => void;
  // onAssign reçoit number | null — null = désaffecter
  onAssign: (formateurId: number | null) => void;
}

export default function AssignFormateurModal({
  session,
  formateurs,
  onClose,
  onAssign,
}: AssignFormateurModalProps) {
  const [selected, setSelected] = useState<string>(
    session.formateurId ? String(session.formateurId) : "",
  );
  const [submitting, setSubmitting] = useState(false);

  const handleAssign = async () => {
    setSubmitting(true);
    // ⚠️ formateurId doit être un number pour le backend (@IsInt)
    // Si selected est vide on envoie null (désaffectation)
    await onAssign(selected ? Number(selected) : null);
    setSubmitting(false);
  };

  const currentFormateur = formateurs.find((f) => f.id === session.formateurId);

  const isUnchanged =
    selected === "" ? session.formateurId === null : Number(selected) === session.formateurId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Affecter un formateur
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">
              Session : {session.formation} · {session.date}
            </p>
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

        <div className="px-6 py-5 space-y-3">

          {/* Formateur actuel */}
          {currentFormateur && (
            <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
              <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-800">
                {`${currentFormateur.prenom[0] ?? ""}${currentFormateur.nom[0] ?? ""}`}
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Formateur actuel</p>
                <p className="text-sm font-semibold text-slate-800">
                  {currentFormateur.prenom} {currentFormateur.nom}
                </p>
              </div>
            </div>
          )}

          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Choisir un formateur
          </p>

          {/* Option "Aucun" pour désaffecter */}
          <button
            type="button"
            onClick={() => setSelected("")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
              selected === ""
                ? "border-slate-300 bg-slate-50"
                : "border-slate-200 bg-white hover:bg-slate-50"
            }`}
          >
            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-sm text-slate-500 italic">Aucun formateur</p>
            {selected === "" && (
              <svg className="w-5 h-5 text-slate-400 ml-auto shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>

          {/* Liste des formateurs */}
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {formateurs.map((f) => {
              const isSelected = selected === String(f.id);
              const isCurrent = session.formateurId === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelected(String(f.id))}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "border-indigo-300 bg-indigo-50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      isSelected
                        ? "bg-indigo-200 text-indigo-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {`${f.prenom[0] ?? ""}${f.nom[0] ?? ""}`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-semibold truncate ${
                        isSelected ? "text-indigo-900" : "text-slate-800"
                      }`}
                    >
                      {f.prenom} {f.nom}
                      {isCurrent && (
                        <span className="ml-2 text-xs font-normal text-slate-400">
                          (actuel)
                        </span>
                      )}
                    </p>
                    {f.specialite && (
                      <p className="text-xs text-slate-400 truncate">{f.specialite}</p>
                    )}
                  </div>
                  {isSelected && (
                    <svg className="w-5 h-5 text-indigo-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleAssign}
            disabled={submitting || isUnchanged}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
          >
            {submitting ? "Affectation..." : "Confirmer"}
          </button>
        </div>
      </div>
    </div>
  );
}