"use client";

import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Formation = {
  id: number;
  titre: string;
  description?: string | null;
  categorie?: string | null;
  dureeHeures?: number | null;
  prix: number;
  statut: "active" | "completed";
};

// Correspond exactement à CreateFormationDto du backend
type FormationPayload = {
  titre: string;
  description?: string;
  categorie?: string;
  dureeHeures?: number;
  prix: number;
  statut?: "active" | "completed";
};

interface CreateFormationModalProps {
  onClose: () => void;
  onCreated: (formation: Formation) => void; // appelé avec la nouvelle formation
}

const API_URL = "http://localhost:5000";

const CATEGORIES = [
  "Développement web",
  "Design UX/UI",
  "Data & IA",
  "Marketing digital",
  "Management",
  "Comptabilité",
  "Langues",
  "Autre",
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function CreateFormationModal({
  onClose,
  onCreated,
}: CreateFormationModalProps) {
  const [form, setForm] = useState({
    titre: "",
    description: "",
    categorie: "",
    dureeHeures: "",
    prix: "",
    statut: "active" as "active" | "completed",
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.titre.trim()) errs.titre = "Le titre est obligatoire";
    if (!form.prix) {
      errs.prix = "Le prix est obligatoire";
    } else if (isNaN(Number(form.prix)) || Number(form.prix) < 0) {
      errs.prix = "Le prix doit être un nombre positif";
    }
    if (form.dureeHeures && (isNaN(Number(form.dureeHeures)) || Number(form.dureeHeures) <= 0)) {
      errs.dureeHeures = "La durée doit être un nombre positif";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);

    try {
      const token = localStorage.getItem("access_token");

      // Payload exact = CreateFormationDto
      const payload: FormationPayload = {
        titre: form.titre.trim(),
        prix: Number(form.prix),
      };
      if (form.description.trim()) payload.description = form.description.trim();
      if (form.categorie) payload.categorie = form.categorie;
      if (form.dureeHeures) payload.dureeHeures = Number(form.dureeHeures);
      payload.statut = form.statut;

      const res = await fetch(`${API_URL}/responsable/formations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.message || "Erreur lors de la création");
        return;
      }

      const created: Formation = await res.json();
      onCreated(created); // met à jour la liste dans le parent
      onClose();
    } catch {
      alert("Erreur réseau");
    } finally {
      setSubmitting(false);
    }
  };

  const set = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Nouvelle formation</h2>
            <p className="text-xs text-slate-400 mt-0.5">Créez une formation disponible pour les sessions</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">

          {/* Titre — obligatoire */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Titre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.titre}
              onChange={(e) => set("titre", e.target.value)}
              placeholder="Ex: Développement React avancé"
              className={`w-full rounded-lg border px-3 py-2.5 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
                errors.titre ? "border-red-300 bg-red-50" : "border-slate-200"
              }`}
            />
            {errors.titre && <p className="text-xs text-red-500 mt-1">{errors.titre}</p>}
          </div>

          {/* Description — optionnel */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Description <span className="text-slate-400 font-normal">(optionnel)</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Décrivez le contenu et les objectifs de la formation..."
              rows={3}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
            />
          </div>

          {/* Catégorie + Durée sur la même ligne */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Catégorie <span className="text-slate-400 font-normal">(optionnel)</span>
              </label>
              <select
                value={form.categorie}
                onChange={(e) => set("categorie", e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="">Choisir...</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Durée (heures) <span className="text-slate-400 font-normal">(optionnel)</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={form.dureeHeures}
                onChange={(e) => set("dureeHeures", e.target.value)}
                placeholder="Ex: 24"
                className={`w-full rounded-lg border px-3 py-2.5 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
                  errors.dureeHeures ? "border-red-300 bg-red-50" : "border-slate-200"
                }`}
              />
              {errors.dureeHeures && <p className="text-xs text-red-500 mt-1">{errors.dureeHeures}</p>}
            </div>
          </div>

          {/* Prix — obligatoire */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Prix (DT) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.prix}
                onChange={(e) => set("prix", e.target.value)}
                placeholder="Ex: 1500"
                className={`w-full rounded-lg border px-3 py-2.5 pr-12 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
                  errors.prix ? "border-red-300 bg-red-50" : "border-slate-200"
                }`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                DT
              </span>
            </div>
            {errors.prix && <p className="text-xs text-red-500 mt-1">{errors.prix}</p>}
          </div>

          {/* Statut */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Statut</label>
            <div className="flex gap-2">
              {(["active", "completed"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, statut: s }))}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                    form.statut === s
                      ? s === "active"
                        ? "bg-emerald-100 border-emerald-300 text-emerald-800"
                        : "bg-slate-100 border-slate-300 text-slate-700"
                      : "border-slate-200 text-slate-400 hover:bg-slate-50"
                  }`}
                >
                  {s === "active" ? "✓ Active" : "Terminée"}
                </button>
              ))}
            </div>
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
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
          >
            {submitting ? "Création..." : "Créer la formation"}
          </button>
        </div>
      </div>
    </div>
  );
}