'use client';

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader as Loader2, CircleCheck as CheckCircle2, Circle as XCircle, BookOpen, Wand as Wand2, ChartBar as BarChart3 } from 'lucide-react';
import { aiService, AiLimitError, type Improvement } from '@/lib/ai/ai-provider';
import { useAuth } from '@/lib/auth-context';
import { addRevisionToHistory } from '@/lib/revision-history-service';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n/i18n-context';

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
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('suggestions');
  const [loading, setLoading] = useState(false);
  const [improvements, setImprovements] = useState<(Improvement & { id: string; ignored: boolean })[]>([]);
  const [selectedImprovements, setSelectedImprovements] = useState<Set<string>>(new Set());
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [applying, setApplying] = useState(false);

  const initialRewriteVersions = useMemo(() => [
    { tone: 'narrative' as const, label: t.aiReview.narrativeLabel, description: t.aiReview.narrativeDesc, content: '', loading: false },
    { tone: 'formal' as const, label: t.aiReview.formalLabel, description: t.aiReview.formalDesc, content: '', loading: false },
    { tone: 'intimate' as const, label: t.aiReview.intimateLabel, description: t.aiReview.intimateDesc, content: '', loading: false },
  ], [t]);

  const [rewriteVersions, setRewriteVersions] = useState<RewriteVersion[]>(initialRewriteVersions);

  useEffect(() => {
    setRewriteVersions(prev => prev.map((v, i) => ({
      ...v,
      label: initialRewriteVersions[i].label,
      description: initialRewriteVersions[i].description,
    })));
  }, [initialRewriteVersions]);

  useEffect(() => {
    if (open) {
      loadSuggestions();
      calculateStatistics();
    }
  }, [open, content]);

  const loadSuggestions = async () => {
    if (!session) return;

    setLoading(true);
    try {
      const results = await aiService.suggestImprovements(
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
      if (error instanceof AiLimitError) {
        const msg = error.limitType === 'daily' ? t.aiUsage.dailyLimitReached : t.aiUsage.weeklyLimitReached;
        toast.error(msg, { description: error.limitType === 'daily' ? t.aiUsage.dailyLimitDetail : t.aiUsage.weeklyLimitDetail });
      } else if (error instanceof Error && error.message === 'AI_TIMEOUT') {
        toast.error(t.biography.aiTimeout);
      } else {
        console.error('Error loading suggestions:', error);
        toast.error(t.aiReview.failedToLoad);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadRewrite = async (tone: 'narrative' | 'formal' | 'intimate') => {
    if (!session) return;

    setRewriteVersions(prev =>
      prev.map(v => v.tone === tone ? { ...v, loading: true } : v)
    );

    try {
      const rewritten = await aiService.rewriteSection(
        sectionTitle,
        content,
        tone,
        language
      );

      setRewriteVersions(prev =>
        prev.map(v => v.tone === tone ? { ...v, content: rewritten, loading: false } : v)
      );
    } catch (error) {
      if (error instanceof AiLimitError) {
        const msg = error.limitType === 'daily' ? t.aiUsage.dailyLimitReached : t.aiUsage.weeklyLimitReached;
        toast.error(msg, { description: error.limitType === 'daily' ? t.aiUsage.dailyLimitDetail : t.aiUsage.weeklyLimitDetail });
      } else if (error instanceof Error && error.message === 'AI_TIMEOUT') {
        toast.error(t.biography.aiTimeout);
      } else {
        console.error('Error rewriting section:', error);
        toast.error(`${t.aiReview.failedToGenerate} ${tone}`);
      }
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
      toast.error(t.aiReview.noImprovementsSelected);
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
      toast.success(t.aiReview.appliedImprovements.replace('{count}', String(selected.length)));
      onOpenChange(false);
    } catch (error) {
      console.error('Error applying improvements:', error);
      toast.error(t.aiReview.failedToApply);
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
      toast.success(t.aiReview.appliedRewrite.replace('{tone}', tone));
      onOpenChange(false);
    } catch (error) {
      console.error('Error applying rewrite:', error);
      toast.error(t.aiReview.failedToApply);
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

  const getReadabilityText = (score: number) => {
    if (score >= 80) return t.aiReview.excellent;
    if (score >= 60) return t.aiReview.good;
    if (score >= 40) return t.aiReview.fair;
    return t.aiReview.challenging;
  };

  const getSentenceLengthText = (avg: number) => {
    if (avg <= 15) return t.aiReview.shortSentences;
    if (avg <= 20) return t.aiReview.moderateSentences;
    return t.aiReview.longSentences;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t.aiReview.title}: {sectionTitle}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="suggestions">
              <Wand2 className="h-4 w-4 mr-2" />
              {t.aiReview.suggestionsTab}
            </TabsTrigger>
            <TabsTrigger value="rewrite">
              <BookOpen className="h-4 w-4 mr-2" />
              {t.aiReview.rewriteTab}
            </TabsTrigger>
            <TabsTrigger value="statistics">
              <BarChart3 className="h-4 w-4 mr-2" />
              {t.aiReview.statisticsTab}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="suggestions" className="flex-1 min-h-0 mt-4">
            <ScrollArea className="h-[500px] pr-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">{t.aiReview.analyzingContent}</span>
                </div>
              ) : improvements.filter(imp => !imp.ignored).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{t.aiReview.looksGreat}</h3>
                  <p className="text-muted-foreground">{t.aiReview.noImprovementsNeeded}</p>
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
                                <p className="text-sm text-muted-foreground mb-1">{t.aiReview.original}</p>
                                <p className="text-sm bg-muted p-2 rounded italic">{imp.original}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground mb-1">{t.aiReview.suggestion}</p>
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
                                      {t.aiReview.selected}
                                    </>
                                  ) : (
                                    t.aiReview.select
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => ignoreImprovement(imp.id)}
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  {t.aiReview.ignore}
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
                              {t.aiReview.generating}
                            </>
                          ) : version.content ? (
                            t.aiReview.regenerate
                          ) : (
                            t.aiReview.generate
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    {version.content && (
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium mb-2">{t.aiReview.originalVersion}</p>
                            <ScrollArea className="h-48 border rounded p-3 bg-muted/30">
                              <p className="text-sm whitespace-pre-wrap">{content}</p>
                            </ScrollArea>
                          </div>
                          <div>
                            <p className="text-sm font-medium mb-2">{t.aiReview.rewrittenVersion}</p>
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
                                {t.aiReview.applying}
                              </>
                            ) : (
                              t.aiReview.replaceWithVersion
                            )}
                          </Button>
                          <Button variant="outline" onClick={() => onOpenChange(false)}>
                            {t.aiReview.keepOriginal}
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
                      <CardTitle>{t.aiReview.contentMetrics}</CardTitle>
                      <CardDescription>{t.aiReview.contentMetricsDesc}</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">{t.aiReview.wordCount}</p>
                        <p className="text-2xl font-bold">{statistics.wordCount}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t.aiReview.characterCount}</p>
                        <p className="text-2xl font-bold">{statistics.characterCount}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t.aiReview.sentences}</p>
                        <p className="text-2xl font-bold">{statistics.sentenceCount}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t.aiReview.paragraphs}</p>
                        <p className="text-2xl font-bold">{statistics.paragraphCount}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>{t.aiReview.readability}</CardTitle>
                      <CardDescription>{t.aiReview.readabilityDesc}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium">{t.aiReview.readabilityScore}</p>
                          <p className="text-2xl font-bold">{statistics.readabilityScore}%</p>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${statistics.readabilityScore}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {getReadabilityText(statistics.readabilityScore)}
                        </p>
                      </div>
                      <Separator />
                      <div>
                        <p className="text-sm text-muted-foreground">{t.aiReview.avgWordsPerSentence}</p>
                        <p className="text-2xl font-bold">{statistics.avgWordsPerSentence}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {getSentenceLengthText(statistics.avgWordsPerSentence)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>{t.aiReview.improvementSummary}</CardTitle>
                      <CardDescription>{t.aiReview.basedOnAi}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{t.aiReview.improvementsFound}</span>
                        <Badge variant="outline">{improvements.length}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{t.aiReview.highPriority}</span>
                        <Badge variant="destructive">{improvements.filter(i => i.priority === 'high').length}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{t.aiReview.mediumPriority}</span>
                        <Badge variant="default">{improvements.filter(i => i.priority === 'medium').length}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{t.aiReview.lowPriority}</span>
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
                {t.aiReview.close}
              </Button>
              <Button
                onClick={applyImprovements}
                disabled={selectedImprovements.size === 0 || applying}
              >
                {applying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t.aiReview.applying}
                  </>
                ) : (
                  `${t.aiReview.applySelected} (${selectedImprovements.size})`
                )}
              </Button>
            </>
          )}
          {(activeTab === 'rewrite' || activeTab === 'statistics') && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t.aiReview.close}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
