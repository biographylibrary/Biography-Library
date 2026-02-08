'use client';

import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  StickyNote,
  CheckSquare,
  Plus,
  Edit3,
  Trash2,
  Calendar as CalendarIcon,
  AlertCircle,
  Filter,
} from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { it } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface SectionNote {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface SectionTodo {
  id: string;
  description: string;
  is_completed: boolean;
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  created_at: string;
}

interface SectionNotesProps {
  biographyId: string;
  sectionKey: string;
}

type TodoFilter = 'all' | 'pending' | 'completed';

export function SectionNotes({ biographyId, sectionKey }: SectionNotesProps) {
  const [notes, setNotes] = useState<SectionNote[]>([]);
  const [todos, setTodos] = useState<SectionTodo[]>([]);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const [newTodoDescription, setNewTodoDescription] = useState('');
  const [newTodoPriority, setNewTodoPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newTodoDueDate, setNewTodoDueDate] = useState<Date>();
  const [todoFilter, setTodoFilter] = useState<TodoFilter>('all');
  const [loading, setLoading] = useState(true);

  const loadNotes = useCallback(async () => {
    const { data, error } = await supabase
      .from('section_notes')
      .select('*')
      .eq('biography_id', biographyId)
      .eq('section', sectionKey)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setNotes(data);
    }
  }, [biographyId, sectionKey]);

  const loadTodos = useCallback(async () => {
    const { data, error } = await supabase
      .from('section_todos')
      .select('*')
      .eq('biography_id', biographyId)
      .eq('section', sectionKey)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTodos(data);
    }
  }, [biographyId, sectionKey]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([loadNotes(), loadTodos()]);
      setLoading(false);
    };
    load();
  }, [loadNotes, loadTodos]);

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return;

    const { error } = await supabase
      .from('section_notes')
      .insert({
        biography_id: biographyId,
        section: sectionKey,
        content: newNoteContent.trim(),
      });

    if (!error) {
      setNewNoteContent('');
      await loadNotes();
    }
  };

  const handleUpdateNote = async (noteId: string, content: string) => {
    const { error } = await supabase
      .from('section_notes')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', noteId);

    if (!error) {
      setEditingNoteId(null);
      setEditingNoteContent('');
      await loadNotes();
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    const { error } = await supabase
      .from('section_notes')
      .delete()
      .eq('id', noteId);

    if (!error) {
      await loadNotes();
    }
  };

  const handleAddTodo = async () => {
    if (!newTodoDescription.trim()) return;

    const { error } = await supabase
      .from('section_todos')
      .insert({
        biography_id: biographyId,
        section: sectionKey,
        description: newTodoDescription.trim(),
        priority: newTodoPriority,
        due_date: newTodoDueDate ? format(newTodoDueDate, 'yyyy-MM-dd') : null,
      });

    if (!error) {
      setNewTodoDescription('');
      setNewTodoPriority('medium');
      setNewTodoDueDate(undefined);
      await loadTodos();
    }
  };

  const handleToggleTodo = async (todoId: string, isCompleted: boolean) => {
    const { error } = await supabase
      .from('section_todos')
      .update({ is_completed: !isCompleted })
      .eq('id', todoId);

    if (!error) {
      await loadTodos();
    }
  };

  const handleDeleteTodo = async (todoId: string) => {
    const { error } = await supabase
      .from('section_todos')
      .delete()
      .eq('id', todoId);

    if (!error) {
      await loadTodos();
    }
  };

  const getPriorityBadge = (priority: string) => {
    const configs = {
      low: { label: 'Bassa', variant: 'secondary' as const, className: 'bg-bg-surface dark:bg-dark-bg-surface text-text-secondary dark:text-dark-text-secondary' },
      medium: { label: 'Media', variant: 'default' as const, className: 'bg-status-warning text-text-primary dark:text-dark-text-primary' },
      high: { label: 'Alta', variant: 'destructive' as const, className: 'bg-error/20 text-error' },
    };
    const config = configs[priority as keyof typeof configs] || configs.medium;
    return (
      <Badge variant={config.variant} className={cn('text-xs', config.className)}>
        {config.label}
      </Badge>
    );
  };

  const isDueDateOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return isPast(new Date(dueDate)) && !isToday(new Date(dueDate));
  };

  const filteredTodos = todos.filter((todo) => {
    if (todoFilter === 'pending') return !todo.is_completed;
    if (todoFilter === 'completed') return todo.is_completed;
    return true;
  });

  return (
    <Card className="p-4">
      <Tabs defaultValue="notes" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="notes" className="gap-2">
            <StickyNote className="h-4 w-4" />
            Note
            {notes.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                {notes.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="todos" className="gap-2">
            <CheckSquare className="h-4 w-4" />
            Da Fare
            {todos.filter(t => !t.is_completed).length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                {todos.filter(t => !t.is_completed).length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notes" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Textarea
              placeholder="Aggiungi una nota per questa sezione... (max 500 caratteri)"
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value.slice(0, 500))}
              className="min-h-[80px] resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  handleAddNote();
                }
              }}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {newNoteContent.length}/500
              </span>
              <Button
                size="sm"
                onClick={handleAddNote}
                disabled={!newNoteContent.trim()}
              >
                <Plus className="h-4 w-4 mr-1" />
                Aggiungi Nota
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nessuna nota per questa sezione
                </p>
              ) : (
                notes.map((note) => (
                  <Card key={note.id} className="p-3">
                    {editingNoteId === note.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editingNoteContent}
                          onChange={(e) => setEditingNoteContent(e.target.value.slice(0, 500))}
                          className="min-h-[60px] resize-none"
                        />
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingNoteId(null);
                              setEditingNoteContent('');
                            }}
                          >
                            Annulla
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleUpdateNote(note.id, editingNoteContent)}
                          >
                            Salva
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(note.created_at), "d MMM yyyy 'alle' HH:mm", { locale: it })}
                          </span>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => {
                                setEditingNoteId(note.id);
                                setEditingNoteContent(note.content);
                              }}
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteNote(note.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="todos" className="space-y-4 mt-4">
          <Card className="p-3 bg-muted/50">
            <div className="space-y-3">
              <Textarea
                placeholder="Descrizione promemoria..."
                value={newTodoDescription}
                onChange={(e) => setNewTodoDescription(e.target.value)}
                className="min-h-[60px] resize-none"
              />
              <div className="flex items-center gap-2 flex-wrap">
                <Select
                  value={newTodoPriority}
                  onValueChange={(value) => setNewTodoPriority(value as 'low' | 'medium' | 'high')}
                >
                  <SelectTrigger className="w-[130px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Priorità Bassa</SelectItem>
                    <SelectItem value="medium">Priorità Media</SelectItem>
                    <SelectItem value="high">Priorità Alta</SelectItem>
                  </SelectContent>
                </Select>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 h-9">
                      <CalendarIcon className="h-4 w-4" />
                      {newTodoDueDate ? format(newTodoDueDate, 'd MMM yyyy', { locale: it }) : 'Scadenza'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newTodoDueDate}
                      onSelect={setNewTodoDueDate}
                      locale={it}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                {newTodoDueDate && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-9"
                    onClick={() => setNewTodoDueDate(undefined)}
                  >
                    Rimuovi data
                  </Button>
                )}

                <Button
                  size="sm"
                  onClick={handleAddTodo}
                  disabled={!newTodoDescription.trim()}
                  className="ml-auto h-9"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Aggiungi
                </Button>
              </div>
            </div>
          </Card>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={todoFilter} onValueChange={(value) => setTodoFilter(value as TodoFilter)}>
              <SelectTrigger className="w-[150px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti ({todos.length})</SelectItem>
                <SelectItem value="pending">Da fare ({todos.filter(t => !t.is_completed).length})</SelectItem>
                <SelectItem value="completed">Completati ({todos.filter(t => t.is_completed).length})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {filteredTodos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {todoFilter === 'completed' ? 'Nessun promemoria completato' : 'Nessun promemoria'}
                </p>
              ) : (
                filteredTodos.map((todo) => (
                  <Card
                    key={todo.id}
                    className={cn(
                      'p-3',
                      todo.is_completed && 'opacity-60 bg-muted/50'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={todo.is_completed}
                        onCheckedChange={() => handleToggleTodo(todo.id, todo.is_completed)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 space-y-2">
                        <p className={cn(
                          'text-sm',
                          todo.is_completed && 'line-through text-muted-foreground'
                        )}>
                          {todo.description}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {getPriorityBadge(todo.priority)}
                          {todo.due_date && (
                            <Badge
                              variant="outline"
                              className={cn(
                                'gap-1 text-xs',
                                isDueDateOverdue(todo.due_date) && !todo.is_completed && 'border-error text-error'
                              )}
                            >
                              <CalendarIcon className="h-3 w-3" />
                              {format(new Date(todo.due_date), 'd MMM', { locale: it })}
                              {isDueDateOverdue(todo.due_date) && !todo.is_completed && (
                                <AlertCircle className="h-3 w-3" />
                              )}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive shrink-0"
                        onClick={() => handleDeleteTodo(todo.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
