// app/admin/import/state.ts

export type Step =
  | "config"
  | "upload"
  | "progress"
  | "mapping"
  | "validation"
  | "preview"
  | "done";

// ─── Type des fields reçus depuis GET /import/entities ───────────────────────
// ✅ boolean ajouté pour correspondre au back (schema-generator.ts)
export interface FieldSchema {
  key: string;
  label: string;
  required: boolean;
  type: "string" | "number" | "email" | "date" | "time" | "enum" | "boolean";
  enumValues?: string[];
}

export interface ImportState {
  step: Step;
  file: File | null;

  parsedData: any[];
  mapping: Record<string, string>;

  mappedData: any[];
  validData: any[];
  invalidData: any[];

  progress: number;
  totalRows: number;
  currentRow: number;

  importType: string;
  duplicateStrategy: "ignore" | "update" | "error";
  relationStrategy: "create" | "ignore" | "error";

  entityFields: FieldSchema[];
  importResult: {
    totalRows: number;
    importedRows: number;
    errorCount: number;
  } | null;
}

export type ImportAction =
  | { type: "SET_STEP"; payload: Step }
  | {
      type: "UPDATE_CONFIG";
      payload: Partial<
        Pick<
          ImportState,
          "importType" | "duplicateStrategy" | "relationStrategy"
        >
      >;
    }
  | { type: "SET_ENTITY_FIELDS"; payload: FieldSchema[] }
  | { type: "SET_FILE"; payload: { file: File; parsedData: any[] } }
  | {
      type: "SET_PROGRESS";
      payload: { progress: number; currentRow?: number; totalRows?: number };
    }
  | { type: "UPDATE_MAPPING"; payload: Record<string, string> }
  | { type: "SET_MAPPED_DATA"; payload: any[] } // legacy — change step vers validation
  | { type: "SET_MAPPED_DATA_ONLY"; payload: any[] } // ✅ nouveau — stocke SANS changer de step
  | {
      type: "SET_VALIDATION_RESULT";
      payload: { validData: any[]; invalidData: any[] };
    }
  | {
      type: "SET_IMPORT_RESULT";
      payload: { totalRows: number; importedRows: number; errorCount: number };
    }
  | { type: "RESET" };

export const initialState: ImportState = {
  step: "config",
  file: null,
  parsedData: [],
  mapping: {},
  mappedData: [],
  validData: [],
  invalidData: [],
  progress: 0,
  totalRows: 0,
  currentRow: 0,
  importType: "", // vide — rempli au chargement des entités depuis le back
  duplicateStrategy: "ignore",
  relationStrategy: "create",
  entityFields: [],
  importResult: null,
};

export function importReducer(
  state: ImportState,
  action: ImportAction,
): ImportState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, step: action.payload };

    case "UPDATE_CONFIG":
      return { ...state, ...action.payload };

    case "SET_ENTITY_FIELDS":
      return { ...state, entityFields: action.payload };

    case "SET_FILE":
      return {
        ...state,
        file: action.payload.file,
        parsedData: action.payload.parsedData,
        step: "mapping",
        progress: 0,
        mapping: {},
        mappedData: [],
        validData: [],
        invalidData: [],
      };

    case "SET_PROGRESS":
      return {
        ...state,
        progress: action.payload.progress,
        currentRow: action.payload.currentRow ?? state.currentRow,
        totalRows: action.payload.totalRows ?? state.totalRows,
      };

    case "UPDATE_MAPPING":
      return { ...state, mapping: action.payload };

    // Legacy : stocke les données ET change le step (gardé pour compatibilité)
    case "SET_MAPPED_DATA":
      return { ...state, mappedData: action.payload, step: "validation" };

    // ✅ FIX : stocke les données transformées SANS changer de step.
    // StepMapping dispatche d'abord ceci, puis SET_STEP dans un setTimeout(0).
    // Ça garantit que React flush mappedData dans le state AVANT que
    // StepValidation monte et que son useEffect se lance.
    case "SET_MAPPED_DATA_ONLY":
      return { ...state, mappedData: action.payload };

    case "SET_VALIDATION_RESULT":
      return {
        ...state,
        validData: action.payload.validData,
        invalidData: action.payload.invalidData,
         step: "preview",
      };

    case "SET_IMPORT_RESULT":
      return {
        ...state,
        importResult: action.payload,
        step: "done",
      };

    case "RESET":
      return initialState;

    default:
      return state;
  }
}
