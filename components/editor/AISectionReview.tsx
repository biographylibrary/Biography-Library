'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, CheckCircle2, XCircle, BookOpen, Wand2, BarChart3, AlertCircle } from 'lucide-react';
import { aiService, type Improvement } from '@/lib/ai/ai-provider';
import { useAuth } from '@/lib/auth-context';
import { addRevisionToHistory } from '@/lib/revision-history-service';
import { toast } from 'sonner';

interface AISectionReviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  biographyId: string;
  sectionKey: string;
  sectionTitle: string;
  content: string;
  language: string;
  onApplyChanges: (newContent: string, changeType: 'improvements' | 'rewrite') => void;
}

interface RewriteVersion {
  tone: 'narrative' | 'formal' | 'intimate';
  label: string;
  description: string;
  content: string;
  loading: boolean;
}

interface Statistics {
  wordCount: number;
  characterCount: number;
  sentenceCount: number;
  paragraphCount: number;
  avgWordsPerSentence: number;
  readabilityScore: number;
}

const IMPROVEMENT_ICONS = {
  clarity: '📖',
  detail: '✨',
  flow: '🔄',
  style: '🎨',
  structure: '🏗️',
};

export function AISectionReview({
  open,
  onOpenChange,
  biographyId,
  sectionKey,
  sectionTitle,
  content,
  language,
  onApplyChanges,
}: AISectionReviewProps) {
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState('suggestions');
  const [loading, setLoading] = useState(false);
  const [improvements, setImprovements] = useState<(Improvement & { id: string; ignored: boolean })[]>([]);
  const [selectedImprovements, setSelectedImprovements] = useState<Set<string>>(new Set());
  const [rewriteVersions, setRewriteVersions] = useState<RewriteVersion[]>([
    { tone: 'narrative', label: 'Narrative', description: 'Storytelling style with vivid descriptions', content: '', loading: false },
    { tone: 'formal', label: 'Formal', description: 'Polished and professional tone', content: '', loading: false },
    { tone: 'intimate', label: 'Intimate', description: 'Warm and personal, like a letter', content: '', loading: false },
  ]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (open) {
      loadSuggestions();
      calculateStatistics();
    }
  }, [open, content]);

  const loadSuggestions = async () => {
    if (!session?.access_token) return;

    setLoading(true);
    try {
      const results = await aiService.suggestImprovements(
        session.access_token,
        content,
        sectionTitle,
        language
      );
      const improvementsWithState = results.map((imp, idx) => ({
        ...imp,
        id: `imp-${Date.now()}-${idx}`,
        ignored: false,
      }));
      setImprovements(improvementsWithState);

      const highPriority = improvementsWithState
        .filter(imp => imp.priority === 'high')
        .map(imp => imp.id);
      setSelectedImprovements(new Set(highPriority));
    } catch (error) {
      console.error('Error loading suggestions:', error);
      toast.error('Failed to load AI suggestions');
    } finally {
      setLoading(false);
    }
  };

  const loadRewrite = async (tone: 'narrative' | 'formal' | 'intimate') => {
    if (!session?.access_token) return;

    setRewriteVersions(prev =>
      prev.map(v => v.tone === tone ? { ...v, loading: true } : v)
    );

    try {
      const rewritten = await aiService.rewriteSectionWithToken(
        session.access_token,
        sectionTitle,
        content,
        tone,
        language
      );

      setRewriteVersions(prev =>
        prev.map(v => v.tone === tone ? { ...v, content: rewritten, loading: false } : v)
      );
    } catch (error) {
      console.error('Error rewriting section:', error);
      toast.error(`Failed to generate ${tone} version`);
      setRewriteVersions(prev =>
        prev.map(v => v.tone === tone ? { ...v, loading: false } : v)
      );
    }
  };

  const calculateStatistics = () => {
    const text = content.trim();
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);

    const wordCount = words.length;
    const characterCount = text.length;
    const sentenceCount = sentences.length;
    const paragraphCount = paragraphs.length;
    const avgWordsPerSentence = sentenceCount > 0 ? wordCount / sentenceCount : 0;

    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / wordCount || 0;
    const readabilityScore = Math.max(0, Math.min(100, 100 - (avgWordsPerSentence * 2 + avgWordLength * 5)));

    setStatistics({
      wordCount,
      characterCount,
      sentenceCount,
      paragraphCount,
      avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
      readabilityScore: Math.round(readabilityScore),
    });
  };

  const toggleImprovement = (id: string) => {
    setSelectedImprovements(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const ignoreImprovement = (id: string) => {
    setImprovements(prev =>
      prev.map(imp => imp.id === id ? { ...imp, ignored: true } : imp)
    );
    setSelectedImprovements(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const applyImprovements = async () => {
    const selected = improvements.filter(imp => selectedImprovements.has(imp.id));
    if (selected.length === 0) {
      toast.error('No improvements selected');
      return;
    }

    setApplying(true);
    try {
      let updatedContent = content;

      for (const imp of selected) {
        updatedContent = updatedContent.replace(imp.original, imp.suggestion);
      }

      await addRevisionToHistory(
        biographyId,
        sectionKey,
        updatedContent,
        'ai_improvement',
        `Applied ${selected.length} AI improvements`,
        selected.length
      );

      onApplyChanges(updatedContent, 'improvements');
      toast.success(`Applied ${selected.length} improvements`);
      onOpenChange(false);
    } catch (error) {
      console.error('Error applying improvements:', error);
      toast.error('Failed to apply improvements');
    } finally {
      setApplying(false);
    }
  };

  const applyRewrite = async (tone: string, rewrittenContent: string) => {
    setApplying(true);
    try {
      await addRevisionToHistory(
        biographyId,
        sectionKey,
        rewrittenContent,
        'ai_rewrite',
        `Rewritten in ${tone} tone`
      );

      onApplyChanges(rewrittenContent, 'rewrite');
      toast.success(`Applied ${tone} rewrite`);
      onOpenChange(false);
    } catch (error) {
      console.error('Error applying rewrite:', error);
      toast.error('Failed to apply rewrite');
    } finally {
      setApplying(false);
    }
  };

  const groupedImprovements = improvements.reduce((acc, imp) => {
    if (!imp.ignored) {
      if (!acc[imp.type]) acc[imp.type] = [];
      acc[imp.type].push(imp);
    }
    return acc;
  }, {} as Record<string, typeof improvements>);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>AI Section Review: {sectionTitle}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="suggestions">
              <Wand2 className="h-4 w-4 mr-2" />
              Suggestions
            </TabsTrigger>
            <TabsTrigger value="rewrite">
              <BookOpen className="h-4 w-4 mr-2" />
              Full Rewrite
            </TabsTrigger>
            <TabsTrigger value="statistics">
              <BarChart3 className="h-4 w-4 mr-2" />
              Statistics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="suggestions" className="flex-1 min-h-0 mt-4">
            <ScrollArea className="h-[500px] pr-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Analyzing content...</span>
                </div>
              ) : improvements.filter(imp => !imp.ignored).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Looks Great!</h3>
                  <p className="text-muted-foreground">No improvements needed. Your content is well-written.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedImprovements).map(([type, imps]) => (
                    <div key={type}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-2xl">{IMPROVEMENT_ICONS[type as keyof typeof IMPROVEMENT_ICONS]}</span>
                        <h3 className="text-lg font-semibold capitalize">{type}</h3>
                        <Badge variant="outline">{imps.length}</Badge>
                      </div>
                      <div className="space-y-3">
                        {imps.map((imp) => (
                          <Card key={imp.id} className={selectedImprovements.has(imp.id) ? 'border-primary' : ''}>
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between gap-2">
                                <CardDescription className="flex-1">{imp.reason}</CardDescription>
                                <Badge variant={getPriorityColor(imp.priority)}>{imp.priority}</Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div>
                                <p className="text-sm text-muted-foreground mb-1">Original:</p>
                                <p className="text-sm bg-muted p-2 rounded italic">{imp.original}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground mb-1">Suggestion:</p>
                                <p className="text-sm bg-green-50 dark:bg-green-950/20 p-2 rounded font-medium">{imp.suggestion}</p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant={selectedImprovements.has(imp.id) ? 'default' : 'outline'}
                                  onClick={() => toggleImprovement(imp.id)}
                                >
                                  {selectedImprovements.has(imp.id) ? (
                                    <>
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Selected
                                    </>
                                  ) : (
                                    'Select'
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => ignoreImprovement(imp.id)}
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Ignore
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="rewrite" className="flex-1 min-h-0 mt-4">
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {rewriteVersions.map((version) => (
                  <Card key={version.tone}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>{version.label}</CardTitle>
                          <CardDescription>{version.description}</CardDescription>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => loadRewrite(version.tone)}
                          disabled={version.loading || !session}
                        >
                          {version.loading ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Generating...
                            </>
                          ) : version.content ? (
                            'Regenerate'
                          ) : (
                            'Generate'
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    {version.content && (
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium mb-2">Original Version</p>
                            <ScrollArea className="h-48 border rounded p-3 bg-muted/30">
                              <p className="text-sm whitespace-pre-wrap">{content}</p>
                            </ScrollArea>
                          </div>
                          <div>
                            <p className="text-sm font-medium mb-2">Rewritten Version</p>
                            <ScrollArea className="h-48 border rounded p-3 bg-green-50 dark:bg-green-950/20">
                              <p className="text-sm whitespace-pre-wrap">{version.content}</p>
                            </ScrollArea>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => applyRewrite(version.tone, version.content)}
                            disabled={applying}
                          >
                            {applying ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Applying...
                              </>
                            ) : (
                              'Replace with this version'
                            )}
                          </Button>
                          <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Keep original
                          </Button>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="statistics" className="flex-1 min-h-0 mt-4">
            <ScrollArea className="h-[500px] pr-4">
              {statistics && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Content Metrics</CardTitle>
                      <CardDescription>Basic statistics about your writing</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Word Count</p>
                        <p className="text-2xl font-bold">{statistics.wordCount}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Character Count</p>
                        <p className="text-2xl font-bold">{statistics.characterCount}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Sentences</p>
                        <p className="text-2xl font-bold">{statistics.sentenceCount}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Paragraphs</p>
                        <p className="text-2xl font-bold">{statistics.paragraphCount}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Readability</CardTitle>
                      <CardDescription>How easy is your content to read?</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium">Readability Score</p>
                          <p className="text-2xl font-bold">{statistics.readabilityScore}%</p>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${statistics.readabilityScore}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {statistics.readabilityScore >= 80 && 'Excellent - Very easy to read'}
                          {statistics.readabilityScore >= 60 && statistics.readabilityScore < 80 && 'Good - Easy to read'}
                          {statistics.readabilityScore >= 40 && statistics.readabilityScore < 60 && 'Fair - Moderately easy'}
                          {statistics.readabilityScore < 40 && 'Challenging - Consider simplifying'}
                        </p>
                      </div>
                      <Separator />
                      <div>
                        <p className="text-sm text-muted-foreground">Average Words per Sentence</p>
                        <p className="text-2xl font-bold">{statistics.avgWordsPerSentence}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {statistics.avgWordsPerSentence <= 15 && 'Short sentences - Easy to follow'}
                          {statistics.avgWordsPerSentence > 15 && statistics.avgWordsPerSentence <= 20 && 'Moderate length - Well balanced'}
                          {statistics.avgWordsPerSentence > 20 && 'Long sentences - Consider breaking them up'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Improvement Summary</CardTitle>
                      <CardDescription>Based on AI analysis</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Improvements Found</span>
                        <Badge variant="outline">{improvements.length}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">High Priority</span>
                        <Badge variant="destructive">{improvements.filter(i => i.priority === 'high').length}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Medium Priority</span>
                        <Badge variant="default">{improvements.filter(i => i.priority === 'medium').length}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Low Priority</span>
                        <Badge variant="secondary">{improvements.filter(i => i.priority === 'low').length}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          {activeTab === 'suggestions' && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button
                onClick={applyImprovements}
                disabled={selectedImprovements.size === 0 || applying}
              >
                {applying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Applying...
                  </>
                ) : (
                  `Apply Selected (${selectedImprovements.size})`
                )}
              </Button>
            </>
          )}
          {(activeTab === 'rewrite' || activeTab === 'statistics') && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
