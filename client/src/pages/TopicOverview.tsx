import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, FileText, Podcast, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Topic } from "@shared/schema";

export default function TopicOverview() {
  const { topicId } = useParams<{ topicId: string }>();
  
  const { data: topic, isLoading, error } = useQuery<Topic>({
    queryKey: ["/api/topics", topicId],
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Topic not found</p>
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const textCount = topic.texts?.length || 0;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto py-12 px-6 sm:px-8">
        <div className="space-y-2 mb-8">
          <div className="flex items-center gap-3 text-muted-foreground text-sm">
            <BookOpen className="h-4 w-4" />
            <span>Topic</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-foreground">
            {topic.title}
          </h1>
          <p className="text-lg text-muted-foreground">
            {textCount} {textCount === 1 ? "text" : "texts"} available
          </p>
        </div>

        <Card className="p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg text-primary shrink-0">
              <Podcast className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-foreground mb-1">Topic Podcast Feed</h3>
              <p className="text-muted-foreground text-sm mb-3">
                Subscribe to this topic in your favorite podcast app to listen on the go.
              </p>
              <a 
                href={`/podcast/topic/${topicId}/feed.xml`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                data-testid="link-topic-podcast-feed"
              >
                <span>Open RSS Feed</span>
                <ArrowRight className="h-3 w-3" />
              </a>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Texts in this topic</h2>
          
          {textCount === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No texts available in this topic yet.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {topic.texts.map((text, index) => (
                <Link key={text.id} href={`/topic/${topicId}/text/${text.id}`}>
                  <Card 
                    className="p-4 hover-elevate cursor-pointer transition-colors"
                    data-testid={`card-text-${text.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground text-sm font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-medium text-foreground truncate">{text.title}</span>
                        </div>
                        {text.content && text.content.length > 0 && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                            {text.content[0]}
                          </p>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="mt-12 p-6 bg-muted/50 rounded-lg text-center">
          <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            Select a text above to start reading and learning.
          </p>
        </div>
      </div>
    </div>
  );
}
