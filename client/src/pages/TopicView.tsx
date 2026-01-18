import { useState } from "react";
import { useRoute } from "wouter";
import { Loader2, ArrowLeft, FileText, ChevronRight } from "lucide-react";
import { useTopic } from "@/hooks/use-content";
import { Reader } from "@/components/Reader";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function TopicView() {
  const [match, params] = useRoute("/topic/:id");
  const topicId = params?.id || "";
  const [activeTextId, setActiveTextId] = useState<string | null>(null);
  
  const { data: topic, isLoading, error } = useTopic(topicId);

  if (isLoading) {
    return (
      <div className="h-[50vh] flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground animate-pulse">Loading text...</p>
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div className="h-[50vh] flex flex-col items-center justify-center px-4 text-center">
        <div className="bg-destructive/10 p-4 rounded-full mb-4">
          <FileText className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-2xl font-serif font-bold mb-2">Topic not found</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          The topic you are looking for might have been moved or deleted.
        </p>
        <Link href="/">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Library
          </Button>
        </Link>
      </div>
    );
  }

  if (!topic.texts || topic.texts.length === 0) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-6">
        <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed">
          <p className="text-muted-foreground">This topic is empty.</p>
        </div>
      </div>
    );
  }

  const selectedTextId = activeTextId || topic.texts[0].id;
  const activeText = topic.texts.find(t => t.id === selectedTextId) || topic.texts[0];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="max-w-4xl mx-auto px-6 sm:px-8 pt-8">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-2 -ml-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">
            {topic.title}
          </h1>
          {topic.description && (
            <p className="text-muted-foreground mt-2">{topic.description}</p>
          )}
        </div>

        {topic.texts.length > 1 && (
          <div className="mb-8">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Тексты в этой теме ({topic.texts.length})
            </h2>
            <ScrollArea className="w-full">
              <div className="flex gap-2 pb-2">
                {topic.texts.map((text) => (
                  <button
                    key={text.id}
                    onClick={() => setActiveTextId(text.id)}
                    data-testid={`text-tab-${text.id}`}
                    className={`
                      shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all
                      ${selectedTextId === text.id 
                        ? "bg-primary text-primary-foreground shadow-sm" 
                        : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                      }
                    `}
                  >
                    {text.title}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      <Reader 
        title={activeText.title} 
        paragraphs={activeText.content} 
      />
    </div>
  );
}
