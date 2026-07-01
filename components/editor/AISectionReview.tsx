'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader as Loader2, CircleCheck as CheckCircle2, Circle as XCircle, Wand as Wand2, ChartBar as BarChart3, RefreshCw } from 'lucide-react';
import { aiService, AiLimitError, type Improvement } from '@/lib/ai/ai-provider';
import { useAuth } from '@/lib/auth-context';
import { addRevisionToHistory } from '@/lib/revision-history-service';
import { supabase } from '@/lib/supabase';
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

interface RewriteVersionEntry {
  id: string;
  content: string;
  loading: boolean;
  createdAt: number;
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
  const [rewriteVersions, setRewriteVersions] = useState<RewriteVersionEntry[]>([]);
  const [rewriteGenerating, setRewriteGenerating] = useState(false);

  const calculateStatistics = useCallback(() => {
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
  }, [content]);

  const loadSuggestions = useCallback(async () => {
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
      } else if (error instanceof Error && (error.message === 'SESSION_EXPIRED' || error.message === 'TOKEN_EXPIRED')) {
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (!refreshError) {
          try {
            const results = await aiService.suggestImprovements(content, sectionTitle, language);
            const improvementsWithState = results.map((imp, idx) => ({
              ...imp,
              id: `imp-${Date.now()}-${idx}`,
              ignored: false,
            }));
            setImprovements(improvementsWithState);
            const highPriority = improvementsWithState.filter(imp => imp.priority === 'high').map(imp => imp.id);
            setSelectedImprovements(new Set(highPriority));
          } catch {
            toast.error(t.aiReview.failedToLoad);
          }
        } else {
          toast.error('Session expired. Please sign in again.');
        }
      } else {
        console.error('Error loading suggestions:', error);
        toast.error(t.aiReview.failedToLoad);
      }
    } finally {
      setLoading(false);
    }
  }, [session, content, sectionTitle, language, t]);

  useEffect(() => {
    if (open) {
      loadSuggestions();
      calculateStatistics();
      setRewriteVersions([]);
    }
  }, [open, content, loadSuggestions, calculateStatistics]);

  const generateRewrite = async () => {
    if (!session || rewriteGenerating) return;

    const versionId = `rw-${Date.now()}`;
    setRewriteGenerating(true);
    setRewriteVersions((prev) => [
      ...prev,
      { id: versionId, content: '', loading: true, createdAt: Date.now() },
    ]);

    try {
      const rewritten = await aiService.rewriteSection(sectionTitle, content, language);
      setRewriteVersions((prev) =>
        prev.map((v) =>
          v.id === versionId ? { ...v, content: rewritten, loading: false } : v
        )
      );
    } catch (error) {
      if (error instanceof AiLimitError) {
        const msg = error.limitType === 'daily' ? t.aiUsage.dailyLimitReached : t.aiUsage.weeklyLimitReached;
        toast.error(msg, { description: error.limitType === 'daily' ? t.aiUsage.dailyLimitDetail : t.aiUsage.weeklyLimitDetail });
      } else if (error instanceof Error && error.message === 'AI_TIMEOUT') {
        toast.error(t.biography.aiTimeout);
      } else {
        console.error('Error rewriting section:', error);
        toast.error(t.aiReview.failedToGenerate);
      }
      setRewriteVersions((prev) => prev.filter((v) => v.id !== versionId));
    } finally {
      setRewriteGenerating(false);
    }
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

  const applyRewrite = async (versionIndex: number, rewrittenContent: string) => {
    setApplying(true);
    try {
      await addRevisionToHistory(
        biographyId,
        sectionKey,
        rewrittenContent,
        'ai_rewrite',
        `Flow revision (version ${versionIndex + 1})`
      );

      onApplyChanges(rewrittenContent, 'rewrite');
      toast.success(t.aiReview.appliedRewrite);
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
              <RefreshCw className="h-4 w-4 mr-2" />
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
                  <CheckCircle2 className="h-12 w-12 text-brand-greenDark dark:text-brand-greenLight mb-4" />
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
                                <p className="text-sm bg-brand-greenLight/35 dark:bg-brand-greenLight/10 p-2 rounded font-medium text-brand-ink dark:text-brand-beigeLight">{imp.suggestion}</p>
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
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t.aiReview.rewriteTab}</CardTitle>
                    <CardDescription>{t.aiReview.rewriteDesc}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={() => void generateRewrite()}
                      disabled={rewriteGenerating || !session}
                    >
                      {rewriteGenerating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {t.aiReview.generating}
                        </>
                      ) : rewriteVersions.length > 0 ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          {t.aiReview.regenerate}
                        </>
                      ) : (
                        t.aiReview.generate
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {rewriteVersions.map((version, index) => (
                  <Card key={version.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        {t.aiReview.rewriteVersionLabel.replace('{n}', String(index + 1))}
                      </CardTitle>
                    </CardHeader>
                    {version.loading ? (
                      <CardContent className="flex items-center gap-2 py-6 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>{t.aiReview.generating}</span>
                      </CardContent>
                    ) : (
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium mb-2">{t.aiReview.originalVersion}</p>
                            <ScrollArea className="h-48 border rounded p-3 bg-muted/30">
                              <p className="text-sm whitespace-pre-wrap">{content}</p>
                            </ScrollArea>
                          </div>
                          <div>
                            <p className="text-sm font-medium mb-2">{t.aiReview.rewrittenVersion}</p>
                            <ScrollArea className="h-48 border rounded p-3 bg-brand-greenLight/30 dark:bg-brand-greenLight/10">
                              <p className="text-sm whitespace-pre-wrap">{version.content}</p>
                            </ScrollArea>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            onClick={() => void applyRewrite(index, version.content)}
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
