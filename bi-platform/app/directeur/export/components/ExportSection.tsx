"use client";

import { useState } from "react";

type ExportOptions = {
  format: "pdf" | "excel" | "csv";
  periode: string;
  formation: string;
  formateur: string;
  rapports: {
    strategique: boolean;
    financiere: boolean;
    performance: boolean;
    qualite: boolean;
  };
};

type ExportFormat = "pdf" | "excel" | "csv";

const rapportsList = [
  {
    id: "strategique",
    nom: "Rapport stratégique",
    description: "Analyse globale de la stratégie de formation",
    icon: "📊",
  },
  {
    id: "financiere",
    nom: "Analyse financière",
    description: "Détails des revenus, coûts et profits",
    icon: "💰",
  },
  {
    id: "performance",
    nom: "Performance des formations",
    description: "Taux de réussite, satisfaction et progression",
    icon: "📈",
  },
  {
    id: "qualite",
    nom: "Qualité pédagogique",
    description: "Évaluation des formateurs et contenus",
    icon: "⭐",
  },
];

const formations = [
  "Tous",
  "Data Science",
  "Web Dev",
  "UI/UX",
  "Java",
  "Data Engineering",
  "Marketing",
  "DevOps",
];
const formateurs = [
  "Tous",
  "Amine",
  "Sara",
  "Mohamed",
  "Fatima",
  "Ali",
  "Nadia",
];
const periodes = [
  "7 derniers jours",
  "30 derniers jours",
  "3 derniers mois",
  "Année actuelle",
  "Toutes les données",
];

export default function ExportSection({
  options,
  setOptions,
}: {
  options: ExportOptions;
  setOptions: (options: ExportOptions) => void;
}) {
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleFormatChange = (format: ExportFormat) => {
    setOptions({ ...options, format });
    setExportSuccess(false);
    setExportError(null);
  };

  const handleRapportToggle = (rapportId: string) => {
    setOptions({
      ...options,
      rapports: {
        ...options.rapports,
        [rapportId]:
          !options.rapports[rapportId as keyof typeof options.rapports],
      },
    });
  };

  // ── Export réel — appelle le backend ────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    setExportSuccess(false);

    try {
      const token = localStorage.getItem("access_token");

      // Construire la liste des rapports sélectionnés
      const selectedRapports = Object.entries(options.rapports)
        .filter(([_, selected]) => selected)
        .map(([id]) => id);

      // POST vers le backend
      const response = await fetch("http://localhost:5000/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          format: options.format,
          periode: options.periode,
          formation:
            options.formation !== "Tous" ? options.formation : undefined,
          formateur:
            options.formateur !== "Tous" ? options.formateur : undefined,
          rapports: selectedRapports,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur serveur: ${response.status}`);
      }

      // Récupérer le fichier comme blob
      const blob = await response.blob();

      // Déterminer l'extension
      const ext =
        options.format === "excel"
          ? "xlsx"
          : options.format === "pdf"
            ? "pdf"
            : "csv";

      const filename = `rapport_${new Date().toISOString().split("T")[0]}.${ext}`;

      // Déclencher le téléchargement dans le navigateur
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 4000);
    } catch (error: any) {
      console.error("Export error:", error);
      setExportError(
        error.message ?? "Une erreur est survenue lors de l'export",
      );
    } finally {
      setExporting(false);
    }
  };

  const selectedRapportsCount = Object.values(options.rapports).filter(
    Boolean,
  ).length;
  const isExportDisabled = selectedRapportsCount === 0;

  return (
    <main className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Export des Rapports
        </h1>
        <p className="text-sm text-gray-600">
          Exportez vos données analytiques en différents formats
        </p>
      </div>

      {/* ── Success Message ── */}
      {exportSuccess && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">✅</span>
            <div>
              <h3 className="font-semibold text-green-900">Export réussi</h3>
              <p className="text-sm text-green-800">
                Votre rapport a été généré et téléchargé avec succès.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Error Message ── */}
      {exportError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">❌</span>
            <div>
              <h3 className="font-semibold text-red-900">Erreur d'export</h3>
              <p className="text-sm text-red-800">{exportError}</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* ── 1. Format Selection ── */}
        <section className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            1. Sélectionnez le format d'export
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { id: "pdf", label: "PDF", icon: "📄", desc: "Document formaté" },
              {
                id: "excel",
                label: "Excel",
                icon: "📊",
                desc: "Feuilles de calcul",
              },
              { id: "csv", label: "CSV", icon: "📋", desc: "Texte délimité" },
            ].map((fmt) => (
              <button
                key={fmt.id}
                onClick={() => handleFormatChange(fmt.id as ExportFormat)}
                className={`rounded-lg border-2 p-4 text-center transition-all ${
                  options.format === fmt.id
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <span className="text-3xl">{fmt.icon}</span>
                <h3 className="mt-2 font-semibold text-gray-900">
                  {fmt.label}
                </h3>
                <p className="text-xs text-gray-600">{fmt.desc}</p>
              </button>
            ))}
          </div>
        </section>

        {/* ── 2. Rapports Selection ── */}
        <section className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            2. Sélectionnez les rapports à inclure
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            {selectedRapportsCount} rapport
            {selectedRapportsCount !== 1 ? "s" : ""} sélectionné
            {selectedRapportsCount !== 1 ? "s" : ""}
          </p>
          <div className="space-y-3">
            {rapportsList.map((rapport) => (
              <label
                key={rapport.id}
                className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={
                    options.rapports[
                      rapport.id as keyof typeof options.rapports
                    ]
                  }
                  onChange={() => handleRapportToggle(rapport.id)}
                  className="w-5 h-5 rounded border-gray-300 text-green-600 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{rapport.icon}</span>
                    <h3 className="font-medium text-gray-900">{rapport.nom}</h3>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {rapport.description}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* ── 3. Filter Options ── */}
        <section className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            3. Options de filtrage
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Période
              </label>
              <select
                value={options.periode}
                onChange={(e) =>
                  setOptions({ ...options, periode: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              >
                {periodes.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Formation
              </label>
              <select
                value={options.formation}
                onChange={(e) =>
                  setOptions({ ...options, formation: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              >
                {formations.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Formateur
              </label>
              <select
                value={options.formateur}
                onChange={(e) =>
                  setOptions({ ...options, formateur: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              >
                {formateurs.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* ── 4. Summary + Export Button ── */}
        <section className="rounded-lg border border-green-200 bg-green-50 p-6">
          <h2 className="text-lg font-semibold text-green-900 mb-4">
            Résumé de l'export
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 mb-6">
            <div>
              <p className="text-sm text-green-800">Format</p>
              <p className="text-lg font-semibold text-green-900 capitalize">
                {options.format === "excel"
                  ? "Excel (.xlsx)"
                  : options.format === "pdf"
                    ? "PDF"
                    : "CSV"}
              </p>
            </div>
            <div>
              <p className="text-sm text-green-800">Rapports</p>
              <p className="text-lg font-semibold text-green-900">
                {selectedRapportsCount} rapport
                {selectedRapportsCount !== 1 ? "s" : ""}
              </p>
            </div>
            <div>
              <p className="text-sm text-green-800">Période</p>
              <p className="text-lg font-semibold text-green-900">
                {options.periode}
              </p>
            </div>
            <div>
              <p className="text-sm text-green-800">Filtres appliqués</p>
              <p className="text-lg font-semibold text-green-900">
                {options.formation !== "Tous" || options.formateur !== "Tous"
                  ? "Oui"
                  : "Non"}
              </p>
            </div>
          </div>

          <button
            onClick={handleExport}
            disabled={isExportDisabled || exporting}
            className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all ${
              isExportDisabled || exporting
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700 active:scale-95"
            }`}
          >
            {exporting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block animate-spin">⏳</span>
                Génération du rapport...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <span>📥</span>
                Exporter le rapport
              </span>
            )}
          </button>

          {isExportDisabled && (
            <p className="mt-2 text-sm text-red-600 text-center">
              ⚠️ Veuillez sélectionner au moins un rapport
            </p>
          )}
        </section>

        {/* ── Info ── */}
        <section className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            ℹ️ Informations utiles
          </h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>
              • <span className="font-medium">PDF</span> : Format idéal pour
              l'impression et le partage
            </li>
            <li>
              • <span className="font-medium">Excel</span> : Pour analyser les
              données avec formules et graphiques
            </li>
            <li>
              • <span className="font-medium">CSV</span> : Compatible avec tous
              les outils d'analyse
            </li>
            <li>
              • Les données exportées reflètent vos vraies données en base
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
