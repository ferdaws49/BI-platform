"use client";

import { useState, useEffect } from "react";
import { Session, Formateur, Formation } from "../page";

interface CreateSessionModalProps {
  session: Session | null;
  formations: Formation[];
  formateurs: Formateur[];
  onClose: () => void;
  onSubmit: (data: Partial<Session>) => Promise<void> | void;
}

type ConflictWarning = {
  type: "formateur" | "formation" | "apprenant";
  message: string;
};

const API_URL = "http://localhost:5000";

// Normalise "HH:mm:ss" → "HH:mm"
function toHHmm(t: string): string {
  return t ? t.slice(0, 5) : "";
}

export default function CreateSessionModal({
  session,
  formations,
  formateurs,
  onClose,
  onSubmit,
}: CreateSessionModalProps) {
  const isEdit = !!session;

  const [form, setForm] = useState({
    date: session?.date ?? "",
    heureDebut: toHHmm(session?.heureDebut ?? ""),
    heureFin: toHHmm(session?.heureFin ?? ""),
    formationId: session?.formationId ? String(session.formationId) : "",
    formateurId: session?.formateurId ? String(session.formateurId) : "",
    lieu: session?.lieu ?? "",
    statut: session?.statut ?? "Actif",
    type: session?.type ?? "présentiel", // ✅ Added
    capacite: session?.capacite != null ? String(session.capacite) : "", // ✅ Added
    // Prix spécifique session (optionnel)
    prix: session?.prix != null ? String(session.prix) : "",
  });

  const [conflicts, setConflicts] = useState<ConflictWarning[]>([]);
  const [checkingConflict, setCheckingConflict] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Prix par défaut selon formation sélectionnée ────────────────────
  // If no specific price is set, we use the price of the selected training program.
  const selectedFormation = formations.find(
    (f) => String(f.id) === form.formationId
  );
  const prixPlaceholder = selectedFormation
    ? `Prix formation: ${selectedFormation.prix} DT`
    : "Prix spécifique (laisser vide = prix formation)";

  // ── Conflict check (Debounced or triggered on field change) ──────────
  // Checks if the trainer or the room is already booked for the selected slot.
  useEffect(() => {
    if (!form.date || !form.heureDebut || !form.heureFin || !form.formateurId) return;
    const token = localStorage.getItem("access_token");
    setCheckingConflict(true);

    const params = new URLSearchParams({
      date: form.date,
      heureDebut: toHHmm(form.heureDebut),
      heureFin: toHHmm(form.heureFin),
      formateurId: form.formateurId,
      ...(form.formationId && { formationId: form.formationId }),
      ...(session?.id && { excludeId: session.id }),
    });

    fetch(`${API_URL}/responsable/sessions/check-conflict?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.conflicts) setConflicts(data.conflicts);
        else setConflicts([]);
      })
      .catch(() => setConflicts([]))
      .finally(() => setCheckingConflict(false));
  }, [form.date, form.heureDebut, form.heureFin, form.formateurId, form.formationId]);

  // ── Validation Logic ────────────────────────────────────────────────
  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.formationId) errs.formationId = "La formation est obligatoire";
    if (!form.date) errs.date = "La date est obligatoire";
    if (!form.heureDebut) errs.heureDebut = "L'heure de début est obligatoire";
    if (!form.heureFin) errs.heureFin = "L'heure de fin est obligatoire";
    if (!form.formateurId) errs.formateurId = "Le formateur est obligatoire";
    
    // Check if end time is actually after start time
    if (
      form.heureDebut &&
      form.heureFin &&
      toHHmm(form.heureDebut) >= toHHmm(form.heureFin)
    ) {
      errs.heureFin = "L'heure de fin doit être après l'heure de début";
    }
    // Price validation: must be a positive number
    if (form.prix && isNaN(Number(form.prix))) {
      errs.prix = "Le prix doit être un nombre valide";
    }
    if (form.prix && Number(form.prix) < 0) {
      errs.prix = "Le prix ne peut pas être négatif";
    }
    // Capacity validation
    if (form.capacite && isNaN(Number(form.capacite))) {
      errs.capacite = "La capacité doit être un nombre valide";
    }
    if (form.capacite && Number(form.capacite) < 1) {
      errs.capacite = "La capacité doit être au moins de 1";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submission ──────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      // Map form state to the DTO expected by the backend
      const payload: Record<string, unknown> = {
        date: form.date,
        heureDebut: toHHmm(form.heureDebut),
        heureFin: toHHmm(form.heureFin),
        formationId: Number(form.formationId),
        formateurId: Number(form.formateurId),
      };
      if (form.lieu) payload.lieu = form.lieu;
      if (isEdit) payload.statut = form.statut;
      if (form.prix && !isNaN(Number(form.prix))) {
        payload.prix = Number(form.prix);
      }
      payload.type = form.type;
      if (form.capacite && !isNaN(Number(form.capacite))) {
        payload.capacite = Number(form.capacite);
      }

      await onSubmit(payload as Partial<Session>);
    } finally {
      setSubmitting(false);
    }
  };

  const set = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {isEdit ? "Modifier la session" : "Nouvelle session"}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isEdit ? "Modifiez les informations" : "Planifiez une nouvelle session de formation"}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">

          {/* Formation */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Formation <span className="text-red-500">*</span>
            </label>
            {formations.length === 0 ? (
              <div className="w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
                ⚠ Aucune formation disponible — créez d'abord une formation
              </div>
            ) : (
              <select
                value={form.formationId}
                onChange={(e) => set("formationId", e.target.value)}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
                  errors.formationId ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"
                }`}
              >
                <option value="">Choisir une formation</option>
                {formations.map((f) => (
                  <option key={f.id} value={f.id}>{f.titre} — {f.prix} DT</option>
                ))}
              </select>
            )}
            {errors.formationId && <p className="text-xs text-red-500 mt-1">{errors.formationId}</p>}
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
                errors.date ? "border-red-300 bg-red-50" : "border-slate-200"
              }`}
            />
            {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
          </div>

          {/* Horaires */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Heure début <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={form.heureDebut}
                onChange={(e) => set("heureDebut", e.target.value)}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
                  errors.heureDebut ? "border-red-300 bg-red-50" : "border-slate-200"
                }`}
              />
              {errors.heureDebut && <p className="text-xs text-red-500 mt-1">{errors.heureDebut}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Heure fin <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={form.heureFin}
                onChange={(e) => set("heureFin", e.target.value)}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
                  errors.heureFin ? "border-red-300 bg-red-50" : "border-slate-200"
                }`}
              />
              {errors.heureFin && <p className="text-xs text-red-500 mt-1">{errors.heureFin}</p>}
            </div>
          </div>

          {/* Formateur */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Formateur <span className="text-red-500">*</span>
            </label>
            {formateurs.length === 0 ? (
              <div className="w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
                ⚠ Aucun formateur disponible — ajoutez d'abord un formateur
              </div>
            ) : (
              <select
                value={form.formateurId}
                onChange={(e) => set("formateurId", e.target.value)}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
                  errors.formateurId ? "border-red-300 bg-red-50" : "border-slate-200"
                }`}
              >
                <option value="">Choisir un formateur</option>
                {formateurs.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.prenom} {f.nom}{f.specialite ? ` — ${f.specialite}` : ""}
                  </option>
                ))}
              </select>
            )}
            {errors.formateurId && <p className="text-xs text-red-500 mt-1">{errors.formateurId}</p>}
          </div>

          {/* Prix spécifique */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Prix spécifique <span className="text-slate-400 font-normal">(optionnel)</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.prix}
              onChange={(e) => set("prix", e.target.value)}
              placeholder={prixPlaceholder}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
                errors.prix ? "border-red-300 bg-red-50" : "border-slate-200"
              }`}
            />
            {selectedFormation && (
              <p className="text-xs text-slate-400 mt-1">
                Laisser vide pour utiliser le prix de la formation ({selectedFormation.prix} DT)
              </p>
            )}
            {errors.prix && <p className="text-xs text-red-500 mt-1">{errors.prix}</p>}
          </div>

          {/* Lieu */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Lieu <span className="text-slate-400 font-normal">(optionnel)</span>
            </label>
            <input
              type="text"
              value={form.lieu}
              onChange={(e) => set("lieu", e.target.value)}
              placeholder="Ex: Salle A, Lab informatique..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          {/* Type & Capacité */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Type</label>
              <select
                value={form.type}
                onChange={(e) => set("type", e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
              >
                <option value="présentiel">Présentiel</option>
                <option value="en_ligne">En ligne</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Capacité <span className="text-slate-400 font-normal">(opt.)</span>
              </label>
              <input
                type="number"
                min="1"
                value={form.capacite}
                onChange={(e) => set("capacite", e.target.value)}
                placeholder="Ex: 20"
                className={`w-full rounded-lg border px-3 py-2.5 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
                  errors.capacite ? "border-red-300 bg-red-50" : "border-slate-200"
                }`}
              />
              {errors.capacite && <p className="text-xs text-red-500 mt-1">{errors.capacite}</p>}
            </div>
          </div>

          {/* Statut — édition seulement */}
          {isEdit && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Statut</label>
              <div className="flex gap-2">
                {(["Actif", "Terminé", "Annulé"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set("statut", s)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                      form.statut === s
                        ? s === "Actif"
                          ? "bg-blue-100 border-blue-300 text-blue-800"
                          : s === "Terminé"
                          ? "bg-emerald-100 border-emerald-300 text-emerald-800"
                          : "bg-red-100 border-red-300 text-red-800"
                        : "border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conflicts */}
          {checkingConflict && (
            <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
              <span className="animate-pulse">⏳</span> Vérification des conflits...
            </div>
          )}
          {conflicts.length > 0 && !checkingConflict && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 space-y-1">
              <p className="text-xs font-semibold text-amber-800">⚠ Conflits détectés</p>
              {conflicts.map((c, i) => (
                <p key={i} className="text-xs text-amber-700">{c.message}</p>
              ))}
              <p className="text-xs text-amber-600 mt-1">Vous pouvez quand même enregistrer.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || formations.length === 0 || formateurs.length === 0}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
          >
            {submitting ? "Enregistrement..." : isEdit ? "Enregistrer" : "Créer la session"}
          </button>
        </div>
      </div>
    </div>
  );
}