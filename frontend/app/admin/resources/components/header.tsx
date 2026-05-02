"use client";

import { Plus } from "lucide-react";
import { ResourcesState } from "../state";
import { Button } from "./ui";

export function Header() {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 mt-5 slideInRight">
      <div>
        <h1 className="text-xl font-bold text-foreground">
          Gestion des ressources
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Formations & Formateurs
        </p>
      </div>
    </div>
  );
}
