'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SquareCheck as CheckSquare, CircleAlert as AlertCircle, Calendar as CalendarIcon, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { BIOGRAPHY_SECTIONS } from '@/lib/editor-constants';
import { format, isPast, isToday } from 'date-fns';
import { it } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface PendingTodo {
  id: string;
  biography_id: string;
  biography_title: string;
  section: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
}

export function PendingTodosCard() {
  const [todos, setTodos] = useState<PendingTodo[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadTodos = async () => {
      const { data: todosData, error: todosError } = await supabase
        .from('section_todos')
        .select('id, biography_id, section, description, priority, due_date')
        .eq('is_completed', false)
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(10);

      if (!todosError && todosData) {
        const biographyIdsSet = new Set(todosData.map(t => t.biography_id));
        const biographyIds = Array.from(biographyIdsSet);

        const { data: biographiesData } = await supabase
          .from('biographies')
          .select('id, title')
          .in('id', biographyIds);

        const biographyMap = new Map(
          biographiesData?.map(b => [b.id, b.title]) || []
        );

        const enrichedTodos = todosData.map(todo => ({
          ...todo,
          biography_title: biographyMap.get(todo.biography_id) || 'Biografia',
        }));

        setTodos(enrichedTodos);
      }

      setLoading(false);
    };

    loadTodos();
  }, []);

  const isDueDateOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return isPast(new Date(dueDate)) && !isToday(new Date(dueDate));
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'text-gray-600',
      medium: 'text-[#121212] dark:text-[#EDE4B9]',
      high: 'text-red-600',
    };
    return colors[priority as keyof typeof colors] || colors.medium;
  };

  const getSectionTitle = (sectionKey: string) => {
    const section = BIOGRAPHY_SECTIONS.find(s => s.key === sectionKey);
    return section?.title || sectionKey;
  };

  const overdueTodos = todos.filter(t => isDueDateOverdue(t.due_date));

  const handleNavigate = (biographyId: string, section: string) => {
    router.push(`/biography/${biographyId}/edit?section=${section}`);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Promemoria in Sospeso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Caricamento...</p>
        </CardContent>
      </Card>
    );
  }

  if (todos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Promemoria in Sospeso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nessun promemoria in sospeso. Ottimo lavoro!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5" />
          Promemoria in Sospeso
          <Badge variant="secondary" className="ml-auto">
            {todos.length}
          </Badge>
          {overdueTodos.length > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              {overdueTodos.length} scaduti
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-3">
            {todos.map((todo) => {
              const isOverdue = isDueDateOverdue(todo.due_date);

              return (
                <Card
                  key={todo.id}
                  className={cn(
                    'p-3 cursor-pointer hover:bg-muted/50 transition-colors',
                    isOverdue && 'border-red-300 bg-red-50/50 dark:bg-red-950/20'
                  )}
                  onClick={() => handleNavigate(todo.biography_id, todo.section)}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium line-clamp-2">
                          {todo.description}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-medium">{todo.biography_title}</span>
                          <span>•</span>
                          <span>{getSectionTitle(todo.section)}</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNavigate(todo.biography_id, todo.section);
                        }}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className={cn('text-xs', getPriorityColor(todo.priority))}
                      >
                        {todo.priority === 'low' && 'Bassa'}
                        {todo.priority === 'medium' && 'Media'}
                        {todo.priority === 'high' && 'Alta'}
                      </Badge>

                      {todo.due_date && (
                        <Badge
                          variant="outline"
                          className={cn(
                            'gap-1 text-xs',
                            isOverdue && 'border-red-500 text-red-700 bg-red-50 dark:bg-red-950/30'
                          )}
                        >
                          <CalendarIcon className="h-3 w-3" />
                          {format(new Date(todo.due_date), 'd MMM yyyy', { locale: it })}
                          {isOverdue && <AlertCircle className="h-3 w-3" />}
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
