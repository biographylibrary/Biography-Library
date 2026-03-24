'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StickyNote, SquareCheck as CheckSquare, Plus, CreditCard as Edit3, Trash2, Calendar as CalendarIcon, CircleAlert as AlertCircle, Filter, ArrowUpDown, X, Check } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { it } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/i18n-context';

const GLOBAL_SECTION_KEY = '__global__';

interface Note {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface Todo {
  id: string;
  description: string;
  is_completed: boolean;
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  created_at: string;
}

type TodoFilter = 'all' | 'pending' | 'completed';
type TodoSort = 'date' | 'priority' | 'due_date';

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

interface GlobalNotesPanelProps {
  biographyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCountsChange?: (notes: number, todos: number) => void;
}

export function GlobalNotesPanel({
  biographyId,
  open,
  onOpenChange,
  onCountsChange,
}: GlobalNotesPanelProps) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState<Note[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);

  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');

  const [newTodoDescription, setNewTodoDescription] = useState('');
  const [newTodoPriority, setNewTodoPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newTodoDueDate, setNewTodoDueDate] = useState<Date>();

  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editingTodoDescription, setEditingTodoDescription] = useState('');
  const [editingTodoPriority, setEditingTodoPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [editingTodoDueDate, setEditingTodoDueDate] = useState<Date | undefined>();

  const [todoFilter, setTodoFilter] = useState<TodoFilter>('all');
  const [todoSort, setTodoSort] = useState<TodoSort>('date');

  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
  const [deleteTodoId, setDeleteTodoId] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    const { data } = await supabase
      .from('section_notes')
      .select('*')
      .eq('biography_id', biographyId)
      .eq('section', GLOBAL_SECTION_KEY)
      .order('created_at', { ascending: false });
    if (data) setNotes(data);
  }, [biographyId]);

  const loadTodos = useCallback(async () => {
    const { data } = await supabase
      .from('section_todos')
      .select('*')
      .eq('biography_id', biographyId)
      .eq('section', GLOBAL_SECTION_KEY)
      .order('created_at', { ascending: false });
    if (data) setTodos(data);
  }, [biographyId]);

  useEffect(() => {
    if (open) {
      loadNotes();
      loadTodos();
    }
  }, [open, loadNotes, loadTodos]);

  useEffect(() => {
    onCountsChange?.(notes.length, todos.filter((td) => !td.is_completed).length);
  }, [notes.length, todos, onCountsChange]);

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return;
    const { error } = await supabase.from('section_notes').insert({
      biography_id: biographyId,
      section: GLOBAL_SECTION_KEY,
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

  const handleDeleteNote = async () => {
    if (!deleteNoteId) return;
    const { error } = await supabase.from('section_notes').delete().eq('id', deleteNoteId);
    if (!error) await loadNotes();
    setDeleteNoteId(null);
  };

  const handleAddTodo = async () => {
    if (!newTodoDescription.trim()) return;
    const { error } = await supabase.from('section_todos').insert({
      biography_id: biographyId,
      section: GLOBAL_SECTION_KEY,
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
    if (!error) await loadTodos();
  };

  const startEditingTodo = (todo: Todo) => {
    setEditingTodoId(todo.id);
    setEditingTodoDescription(todo.description);
    setEditingTodoPriority(todo.priority);
    setEditingTodoDueDate(todo.due_date ? new Date(todo.due_date) : undefined);
  };

  const handleUpdateTodo = async () => {
    if (!editingTodoId || !editingTodoDescription.trim()) return;
    const { error } = await supabase
      .from('section_todos')
      .update({
        description: editingTodoDescription.trim(),
        priority: editingTodoPriority,
        due_date: editingTodoDueDate ? format(editingTodoDueDate, 'yyyy-MM-dd') : null,
      })
      .eq('id', editingTodoId);
    if (!error) {
      setEditingTodoId(null);
      await loadTodos();
    }
  };

  const handleDeleteTodo = async () => {
    if (!deleteTodoId) return;
    const { error } = await supabase.from('section_todos').delete().eq('id', deleteTodoId);
    if (!error) await loadTodos();
    setDeleteTodoId(null);
  };

  const isDueDateOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return isPast(new Date(dueDate)) && !isToday(new Date(dueDate));
  };

  const getPriorityBadge = (priority: string) => {
    const configs = {
      low: { label: t.notesAndTodos.priorityLow, className: 'bg-muted text-muted-foreground' },
      medium: { label: t.notesAndTodos.priorityMedium, className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
      high: { label: t.notesAndTodos.priorityHigh, className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    };
    const config = configs[priority as keyof typeof configs] || configs.medium;
    return (
      <Badge variant="outline" className={cn('text-xs border-0', config.className)}>
        {config.label}
      </Badge>
    );
  };

  const filteredAndSortedTodos = useMemo(() => {
    let result = todos.filter((todo) => {
      if (todoFilter === 'pending') return !todo.is_completed;
      if (todoFilter === 'completed') return todo.is_completed;
      return true;
    });
    result = [...result].sort((a, b) => {
      if (todoSort === 'priority') return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (todoSort === 'due_date') {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return a.due_date.localeCompare(b.due_date);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return result;
  }, [todos, todoFilter, todoSort]);

  const pendingCount = todos.filter((td) => !td.is_completed).length;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <StickyNote className="h-5 w-5 text-primary" />
              {t.notesAndTodos.globalTitle}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden px-6 pb-6 pt-4">
            <Tabs defaultValue="notes" className="flex flex-col h-full">
              <TabsList className="grid w-full grid-cols-2 shrink-0">
                <TabsTrigger
                  value="notes"
                  className="gap-2 data-[state=active]:bg-[#C8DFBE] data-[state=active]:text-[#121212] data-[state=active]:shadow-none"
                >
                  <StickyNote className="h-4 w-4" />
                  {t.notesAndTodos.notesTab}
                  {notes.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 min-w-5 rounded-full px-1 text-xs text-white">
                      {notes.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="todos"
                  className="gap-2 data-[state=active]:bg-[#C8DFBE] data-[state=active]:text-[#121212] data-[state=active]:shadow-none"
                >
                  <CheckSquare className="h-4 w-4" />
                  {t.notesAndTodos.todosTab}
                  {pendingCount > 0 && (
                    <Badge variant="destructive" className="ml-1 h-5 min-w-5 rounded-full px-1 text-xs">
                      {pendingCount}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* NOTES */}
              <TabsContent value="notes" className="flex-1 flex flex-col gap-4 mt-4 min-h-0">
                <div className="space-y-2 shrink-0">
                  <Textarea
                    placeholder={t.notesAndTodos.addNotePlaceholder}
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value.slice(0, 500))}
                    className="min-h-[80px] resize-none"
                    onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) handleAddNote(); }}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{newNoteContent.length}/500</span>
                    <Button size="sm" onClick={handleAddNote} disabled={!newNoteContent.trim()}>
                      <Plus className="h-4 w-4 mr-1" />
                      {t.notesAndTodos.addNote}
                    </Button>
                  </div>
                </div>

                <ScrollArea className="flex-1 min-h-0 pr-3">
                  <div className="space-y-3 pb-1">
                    {notes.length === 0 ? (
                      <div className="text-center py-10 text-muted-foreground">
                        <StickyNote className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">{t.notesAndTodos.noNotes}</p>
                      </div>
                    ) : (
                      notes.map((note) => (
                        <Card key={note.id} className="p-3">
                          {editingNoteId === note.id ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editingNoteContent}
                                onChange={(e) => setEditingNoteContent(e.target.value.slice(0, 500))}
                                className="min-h-[60px] resize-none"
                                autoFocus
                              />
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">{editingNoteContent.length}/500</span>
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline" onClick={() => { setEditingNoteId(null); setEditingNoteContent(''); }}>
                                    {t.notesAndTodos.cancel}
                                  </Button>
                                  <Button size="sm" onClick={() => handleUpdateNote(note.id, editingNoteContent)} disabled={!editingNoteContent.trim()}>
                                    {t.notesAndTodos.save}
                                  </Button>
                                </div>
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
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditingNoteId(note.id); setEditingNoteContent(note.content); }}>
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => setDeleteNoteId(note.id)}>
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

              {/* TODOS */}
              <TabsContent value="todos" className="flex-1 flex flex-col gap-3 mt-4 min-h-0">
                <Card className="p-3 bg-muted/50 shrink-0">
                  <div className="space-y-3">
                    <Textarea
                      placeholder={t.notesAndTodos.addTodoDescription}
                      value={newTodoDescription}
                      onChange={(e) => setNewTodoDescription(e.target.value)}
                      className="min-h-[60px] resize-none"
                    />
                    <div className="flex items-center gap-2 flex-wrap">
                      <Select value={newTodoPriority} onValueChange={(v) => setNewTodoPriority(v as 'low' | 'medium' | 'high')}>
                        <SelectTrigger className="w-[140px] h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">{t.notesAndTodos.priorityLow}</SelectItem>
                          <SelectItem value="medium">{t.notesAndTodos.priorityMedium}</SelectItem>
                          <SelectItem value="high">{t.notesAndTodos.priorityHigh}</SelectItem>
                        </SelectContent>
                      </Select>

                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2 h-9">
                            <CalendarIcon className="h-4 w-4" />
                            {newTodoDueDate ? format(newTodoDueDate, 'd MMM yyyy', { locale: it }) : t.notesAndTodos.dueDate}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={newTodoDueDate} onSelect={setNewTodoDueDate} locale={it} initialFocus />
                        </PopoverContent>
                      </Popover>

                      {newTodoDueDate && (
                        <Button size="sm" variant="ghost" className="h-9 px-2" onClick={() => setNewTodoDueDate(undefined)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}

                      <Button size="sm" onClick={handleAddTodo} disabled={!newTodoDescription.trim()} className="ml-auto h-9">
                        <Plus className="h-4 w-4 mr-1" />
                        {t.notesAndTodos.addTodo}
                      </Button>
                    </div>
                  </div>
                </Card>

                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Select value={todoFilter} onValueChange={(v) => setTodoFilter(v as TodoFilter)}>
                    <SelectTrigger className="w-[150px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t.notesAndTodos.filterAll} ({todos.length})</SelectItem>
                      <SelectItem value="pending">{t.notesAndTodos.filterPending} ({todos.filter((td) => !td.is_completed).length})</SelectItem>
                      <SelectItem value="completed">{t.notesAndTodos.filterCompleted} ({todos.filter((td) => td.is_completed).length})</SelectItem>
                    </SelectContent>
                  </Select>

                  <ArrowUpDown className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                  <Select value={todoSort} onValueChange={(v) => setTodoSort(v as TodoSort)}>
                    <SelectTrigger className="w-[150px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">{t.notesAndTodos.sortByDate}</SelectItem>
                      <SelectItem value="priority">{t.notesAndTodos.sortByPriority}</SelectItem>
                      <SelectItem value="due_date">{t.notesAndTodos.sortByDueDate}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <ScrollArea className="flex-1 min-h-0 pr-3">
                  <div className="space-y-2 pb-1">
                    {filteredAndSortedTodos.length === 0 ? (
                      <div className="text-center py-10 text-muted-foreground">
                        <CheckSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">
                          {todoFilter === 'completed' ? t.notesAndTodos.noCompletedTodos : t.notesAndTodos.noTodos}
                        </p>
                      </div>
                    ) : (
                      filteredAndSortedTodos.map((todo) => (
                        <Card key={todo.id} className={cn('p-3', todo.is_completed && 'opacity-60 bg-muted/50')}>
                          {editingTodoId === todo.id ? (
                            <div className="space-y-3">
                              <Textarea
                                value={editingTodoDescription}
                                onChange={(e) => setEditingTodoDescription(e.target.value)}
                                className="min-h-[60px] resize-none"
                                autoFocus
                              />
                              <div className="flex items-center gap-2 flex-wrap">
                                <Select value={editingTodoPriority} onValueChange={(v) => setEditingTodoPriority(v as 'low' | 'medium' | 'high')}>
                                  <SelectTrigger className="w-[140px] h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="low">{t.notesAndTodos.priorityLow}</SelectItem>
                                    <SelectItem value="medium">{t.notesAndTodos.priorityMedium}</SelectItem>
                                    <SelectItem value="high">{t.notesAndTodos.priorityHigh}</SelectItem>
                                  </SelectContent>
                                </Select>

                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" className="gap-2 h-8">
                                      <CalendarIcon className="h-3.5 w-3.5" />
                                      {editingTodoDueDate ? format(editingTodoDueDate, 'd MMM yyyy', { locale: it }) : t.notesAndTodos.dueDate}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="single" selected={editingTodoDueDate} onSelect={setEditingTodoDueDate} locale={it} initialFocus />
                                  </PopoverContent>
                                </Popover>

                                {editingTodoDueDate && (
                                  <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setEditingTodoDueDate(undefined)}>
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                              <div className="flex gap-2 justify-end">
                                <Button size="sm" variant="outline" onClick={() => setEditingTodoId(null)}>
                                  {t.notesAndTodos.cancel}
                                </Button>
                                <Button size="sm" onClick={handleUpdateTodo} disabled={!editingTodoDescription.trim()}>
                                  <Check className="h-3.5 w-3.5 mr-1" />
                                  {t.notesAndTodos.save}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={todo.is_completed}
                                onCheckedChange={() => handleToggleTodo(todo.id, todo.is_completed)}
                                className="mt-0.5 shrink-0"
                              />
                              <div className="flex-1 space-y-1.5 min-w-0">
                                <p className={cn('text-sm', todo.is_completed && 'line-through text-muted-foreground')}>
                                  {todo.description}
                                </p>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {getPriorityBadge(todo.priority)}
                                  {todo.due_date && (
                                    <Badge
                                      variant="outline"
                                      className={cn('gap-1 text-xs', isDueDateOverdue(todo.due_date) && !todo.is_completed && 'border-destructive text-destructive')}
                                    >
                                      <CalendarIcon className="h-3 w-3" />
                                      {format(new Date(todo.due_date), 'd MMM', { locale: it })}
                                      {isDueDateOverdue(todo.due_date) && !todo.is_completed && <AlertCircle className="h-3 w-3" />}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => startEditingTodo(todo)}>
                                  <Edit3 className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => setDeleteTodoId(todo.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteNoteId} onOpenChange={(open) => !open && setDeleteNoteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.notesAndTodos.confirmDelete}</AlertDialogTitle>
            <AlertDialogDescription>{t.notesAndTodos.confirmDeleteNote}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteNoteId(null)}>{t.notesAndTodos.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteNote} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t.notesAndTodos.deleteNote}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTodoId} onOpenChange={(open) => !open && setDeleteTodoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.notesAndTodos.confirmDelete}</AlertDialogTitle>
            <AlertDialogDescription>{t.notesAndTodos.confirmDeleteTodo}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTodoId(null)}>{t.notesAndTodos.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTodo} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t.notesAndTodos.deleteTodo}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
