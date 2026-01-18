import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  BookOpen, 
  Library, 
  Menu, 
  ChevronRight,
  ChevronDown,
  FileText
} from "lucide-react";
import { useTopics } from "@/hooks/use-content";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export function SidebarNav() {
  const { data: topics, isLoading } = useTopics();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  const currentTopicId = location.startsWith("/topic/") 
    ? location.split("/")[2] 
    : null;

  const toggleTopic = (topicId: string) => {
    setExpandedTopics(prev => {
      const newSet = new Set(prev);
      if (newSet.has(topicId)) {
        newSet.delete(topicId);
      } else {
        newSet.add(topicId);
      }
      return newSet;
    });
  };

  const NavContent = () => (
    <div className="space-y-6 py-6">
      <div className="px-4">
        <Link href="/" className="flex items-center gap-2 font-serif text-2xl font-semibold text-primary">
          <Library className="h-6 w-6" />
          <span>LinguaRead</span>
        </Link>
        <p className="mt-2 text-sm text-muted-foreground">
          German-Russian Learning Reader
        </p>
      </div>

      <div className="px-2">
        <h3 className="px-2 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Library
        </h3>
        
        {isLoading ? (
          <div className="space-y-2 px-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 bg-muted/50 rounded-md animate-pulse" />
            ))}
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="space-y-1 px-1">
              {topics?.map((topic) => {
                const isActive = currentTopicId === topic.id;
                const isExpanded = expandedTopics.has(topic.id) || isActive;
                const hasMultipleTexts = topic.texts && topic.texts.length > 1;

                return (
                  <Collapsible 
                    key={topic.id} 
                    open={isExpanded}
                    onOpenChange={() => toggleTopic(topic.id)}
                  >
                    <div className="flex items-center">
                      <Link href={`/topic/${topic.id}`} className="flex-1">
                        <div 
                          className={`
                            group flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors cursor-pointer
                            ${isActive 
                              ? "bg-primary text-primary-foreground font-medium" 
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            }
                          `}
                          data-testid={`topic-${topic.id}`}
                        >
                          <BookOpen className={`h-4 w-4 shrink-0 ${isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"}`} />
                          <span className="truncate flex-1">{topic.title}</span>
                          {hasMultipleTexts && (
                            <span className={`text-xs ${isActive ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                              {topic.texts.length}
                            </span>
                          )}
                        </div>
                      </Link>
                      {hasMultipleTexts && (
                        <CollapsibleTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 shrink-0"
                            data-testid={`expand-${topic.id}`}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      )}
                    </div>
                    
                    {hasMultipleTexts && (
                      <CollapsibleContent>
                        <div className="ml-6 pl-3 border-l border-border space-y-1 py-1">
                          {topic.texts.map((text) => (
                            <Link key={text.id} href={`/topic/${topic.id}`}>
                              <div 
                                className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer transition-colors"
                                data-testid={`text-${text.id}`}
                              >
                                <FileText className="h-3 w-3 shrink-0" />
                                <span className="truncate">{text.title}</span>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </CollapsibleContent>
                    )}
                  </Collapsible>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden md:block w-72 border-r bg-card h-screen sticky top-0">
        <NavContent />
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b p-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-serif text-xl font-semibold">
          <Library className="h-5 w-5" />
          <span>LinguaRead</span>
        </Link>
        
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" data-testid="button-mobile-menu">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <NavContent />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
