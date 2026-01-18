export type ValidationState = "idle" | "correct" | "incorrect";

export interface FillModeState {
  placedWords: Record<number, string | null>;
  availableWords: string[];
  validationState: ValidationState;
  incorrectGaps: number[];
  initialized: boolean;
}

export interface OrderSentenceState {
  shuffledWords: string[];
  orderedWords: string[];
  validationState: ValidationState;
}

export interface OrderModeState {
  currentIndex: number;
  sentenceStates: Record<number, OrderSentenceState>;
  initialized: boolean;
}

export interface WriteModeState {
  inputs: Record<number, string>;
  validationState: ValidationState;
  incorrectGaps: number[];
  initialized: boolean;
}

export interface PracticeState {
  fill: FillModeState;
  order: OrderModeState;
  write: WriteModeState;
}

export function createInitialPracticeState(): PracticeState {
  return {
    fill: {
      placedWords: {},
      availableWords: [],
      validationState: "idle",
      incorrectGaps: [],
      initialized: false,
    },
    order: {
      currentIndex: 0,
      sentenceStates: {},
      initialized: false,
    },
    write: {
      inputs: {},
      validationState: "idle",
      incorrectGaps: [],
      initialized: false,
    },
  };
}
