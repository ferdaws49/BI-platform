"use client";

import { Dispatch, useEffect, useState } from "react";
import { Search, LayoutGrid, List } from "lucide-react";
import { ResourcesAction, ResourcesState } from "../state";
import { Input, SelectNative, Button, Card } from "./ui";

export function Toolbar({ state, dispatch }: { state: ResourcesState; dispatch: Dispatch<ResourcesAction> }) {
  const isFormation = state.activeTab === "formations";
  const [searchValue, setSearchValue] = useState(state.search);

  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch({ type: "SET_SEARCH", payload: searchValue });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue, dispatch]);

  useEffect(() => { setSearchValue(state.search); }, [state.search]);

  return (
    <Card className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6 py-4 px-5 slideInRight">
      {/* Search */}
      <div className="flex-1 w-full relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={`Rechercher ${isFormation ? "une formation" : "un formateur"}...`}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="pl-9 bg-background focus:bg-background"
        />
      </div>

      <div className="flex gap-3 w-full md:w-auto">
        {isFormation ? (
          <>
            {/* Filtre catégorie — dynamique depuis DB */}
            <SelectNative
              value={state.filters.formations.categorie || ""}
              onChange={(e) =>
                dispatch({
                  type: "SET_FILTER",
                  payload: { tab: "formations", key: "categorie", value: e.target.value || undefined },
                })
              }
              className="w-full md:w-44"
            >
              <option value="">Toutes catégories</option>
              {state.categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </SelectNative>

            {/* Filtre statut */}
            <SelectNative
              value={state.filters.formations.statut || ""}
              onChange={(e) =>
                dispatch({
                  type: "SET_FILTER",
                  payload: { tab: "formations", key: "statut", value: e.target.value || undefined },
                })
              }
              className="w-full md:w-36"
            >
              <option value="">Tous statuts</option>
              <option value="active">Active</option>
              <option value="completed">Terminée</option>
            </SelectNative>
          </>
        ) : (
          /* Filtre spécialité — dynamique depuis DB */
          <SelectNative
            value={state.filters.formateurs.specialite || ""}
            onChange={(e) =>
              dispatch({
                type: "SET_FILTER",
                payload: { tab: "formateurs", key: "specialite", value: e.target.value || undefined },
              })
            }
            className="w-full md:w-44"
          >
            <option value="">Toutes spécialités</option>
            {state.specialites.map((spec) => (
              <option key={spec} value={spec}>{spec}</option>
            ))}
          </SelectNative>
        )}

        {/* Toggle vue grid / table */}
        <div className="flex border border-border rounded-xl overflow-hidden bg-background">
          <Button
            variant={state.viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            className="rounded-none border-0 h-10 w-10 focus:ring-0"
            onClick={() => dispatch({ type: "SET_VIEW_MODE", payload: "grid" })}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <div className="w-[1px] bg-border my-2" />
          <Button
            variant={state.viewMode === "table" ? "secondary" : "ghost"}
            size="icon"
            className="rounded-none border-0 h-10 w-10 focus:ring-0"
            onClick={() => dispatch({ type: "SET_VIEW_MODE", payload: "table" })}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}