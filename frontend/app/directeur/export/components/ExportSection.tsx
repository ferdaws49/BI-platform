"use client";

import { useEffect, useState } from "react";

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

type ExportOptionsResponse = {
  formations?: string[];
  formateurs?: string[];
  periodes?: string[];
};

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
const EXPORT_OPTIONS_ENDPOINTS = [
  `${API}/directeur/export/options`,
  `${API}/export/options`,
] as const;
const EXPORT_ENDPOINTS = [`${API}/directeur/export`, `${API}/export`] as const;

const rapportsList = [
  {
    id: "strategique",
    nom: "Rapport strategique",
    description: "Analyse globale de la strategie de formation",
    icon: "📊",
  },
  {
    id: "financiere",
    nom: "Analyse financiere",
    description: "Details des revenus, couts et profits",
    icon: "💰",
  },
  {
    id: "performance",
    nom: "Performance des formations",
    description: "Taux de reussite, satisfaction et progression",
    icon: "📈",
  },
  {
    id: "qualite",
    nom: "Qualite pedagogique",
    description: "Evaluation des formateurs et contenus",
    icon: "⭐",
  },
] as const;

const fallbackFormations = [
  "Tous",
  "Data Science",
  "Web Dev",
  "UI/UX",
  "Java",
  "Data Engineering",
  "Marketing",
  "DevOps",
];

const fallbackFormateurs = [
  "Tous",
  "Amine",
  "Sara",
  "Mohamed",
  "Fatima",
  "Ali",
  "Nadia",
];

const fallbackPeriodes = [
  "7 derniers jours",
  "30 derniers jours",
  "3 derniers mois",
  "Annee actuelle",
  "Toutes les donnees",
];

async function fetchFirstAvailable(
  urls: readonly string[],
  init?: RequestInit,
): Promise<Response> {
  let lastError: unknown;

  for (const url of urls) {
    try {
      const response = await fetch(url, init);
      if (response.ok) {
        return response;
      }

      lastError = new Error(`HTTP ${response.status} on ${url}`);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Impossible de joindre le service d'export.");
}

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
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [formations, setFormations] = useState<string[]>(fallbackFormations);
  const [formateurs, setFormateurs] = useState<string[]>(fallbackFormateurs);
  const [periodes, setPeriodes] = useState<string[]>(fallbackPeriodes);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const token = localStorage.getItem("access_token");
        const response = await fetchFirstAvailable(EXPORT_OPTIONS_ENDPOINTS, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        const data: ExportOptionsResponse = await response.json();

        if (data.formations?.length) setFormations(data.formations);
        if (data.formateurs?.length) setFormateurs(data.formateurs);
        if (data.periodes?.length) setPeriodes(data.periodes);

        setOptionsError(null);
      } catch (error) {
        console.warn("Export options fallback enabled:", error);
        setOptionsError(
          "Options dynamiques indisponibles. Les valeurs par defaut sont utilisees.",
        );
      }
    };

    fetchOptions();
  }, []);

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

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    setExportSuccess(false);

    try {
      const token = localStorage.getItem("access_token");
      const selectedRapports = Object.entries(options.rapports)
        .filter(([, selected]) => selected)
        .map(([id]) => id);

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetchFirstAvailable(EXPORT_ENDPOINTS, {
        method: "POST",
        headers,
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

      const blob = await response.blob();
      const ext =
        options.format === "excel"
          ? "xlsx"
          : options.format === "pdf"
            ? "pdf"
            : "csv";
      const filename = `rapport_${new Date().toISOString().split("T")[0]}.${ext}`;

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
    } catch (error: unknown) {
      console.error("Export error:", error);
      setExportError(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue lors de l'export",
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
    <main className="mx-auto max-w-4xl p-4 md:p-6">
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          Export des rapports
        </h1>
        <p className="text-sm text-gray-600">
          Exportez vos donnees analytiques en differents formats.
        </p>
      </div>

      {optionsError ? (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">{optionsError}</p>
        </div>
      ) : null}

      {exportSuccess ? (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">✅</span>
            <div>
              <h3 className="font-semibold text-green-900">Export reussi</h3>
              <p className="text-sm text-green-800">
                Votre rapport a ete genere et telecharge avec succes.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {exportError ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">❌</span>
            <div>
              <h3 className="font-semibold text-red-900">Erreur d&apos;export</h3>
              <p className="text-sm text-red-800">{exportError}</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-6">
        <section className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            1. Selectionnez le format d&apos;export
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { id: "pdf", label: "PDF", icon: "📄", desc: "Document formate" },
              {
                id: "excel",
                label: "Excel",
                icon: "📊",
                desc: "Feuilles de calcul",
              },
              { id: "csv", label: "CSV", icon: "🧾", desc: "Texte delimite" },
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

        <section className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            2. Selectionnez les rapports a inclure
          </h2>
          <p className="mb-4 text-sm text-gray-600">
            {selectedRapportsCount} rapport
            {selectedRapportsCount !== 1 ? "s" : ""} selectionne
            {selectedRapportsCount !== 1 ? "s" : ""}
          </p>
          <div className="space-y-3">
            {rapportsList.map((rapport) => (
              <label
                key={rapport.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={
                    options.rapports[rapport.id as keyof typeof options.rapports]
                  }
                  onChange={() => handleRapportToggle(rapport.id)}
                  className="h-5 w-5 cursor-pointer rounded border-gray-300 text-green-600"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{rapport.icon}</span>
                    <h3 className="font-medium text-gray-900">{rapport.nom}</h3>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    {rapport.description}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            3. Options de filtrage
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-900">
                Periode
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
              <label className="mb-2 block text-sm font-medium text-gray-900">
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
              <label className="mb-2 block text-sm font-medium text-gray-900">
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

        <section className="rounded-lg border border-green-200 bg-green-50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-green-900">
            Resume de l&apos;export
          </h2>
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-green-800">Format</p>
              <p className="text-lg font-semibold capitalize text-green-900">
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
              <p className="text-sm text-green-800">Periode</p>
              <p className="text-lg font-semibold text-green-900">
                {options.periode}
              </p>
            </div>
            <div>
              <p className="text-sm text-green-800">Filtres appliques</p>
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
            className={`w-full rounded-lg px-4 py-3 font-semibold text-white transition-all ${
              isExportDisabled || exporting
                ? "cursor-not-allowed bg-gray-400"
                : "bg-green-600 hover:bg-green-700 active:scale-95"
            }`}
          >
            {exporting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block animate-spin">⏳</span>
                Generation du rapport...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <span>⬇️</span>
                Exporter le rapport
              </span>
            )}
          </button>

          {isExportDisabled ? (
            <p className="mt-2 text-center text-sm text-red-600">
              Veuillez selectionner au moins un rapport.
            </p>
          ) : null}
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">
            Informations utiles
          </h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>PDF: format ideal pour l&apos;impression et le partage.</li>
            <li>Excel: utile pour analyser les donnees en tableau.</li>
            <li>CSV: compatible avec la plupart des outils d&apos;analyse.</li>
            <li>Les donnees exportees refletent les donnees disponibles.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
