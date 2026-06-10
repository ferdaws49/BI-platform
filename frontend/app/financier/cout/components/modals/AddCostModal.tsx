"use client";

import { useState, useEffect, useRef, useMemo } from "react";

interface SessionOption {
  id: string;
  title: string;
  formation?: string;   // ← AJOUT
  formateur?: string;   // ← AJOUT
  date?: string;        // ← AJOUT
}
interface AddCostModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (dto: {
    type: "depense_formateur" | "depense_logistique";
    sessionId: string;
    montant: number;
    formateurId?: number;
    formateurNom?: string;
    description?: string;
  }) => Promise<void>;
  sessions: SessionOption[];
  formateurs: { id: number; nom: string }[];
}

export function AddCostModal({
  open,
  onClose,
  onSave,
  sessions,
  formateurs,
}: AddCostModalProps) {
  if (!open) return null;

  // ✅ State simple — suffisant car key={costModalKey} recrée le composant à chaque fois
  const [type, setType] = useState<"depense_formateur" | "depense_logistique">(
    "depense_formateur"
  );

  const [searchSession, setSearchSession] = useState("");
  const [selectedSession, setSelectedSession] = useState<SessionOption | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [montant, setMontant] = useState("");
  const [formateurId, setFormateurId] = useState("");
  const [formateurNom, setFormateurNom] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);



  

  //

  // Fermer dropdown si clic extérieur
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Filtrage dynamique : commence par le terme tapé
  const filteredSessions = useMemo(() => {
  if (!searchSession.trim()) return sessions;
  const q = searchSession.toLowerCase().trim();
  return sessions.filter((s) => {
    const haystack = [
      s.title,
      s.formation,
      s.formateur,
      s.date,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);  // ← includes au lieu de startsWith
  });
}, [searchSession, sessions]);

  const selectSession = (session: SessionOption) => {
    setSelectedSession(session);
    setSearchSession(session.title);
    setShowDropdown(false);
  };

  const handleFormateurChange = (val: string) => {
    setFormateurId(val);
    const f = formateurs.find((x) => String(x.id) === val);
    setFormateurNom(f?.nom ?? "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const sessionId = selectedSession?.id;
    if (
      !sessionId ||
      sessionId === "undefined" ||
      sessionId === "null" ||
      sessionId.trim() === ""
    ) {
      setError("Veuillez sélectionner une session valide dans la liste.");
      return;
    }

    if (!montant || Number(montant) <= 0) {
      setError("Veuillez saisir un montant valide.");
      return;
    }

    // ✅ VALIDATION CORRIGÉE : deux if séparés, pas de else
    if (type === "depense_formateur" && !formateurId) {
      setError("Veuillez sélectionner un formateur.");
      return;
    }

    if (type === "depense_logistique" && !description.trim()) {
      setError("Veuillez saisir une description pour le coût logistique.");
      return;
    }

    setLoading(true);
    try {
      await onSave({
        type, // ← utilise le state, pas une ref
        sessionId,
        montant: parseFloat(montant),
        ...(type === "depense_formateur"
          ? {
              formateurId: formateurId ? Number(formateurId) : undefined,
              formateurNom: formateurNom.trim() || undefined,
            }
          : {}),
        ...(type === "depense_logistique"
          ? { description: description.trim() }
          : {}),
      });
    } catch (e: any) {
      setError(e.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl"
      >
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Ajouter un coût
        </h2>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ── Type de coût ── */}
          <div>
            <label
              className="mb-1 block text-xs font-semibold uppercase tracking-wide"
              style={{ color: "#2d4a3e", opacity: 0.7 }}
            >
              Type de coût <span style={{ color: "#DC2626" }}>*</span>
            </label>
            <select
    value={type}
    onChange={(e) => setType(e.target.value as "depense_formateur" | "depense_logistique")}
              className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
              style={{ borderColor: "#e5eadd", color: "#2d4a3e", background: "#fff" }}
            >
              <option value="depense_formateur">Coût formateur</option>
              <option value="depense_logistique">Coût logistique</option>
            </select>
          </div>

          {/* ── Session (autocomplete dynamique) ── */}
          <div className="relative" ref={dropdownRef}>
            <label
              className="mb-1 block text-xs font-semibold uppercase tracking-wide"
              style={{ color: "#2d4a3e", opacity: 0.7 }}
            >
              Session / Formation <span style={{ color: "#DC2626" }}>*</span>
            </label>
            <input
              type="text"
              value={searchSession}
              onChange={(e) => {
                setSearchSession(e.target.value);
                setShowDropdown(true);
                setSelectedSession(null); // reset sélection si l'utilisateur retape
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Tapez le nom de la formation / session…"
              className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
              style={{ borderColor: "#e5eadd", color: "#2d4a3e", background: "#fff" }}
              autoComplete="off"
            />

            {showDropdown && (
              <div
                className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-xl border shadow-lg"
                style={{ borderColor: "#e5eadd", background: "#fff" }}
              >
                {filteredSessions.length === 0 ? (
                  <div
                    className="p-3 text-sm"
                    style={{ color: "#2d4a3e", opacity: 0.5 }}
                  >
                    Aucune session trouvée
                  </div>
                ) : (
                  filteredSessions.map((s) => (
  <button
    key={s.id}
    type="button"
    onClick={() => selectSession(s)}
    className="flex w-full flex-col px-3 py-2.5 text-left text-sm transition-colors hover:bg-[rgba(26,113,73,0.06)]"
  >
    <span className="font-medium" style={{ color: "#2d4a3e" }}>
      {s.title}
    </span>
    {(s.formation || s.formateur || s.date) && (
      <span className="text-xs mt-0.5" style={{ color: "#2d4a3e", opacity: 0.5 }}>
        {[s.formation, s.formateur, s.date].filter(Boolean).join(" • ")}
      </span>
    )}
  </button>
))
                )}
              </div>
            )}
          </div>

          {/* ── Montant ── */}
          <div>
            <label
              className="mb-1 block text-xs font-semibold uppercase tracking-wide"
              style={{ color: "#2d4a3e", opacity: 0.7 }}
            >
              Montant (DT) <span style={{ color: "#DC2626" }}>*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
              style={{ borderColor: "#e5eadd", color: "#2d4a3e", background: "#fff" }}
              placeholder="0.00"
            />
          </div>

          {/* ── Champs conditionnels ── */}
          {type === "depense_formateur" ? (
            <div>
              <label
                className="mb-1 block text-xs font-semibold uppercase tracking-wide"
                style={{ color: "#2d4a3e", opacity: 0.7 }}
              >
                Formateur <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <select
                value={formateurId}
                onChange={(e) => handleFormateurChange(e.target.value)}
                className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none mb-2"
                style={{ borderColor: "#e5eadd", color: "#2d4a3e", background: "#fff" }}
              >
                <option value="">-- Choisir un formateur --</option>
                {formateurs.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nom}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={formateurNom}
                onChange={(e) => setFormateurNom(e.target.value)}
                className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                style={{ borderColor: "#e5eadd", color: "#2d4a3e", background: "#fff" }}
                placeholder="Ou tapez le nom du formateur…"
              />
            </div>
          ) : (
            <div>
              <label
                className="mb-1 block text-xs font-semibold uppercase tracking-wide"
                style={{ color: "#2d4a3e", opacity: 0.7 }}
              >
                Description logistique <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                style={{
                  borderColor: "#e5eadd",
                  color: "#2d4a3e",
                  background: "#fff",
                  minHeight: 80,
                }}
                placeholder="Ex: Location salle, café, impression des supports…"
              />
            </div>
          )}

          {/* ── Actions ── */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border px-4 py-2 text-sm font-semibold transition-all hover:bg-white"
              style={{ borderColor: "#e5eadd", color: "#2d4a3e" }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60"
              style={{ background: "#1a7149" }}
            >
              {loading ? "Enregistrement…" : "Enregistrer le coût"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}