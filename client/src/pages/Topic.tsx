import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Topic } from "@shared/schema";
import { BookOpen, FileText, Podcast } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function TopicPage() {
  const { topicId } = useParams<{ topicId: string }>();
  
  const { data: topic, isLoading, error } = useQuery<Topic>({
    queryKey: ["/api/topics", topicId],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-destructive">Topic not found</div>
      </div>
    );
  }

  const textCount = topic.texts?.length || 0;

  return (
    <div className="max-w-2xl mx-auto py-12 px-6 sm:px-8">
      <div className="space-y-3 mb-8 text-center">
        <div className="flex justify-center">
          <div className="p-4 bg-primary/10 rounded-xl">
            <BookOpen className="h-10 w-10 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-foreground">
          {topic.title}
        </h1>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="text-foreground">
                {textCount} {textCount === 1 ? "text" : "texts"}
              </span>
            </div>
            <a 
              href={`/podcast/topic/${topicId}/feed.xml`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" data-testid="button-topic-podcast">
                <Podcast className="h-4 w-4 mr-2" />
                Podcast Feed
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>

      <div className="bg-muted/50 border rounded-lg p-4 text-center">
        <p className="text-muted-foreground">
          Select a text from the sidebar to start reading.
        </p>
      </div>
    </div>
  );
}
