"use client";

export default function StepProgress({
  total,
  current,
}: {
  total: number;
  current: number;
}) {
  // Évite division par zéro si total = 0
  const percent =
    total > 0 ? Math.min(Math.round((current / total) * 100), 100) : 0;

  return (
    <div className="py-12 flex flex-col items-center justify-center space-y-6">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-r-transparent" />

      <div className="text-center space-y-1">
        <h2 className="text-xl font-semibold">Import en cours...</h2>
        <p className="text-sm text-muted-foreground">
          Veuillez patienter pendant l'insertion des données.
        </p>
      </div>

      {/* Barre de progression */}
      <div className="w-full max-w-md space-y-2">
        <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${percent}%` }} // width dynamique — style inline nécessaire ici
          />
        </div>

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{current} lignes traitées</span>
          <span className="font-medium text-foreground">{percent}%</span>
          <span>{total} total</span>
        </div>
      </div>
    </div>
  );
}
