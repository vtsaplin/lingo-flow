import { useState, useEffect, useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "lingoflow-practice-progress";

export interface TextProgress {
  fill: boolean;
  order: boolean;
  write: boolean;
}

interface ProgressStore {
  [key: string]: TextProgress;
}

let progressState: ProgressStore = loadFromStorage();
const listeners = new Set<() => void>();

function loadFromStorage(): ProgressStore {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {}
  return {};
}

function saveToStorage(progress: ProgressStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {}
}

function notifyListeners() {
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): ProgressStore {
  return progressState;
}

function setModeCompleteInternal(topicId: string, textId: string, mode: "fill" | "order" | "write") {
  const key = `${topicId}-${textId}`;
  const current = progressState[key] || { fill: false, order: false, write: false };
  if (current[mode]) return;
  
  progressState = {
    ...progressState,
    [key]: { ...current, [mode]: true }
  };
  saveToStorage(progressState);
  notifyListeners();
}

function resetTextProgressInternal(topicId: string, textId: string) {
  const key = `${topicId}-${textId}`;
  const { [key]: _, ...rest } = progressState;
  progressState = rest;
  saveToStorage(progressState);
  notifyListeners();
}

export function usePracticeProgress() {
  const progress = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const getTextProgress = useCallback((topicId: string, textId: string): TextProgress => {
    const key = `${topicId}-${textId}`;
    return progress[key] || { fill: false, order: false, write: false };
  }, [progress]);

  const setModeComplete = useCallback((topicId: string, textId: string, mode: "fill" | "order" | "write") => {
    setModeCompleteInternal(topicId, textId, mode);
  }, []);

  const resetTextProgress = useCallback((topicId: string, textId: string) => {
    resetTextProgressInternal(topicId, textId);
  }, []);

  const getCompletionCount = useCallback((topicId: string, textId: string): number => {
    const p = getTextProgress(topicId, textId);
    return (p.fill ? 1 : 0) + (p.order ? 1 : 0) + (p.write ? 1 : 0);
  }, [getTextProgress]);

  const isTextComplete = useCallback((topicId: string, textId: string): boolean => {
    const p = getTextProgress(topicId, textId);
    return p.fill && p.order && p.write;
  }, [getTextProgress]);

  const getCompletionPercentage = useCallback((topicId: string, textId: string): number => {
    return Math.round((getCompletionCount(topicId, textId) / 3) * 100);
  }, [getCompletionCount]);

  return {
    getTextProgress,
    setModeComplete,
    resetTextProgress,
    getCompletionCount,
    isTextComplete,
    getCompletionPercentage
  };
}
