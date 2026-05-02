"use client";

import { useReducer } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { importReducer, initialState } from "./state";
import { Stepper } from "./components/Stepper";
import { StepConfig } from "./components/StepConfig";
import { StepUpload } from "./components/StepUpload";
import StepProgress from "./components/StepProgress";
import { StepMapping } from "./components/StepMapping";
import { StepValidation } from "./components/StepValidation";
import { StepPreview } from "./components/StepPreview";
import { StepDone } from "./components/StepDone";

export default function AdminImportPage() {
  const [state, dispatch] = useReducer(importReducer, initialState);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-4xl space-y-8 pb-12"
    >
      {/* Header section is handled by layout.tsx, this is the main container */}
      <Stepper currentStep={state.step} />

      <div className="rounded-2xl border bg-card text-card-foreground shadow-sm">
        <AnimatePresence mode="wait">
          <motion.div
            key={state.step}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.3 }}
            className="p-6 md:p-8"
          >
            {state.step === "config" && <StepConfig state={state} dispatch={dispatch} />}
            {state.step === "upload" && <StepUpload state={state} dispatch={dispatch} />}
            {state.step === "progress" && <StepProgress total={state.totalRows} current={state.currentRow} />}
            {state.step === "mapping" && <StepMapping state={state} dispatch={dispatch} />}
            {state.step === "validation" && <StepValidation state={state} dispatch={dispatch} />}
            {state.step === "preview" && <StepPreview state={state} dispatch={dispatch} />}
            {state.step === "done" && <StepDone dispatch={dispatch} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
