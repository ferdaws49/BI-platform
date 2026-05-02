"use client";

import { Dispatch } from "react";
import { BookOpen, User } from "lucide-react";
import { motion } from "framer-motion";
import { clsx } from "clsx";
import { ResourcesAction, ResourcesState } from "../state";

export function Tabs({ state, dispatch }: { state: ResourcesState, dispatch: Dispatch<ResourcesAction> }) {
  const tabs = [
    { id: "formations", label: `Formations (${state.formations.length})`, icon: BookOpen },
    { id: "formateurs", label: `Formateurs (${state.formateurs.length})`, icon: User },
  ] as const;

  return (
    <div className="flex gap-2 border-border slideInRight bg-muted/20 p-1 rounded-lg w-fit">
      {tabs.map((t) => {
        const isActive = state.activeTab === t.id;
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            onClick={() => dispatch({ type: "SET_TAB", payload: t.id })}
            className={clsx(
              "relative py-2 px-4 flex items-center gap-2 text-sm font-medium transition-colors outline-none rounded-md",
              isActive ? "text-primary bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
