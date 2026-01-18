import { useState, useRef } from "react";
import { Volume2, Languages, Book, Loader2, PlayCircle, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useTTS, useTranslate, useDictionary } from "@/hooks/use-services";

type Mode = "word" | "sentence";

interface ReaderProps {
  title: string;
  paragraphs: string[];
}

export function Reader({ title, paragraphs }: ReaderProps) {
  const [mode, setMode] = useState<Mode>("sentence");
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [isReadingAll, setIsReadingAll] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const ttsMutation = useTTS();
  const translateMutation = useTranslate();
  const dictionaryMutation = useDictionary();

  const playAudio = async (text: string) => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      const blob = await ttsMutation.mutateAsync({ text });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.play();
      return audio;
    } catch (err) {
      console.error("Failed to play audio", err);
      return null;
    }
  };

  const handleInteraction = async (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedText(text);
    
    translateMutation.reset();
    dictionaryMutation.reset();
    
    playAudio(text);
    
    if (mode === "word") {
      dictionaryMutation.mutate({ word: text });
    } else {
      translateMutation.mutate({ text });
    }
  };

  const handleReadAll = async () => {
    if (isReadingAll) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsReadingAll(false);
      return;
    }

    setIsReadingAll(true);
    const fullText = paragraphs.join(" ");
    
    try {
      const audio = await playAudio(fullText);
      if (audio) {
        audio.onended = () => {
          setIsReadingAll(false);
        };
      }
    } catch (err) {
      setIsReadingAll(false);
    }
  };

  const closePanel = () => {
    setSelectedText(null);
    translateMutation.reset();
    dictionaryMutation.reset();
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-6 sm:px-8">
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-3xl sm:text-4xl font-serif font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          
          <div className="flex bg-muted p-1 rounded-lg">
            <button
              onClick={() => setMode("word")}
              data-testid="mode-word"
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                mode === "word" 
                  ? "bg-background shadow-sm text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Word
            </button>
            <button
              onClick={() => setMode("sentence")}
              data-testid="mode-sentence"
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                mode === "sentence" 
                  ? "bg-background shadow-sm text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sentence
            </button>
          </div>
        </div>

        <Button 
          variant="outline" 
          onClick={handleReadAll}
          disabled={ttsMutation.isPending && isReadingAll}
          data-testid="button-read-all"
          className="self-start"
        >
          {isReadingAll ? (
            <>
              <StopCircle className="h-4 w-4 mr-2" />
              Остановить
            </>
          ) : (
            <>
              <PlayCircle className="h-4 w-4 mr-2" />
              Прочитать весь текст
            </>
          )}
        </Button>
      </div>

      <div className="space-y-6 font-serif prose-text text-foreground/90 text-lg leading-relaxed">
        {paragraphs.map((para, i) => (
          <Paragraph 
            key={i} 
            text={para} 
            mode={mode} 
            onInteract={handleInteraction}
            selectedText={selectedText}
          />
        ))}
      </div>

      {selectedText && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-card border shadow-xl rounded-xl p-4 w-80 sm:w-96 max-h-[60vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                {ttsMutation.isPending && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                <h3 className="font-serif text-lg font-medium leading-tight line-clamp-2 pr-2">
                  "{selectedText}"
                </h3>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 -mr-2 -mt-2 text-muted-foreground shrink-0"
                onClick={closePanel}
                data-testid="button-close-panel"
              >
                &times;
              </Button>
            </div>

            <div className="flex gap-2 mb-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => playAudio(selectedText)}
                disabled={ttsMutation.isPending}
                data-testid="button-listen"
                className="flex-1"
              >
                {ttsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4 mr-2" />}
                Listen
              </Button>
            </div>

            <Separator className="my-3" />

            <div className="min-h-[60px]">
              {(translateMutation.isPending || dictionaryMutation.isPending) && (
                <div className="flex items-center justify-center py-4 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span>{mode === "word" ? "Загрузка словаря..." : "Перевод..."}</span>
                </div>
              )}

              {translateMutation.isSuccess && (
                <div className="animate-in fade-in">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Перевод</p>
                  <p className="text-base text-foreground font-medium">
                    {translateMutation.data.translation}
                  </p>
                </div>
              )}

              {dictionaryMutation.isSuccess && (
                <div className="space-y-3 animate-in fade-in">
                  <div>
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <p className="text-lg font-bold">{dictionaryMutation.data.word}</p>
                      {dictionaryMutation.data.partOfSpeech && (
                        <span className="text-xs text-muted-foreground italic">{dictionaryMutation.data.partOfSpeech}</span>
                      )}
                    </div>
                    <p className="text-foreground mt-1 font-medium">{dictionaryMutation.data.translation}</p>
                  </div>
                  
                  {dictionaryMutation.data.definition && (
                    <div className="bg-muted/30 p-2 rounded text-sm">
                      {dictionaryMutation.data.definition}
                    </div>
                  )}

                  {(dictionaryMutation.data.example_de || dictionaryMutation.data.example_ru) && (
                    <div className="text-sm space-y-1 pt-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Пример</p>
                      {dictionaryMutation.data.example_de && <p className="italic text-muted-foreground">"{dictionaryMutation.data.example_de}"</p>}
                      {dictionaryMutation.data.example_ru && <p>"{dictionaryMutation.data.example_ru}"</p>}
                    </div>
                  )}
                </div>
              )}
              
              {translateMutation.isError && (
                <p className="text-sm text-destructive">Ошибка перевода. Попробуйте ещё раз.</p>
              )}
              {dictionaryMutation.isError && (
                <p className="text-sm text-destructive">Не удалось найти определение.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Paragraph({ 
  text, 
  mode, 
  onInteract, 
  selectedText 
}: { 
  text: string, 
  mode: Mode, 
  onInteract: (t: string, e: React.MouseEvent) => void,
  selectedText: string | null
}) {
  if (mode === "sentence") {
    const sentences = text.match(/[^.!?]+[.!?]+["']?|[^.!?]+$/g) || [text];
    return (
      <p>
        {sentences.map((sentence, idx) => (
          <span 
            key={idx}
            onClick={(e) => onInteract(sentence.trim(), e)}
            data-testid={`sentence-${idx}`}
            className={`reader-highlight px-1 mx-[-2px] py-0.5 rounded cursor-pointer ${selectedText === sentence.trim() ? 'active' : ''}`}
          >
            {sentence}
          </span>
        ))}
      </p>
    );
  }

  const words = text.split(/(\s+)/);
  return (
    <p>
      {words.map((word, idx) => {
        if (word.trim().length === 0) return <span key={idx}>{word}</span>;
        
        const cleanWord = word.replace(/[.,/#!$%^&*;:{}=\-_`~()«»„"]/g, "");
        if (!cleanWord) return <span key={idx}>{word}</span>;

        return (
          <span 
            key={idx}
            onClick={(e) => onInteract(cleanWord, e)}
            data-testid={`word-${idx}`}
            className={`reader-highlight px-0.5 py-0.5 rounded cursor-pointer ${selectedText === cleanWord ? 'active' : ''}`}
          >
            {word}
          </span>
        );
      })}
    </p>
  );
}
