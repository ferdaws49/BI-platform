export type Step =
  | "config"
  | "upload"
  | "progress"
  | "mapping"
  | "validation"
  | "preview"
  | "done";

export interface ImportState {
  step: Step;
  file: File | null;

  parsedData: any[]; // Raw data from CSV/Excel
  mapping: Record<string, string>; // CSV/Excel column → DB field

  mappedData: any[]; // Data after mapping (keys are DB fields)
  validData: any[]; // Successfully validated rows
  invalidData: any[]; // Rows that failed validation with error messages

  progress: number;
  totalRows: number;
  currentRow: number;

  importType: "users" | "apprenant" | "formation" | "finance" | "sessions";
  duplicateStrategy: "ignore" | "update" | "error";
  relationStrategy: "create" | "ignore" | "error";
}

export type ImportAction =
  | { type: "SET_STEP"; payload: Step }
  | { type: "UPDATE_CONFIG"; payload: Partial<Pick<ImportState, "importType" | "duplicateStrategy" | "relationStrategy">> }
  | { type: "SET_FILE"; payload: { file: File; parsedData: any[] } }
  | { type: "SET_PROGRESS"; payload: { progress: number; currentRow?: number; totalRows?: number } }
  | { type: "UPDATE_MAPPING"; payload: Record<string, string> }
  | { type: "SET_MAPPED_DATA"; payload: any[] }
  | { type: "SET_VALIDATION_RESULT"; payload: { validData: any[]; invalidData: any[] } }
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
  importType: "users",
  duplicateStrategy: "ignore",
  relationStrategy: "create",
};

export function importReducer(state: ImportState, action: ImportAction): ImportState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, step: action.payload };
    case "UPDATE_CONFIG":
      return { ...state, ...action.payload };
    case "SET_FILE":
      return {
        ...state,
        file: action.payload.file,
        parsedData: action.payload.parsedData,
        step: "mapping", // Skip progress for now as we'll do parsing in upload or separate
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
        totalRows: action.payload.totalRows ?? state.totalRows
      };
    case "UPDATE_MAPPING":
      return { ...state, mapping: action.payload };
    case "SET_MAPPED_DATA":
      return { ...state, mappedData: action.payload, step: "validation" };
    case "SET_VALIDATION_RESULT":
      return {
        ...state,
        validData: action.payload.validData,
        invalidData: action.payload.invalidData,
        step: "preview",
      };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}
