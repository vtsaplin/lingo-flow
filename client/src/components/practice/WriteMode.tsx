import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Check, RotateCcw, CheckCircle2, XCircle } from "lucide-react";

interface WriteModeProps {
  paragraphs: string[];
}

interface GapInfo {
  id: number;
  original: string;
  hint: string;
}

interface TemplateItem {
  type: "text" | "gap";
  content?: string;
  gapId?: number;
}

interface ParagraphData {
  template: TemplateItem[];
}

interface GapLookup {
  [gapId: number]: GapInfo;
}

type ValidationState = "idle" | "correct" | "incorrect";

export function WriteMode({ paragraphs }: WriteModeProps) {
  const { paragraphData, gapLookup } = useMemo(() => generateWriteGaps(paragraphs), [paragraphs]);
  
  const [inputs, setInputs] = useState<Record<number, string>>({});
  const [validationState, setValidationState] = useState<ValidationState>("idle");
  const [incorrectGaps, setIncorrectGaps] = useState<Set<number>>(new Set());

  const totalGaps = Object.keys(gapLookup).length;

  if (totalGaps === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center px-6 py-12">
        <p className="text-muted-foreground">No gaps could be generated from this text.</p>
      </div>
    );
  }

  const handleInputChange = (gapId: number, value: string) => {
    setInputs(prev => ({ ...prev, [gapId]: value }));
    setValidationState("idle");
    setIncorrectGaps(prev => {
      const next = new Set(prev);
      next.delete(gapId);
      return next;
    });
  };

  const handleCheck = () => {
    let allCorrect = true;
    const newIncorrect = new Set<number>();
    
    for (const gapId of Object.keys(gapLookup).map(Number)) {
      const gap = gapLookup[gapId];
      const userInput = (inputs[gapId] || "").trim().toLowerCase();
      const expected = gap.original.toLowerCase();
      if (userInput !== expected) {
        allCorrect = false;
        newIncorrect.add(gapId);
      }
    }
    
    setIncorrectGaps(newIncorrect);
    setValidationState(allCorrect ? "correct" : "incorrect");
  };

  const handleReset = () => {
    setInputs({});
    setValidationState("idle");
    setIncorrectGaps(new Set());
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto px-6 sm:px-8 py-6">
        <div className="max-w-3xl mx-auto">
          <div className="space-y-6 font-serif text-lg leading-relaxed text-foreground/90">
            {paragraphData.map((para, pIdx) => (
              <p key={pIdx} className="leading-loose">
                {para.template.map((item, tIdx) => {
                  if (item.type === "text") {
                    return <span key={tIdx}>{item.content}</span>;
                  }
                  const gapId = item.gapId!;
                  const gap = gapLookup[gapId];
                  const isIncorrect = incorrectGaps.has(gapId);
                  const isCorrect = validationState === "correct";
                  
                  return (
                    <span key={tIdx} className="inline-flex items-center mx-1">
                      <input
                        type="text"
                        value={inputs[gapId] || ""}
                        onChange={(e) => handleInputChange(gapId, e.target.value)}
                        placeholder={gap?.hint || "___"}
                        data-testid={`input-gap-${gapId}`}
                        className={`inline-block w-28 px-2 py-1 text-center border-b-2 bg-transparent outline-none transition-colors font-serif text-base ${
                          isIncorrect
                            ? "border-destructive text-destructive"
                            : isCorrect
                              ? "border-green-500 text-green-600 dark:text-green-400"
                              : "border-muted-foreground/50 focus:border-primary"
                        }`}
                      />
                    </span>
                  );
                })}
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t bg-card px-6 sm:px-8 py-4">
        <div className="max-w-3xl mx-auto">
          {validationState === "correct" && (
            <div className="flex items-center gap-2 mb-4 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">All correct!</span>
            </div>
          )}
          {validationState === "incorrect" && (
            <div className="flex items-center gap-2 mb-4 text-destructive">
              <XCircle className="h-5 w-5" />
              <span className="font-medium">Some answers are incorrect. Try again!</span>
            </div>
          )}
          
          <div className="flex gap-2">
            <Button onClick={handleCheck} data-testid="button-check">
              <Check className="h-4 w-4 mr-2" />
              Check
            </Button>
            <Button variant="outline" onClick={handleReset} data-testid="button-reset">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function generateWriteGaps(paragraphs: string[]): { 
  paragraphData: ParagraphData[]; 
  gapLookup: GapLookup;
} {
  let gapIdCounter = 0;
  const gapLookup: GapLookup = {};
  
  const paragraphData = paragraphs.map(para => {
    const words = para.split(/(\s+)/);
    const contentWords: { word: string; index: number }[] = [];
    
    words.forEach((w, i) => {
      if (w.trim() && /[a-zA-ZäöüÄÖÜß]/.test(w)) {
        contentWords.push({ word: w, index: i });
      }
    });
    
    if (contentWords.length === 0) {
      return { template: [{ type: "text" as const, content: para }] };
    }
    
    const gapCount = Math.max(1, Math.floor(contentWords.length * 0.25));
    const gapIndices = new Set<number>();
    
    while (gapIndices.size < Math.min(gapCount, contentWords.length)) {
      const idx = Math.floor(Math.random() * contentWords.length);
      gapIndices.add(idx);
    }
    
    const template: TemplateItem[] = [];
    let currentText = "";
    
    words.forEach((w, i) => {
      const contentIdx = contentWords.findIndex(cw => cw.index === i);
      if (contentIdx !== -1 && gapIndices.has(contentIdx)) {
        if (currentText) {
          template.push({ type: "text", content: currentText });
          currentText = "";
        }
        const cleanWord = w.replace(/[.,!?;:«»„"'"]/g, "").trim();
        const hint = cleanWord.charAt(0) + "_".repeat(Math.max(1, cleanWord.length - 1));
        const gapId = gapIdCounter++;
        gapLookup[gapId] = { id: gapId, original: cleanWord, hint };
        template.push({ type: "gap", gapId });
        const punctuation = w.match(/[.,!?;:«»„"'"]+$/)?.[0] || "";
        if (punctuation) {
          template.push({ type: "text", content: punctuation });
        }
      } else {
        currentText += w;
      }
    });
    
    if (currentText) {
      template.push({ type: "text", content: currentText });
    }
    
    return { template };
  });
  
  return { paragraphData, gapLookup };
}
