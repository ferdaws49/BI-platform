"use client";

import { useState, useCallback } from "react";

type Status = "idle" | "saving" | "success" | "error" | "mismatch";

interface UseFormStateOptions<T> {
  initialState: T;
  onSave: (data: T) => Promise<void>;
  onSuccess?: () => void;
  onError?: () => void;
}

export function useFormState<T extends Record<string, unknown>>({
  initialState,
  onSave,
  onSuccess,
  onError,
}: UseFormStateOptions<T>) {
  const [values, setValues] = useState<T>(initialState);
  const [status, setStatus] = useState<Status>("idle");

  const setValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleChange = useCallback(
    (field: keyof T, value: string) => {
      setValue(field, value as T[keyof T]);
    },
    [setValue]
  );

  const handleSave = useCallback(async () => {
    setStatus("saving");
    try {
      await onSave(values);
      setStatus("success");
      onSuccess?.();
    } catch {
      setStatus("error");
      onError?.();
    }
    setTimeout(() => setStatus("idle"), 3000);
  }, [values, onSave, onSuccess, onError]);

  const reset = useCallback(() => {
    setValues(initialState);
    setStatus("idle");
  }, [initialState]);

  return {
    values,
    setValue,
    handleChange,
    handleSave,
    status,
    isSaving: status === "saving",
    isSuccess: status === "success",
    isError: status === "error",
    reset,
  };
}