'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Users, ShieldOff, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { AdminNav } from '@/components/admin/AdminNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

type UserRole = 'user' | 'reviewer' | 'admin' | 'super_admin';

interface UserRow {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  created_at: string;
  biography_count: number;
}

interface PendingChange {
  userId: string;
  name: string;
  oldRole: UserRole;
  newRole: UserRole;
}

const PAGE_SIZE = 20;

const ROLE_ORDER: UserRole[] = ['user', 'reviewer', 'admin', 'super_admin'];

function getRoleBadge(role: UserRole, label: string) {
  const base = 'text-xs font-semibold px-2 py-0.5 rounded-full border';
  switch (role) {
    case 'super_admin':
      return <span className={`${base} bg-[#6D323E] text-white border-red-200 dark:bg-[#6D323E] dark:text-white dark:border-red-800`}>{label}</span>;
    case 'admin':
      return <span className={`${base} bg-[#DDCF88] text-[#121212] border-amber-200 dark:bg-[#DDCF88]/20 dark:text-[#DDCF88] dark:border-amber-800`}>{label}</span>;
    case 'reviewer':
      return <span className={`${base} bg-[#C4DAEB] text-[#121212] border-sky-200 dark:bg-[#C4DAEB]/20 dark:text-[#C4DAEB] dark:border-sky-800`}>{label}</span>;
    default:
      return <span className={`${base} bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700`}>{label}</span>;
  }
}

function getAvatarColor(_name: string) {
  return 'bg-[#121212] dark:bg-[#FDFBF7]';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function AdminUsersPage() {
  const { user, role, loading } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const { toast } = useToast();

  const [countdown, setCountdown] = useState(3);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pendingChanges, setPendingChanges] = useState<Record<string, UserRole>>({});
  const [confirmChange, setConfirmChange] = useState<PendingChange | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const isSuperAdmin = role === 'super_admin';
  const isDenied = !loading && (!user || role !== 'super_admin');

  useEffect(() => {
    if (loading) return;
    if (!isDenied) return;

    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          router.replace('/admin');
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, isDenied, router]);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    setLoadError(null);
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email, role, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: bioCounts, error: bioError } = await supabase
        .from('biographies')
        .select('user_id');

      if (bioError) throw bioError;

      const countMap: Record<string, number> = {};
      for (const b of bioCounts ?? []) {
        countMap[b.user_id] = (countMap[b.user_id] ?? 0) + 1;
      }

      const rows: UserRow[] = (profiles ?? []).map((p) => ({
        id: p.id,
        full_name: p.name,
        email: p.email ?? null,
        role: p.role as UserRole,
        created_at: p.created_at,
        biography_count: countMap[p.id] ?? 0,
      }));

      setUsers(rows);
    } catch {
      setLoadError(t.admin.usersLoadError);
    } finally {
      setLoadingUsers(false);
    }
  }, [t.admin.usersLoadError]);

  useEffect(() => {
    if (isSuperAdmin) {
      loadUsers();
    }
  }, [isSuperAdmin, loadUsers]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return users;
    return users.filter(
      (u) =>
        (u.full_name ?? '').toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q)
    );
  }, [users, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageUsers = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSearch(v: string) {
    setSearch(v);
    setPage(1);
  }

  function handleRoleChange(userId: string, newRole: UserRole) {
    setPendingChanges((prev) => ({ ...prev, [userId]: newRole }));
  }

  function handleSaveClick(u: UserRow) {
    if (u.id === user?.id) {
      toast({ title: t.admin.usersCannotChangeSelf, variant: 'destructive' });
      return;
    }
    const newRole = pendingChanges[u.id] ?? u.role;
    setConfirmChange({
      userId: u.id,
      name: u.full_name ?? u.email ?? u.id,
      oldRole: u.role,
      newRole,
    });
  }

  async function handleConfirmChange() {
    if (!confirmChange) return;
    setSaving(confirmChange.userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: confirmChange.newRole })
        .eq('id', confirmChange.userId);

      if (error) throw error;

      await supabase.from('role_change_log').insert({
        changed_by: user!.id,
        target_user: confirmChange.userId,
        old_role: confirmChange.oldRole,
        new_role: confirmChange.newRole,
      });

      setUsers((prev) =>
        prev.map((u) =>
          u.id === confirmChange.userId ? { ...u, role: confirmChange.newRole } : u
        )
      );
      setPendingChanges((prev) => {
        const next = { ...prev };
        delete next[confirmChange.userId];
        return next;
      });
      toast({ title: t.admin.usersRoleUpdated });
    } catch {
      toast({ title: t.admin.usersLoadError, variant: 'destructive' });
    } finally {
      setSaving(null);
      setConfirmChange(null);
    }
  }

  function getRoleLabel(r: UserRole) {
    switch (r) {
      case 'super_admin': return t.admin.usersRoleSuperAdmin;
      case 'admin': return t.admin.usersRoleAdmin;
      case 'reviewer': return t.admin.usersRoleReviewer;
      default: return t.admin.usersRoleUser;
    }
  }

  if (loading) return null;

  if (isDenied) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="flex justify-center mb-5">
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30">
              <ShieldOff className="h-8 w-8 text-red-500 dark:text-red-400" />
            </div>
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">{t.admin.usersAccessDenied}</h1>
          <p className="text-sm text-muted-foreground mb-5">{t.admin.usersAccessDeniedMessage}</p>
          <p className="text-xs text-muted-foreground">
            {t.admin.usersRedirectingIn}{' '}
            <span className="font-semibold tabular-nums text-foreground">{countdown}</span>s…
          </p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-full bg-background">
        <AdminNav />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-[#C4DAEB] dark:bg-[#C4DAEB]/20 shrink-0">
              <Users className="h-5 w-5 text-[#121212] dark:text-[#FDFBF7]" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-semibold tracking-tight text-foreground">
                {t.admin.usersTitle}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">{t.admin.usersSubtitle}</p>
            </div>
          </div>

          <div className="mt-8 mb-5 flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-9"
                placeholder={t.admin.usersSearchPlaceholder}
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            <span className="text-sm text-muted-foreground ml-auto tabular-nums">
              {filtered.length} user{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {loadError && (
            <div className="mb-4 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 text-sm text-red-700 dark:text-red-300">
              {loadError}
            </div>
          )}

          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground w-10"></th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t.admin.usersColName}</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">{t.admin.usersColEmail}</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t.admin.usersColRole}</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">{t.admin.usersColJoined}</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground hidden sm:table-cell">{t.admin.usersColBiographies}</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t.admin.usersColActions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loadingUsers ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3"><div className="h-8 w-8 rounded-full bg-muted animate-pulse" /></td>
                        <td className="px-4 py-3"><div className="h-4 w-32 bg-muted rounded animate-pulse" /></td>
                        <td className="px-4 py-3 hidden md:table-cell"><div className="h-4 w-44 bg-muted rounded animate-pulse" /></td>
                        <td className="px-4 py-3"><div className="h-8 w-28 bg-muted rounded animate-pulse" /></td>
                        <td className="px-4 py-3 hidden lg:table-cell"><div className="h-4 w-24 bg-muted rounded animate-pulse" /></td>
                        <td className="px-4 py-3 hidden sm:table-cell"><div className="h-4 w-8 bg-muted rounded animate-pulse mx-auto" /></td>
                        <td className="px-4 py-3"><div className="h-8 w-20 bg-muted rounded animate-pulse ml-auto" /></td>
                      </tr>
                    ))
                  ) : pageUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-sm">
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    pageUsers.map((u) => {
                      const isSelf = u.id === user?.id;
                      const displayName = u.full_name || u.email || u.id;
                      const initial = displayName.charAt(0).toUpperCase();
                      const currentRole = pendingChanges[u.id] ?? u.role;
                      const hasChanged = pendingChanges[u.id] !== undefined && pendingChanges[u.id] !== u.role;
                      const isSavingThis = saving === u.id;

                      return (
                        <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white dark:text-[#121212] text-xs font-bold shrink-0 ${getAvatarColor(displayName)}`}>
                              {initial}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-foreground truncate max-w-[160px]">
                              {u.full_name || <span className="text-muted-foreground italic">—</span>}
                            </div>
                            <div className="text-xs text-muted-foreground truncate max-w-[160px] md:hidden">
                              {u.email}
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span className="text-muted-foreground truncate max-w-[200px] block">{u.email ?? '—'}</span>
                          </td>
                          <td className="px-4 py-3">
                            {isSelf ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="inline-block">
                                    <Select value={currentRole} disabled>
                                      <SelectTrigger className="w-36 h-8 text-xs opacity-60 cursor-not-allowed">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {ROLE_ORDER.map((r) => (
                                          <SelectItem key={r} value={r} className="text-xs">
                                            {getRoleLabel(r)}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p>{t.admin.usersCannotChangeSelfTooltip}</p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <Select
                                value={currentRole}
                                onValueChange={(v) => handleRoleChange(u.id, v as UserRole)}
                              >
                                <SelectTrigger className="w-36 h-8 text-xs">
                                  <SelectValue>
                                    {getRoleBadge(currentRole, getRoleLabel(currentRole))}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {ROLE_ORDER.map((r) => (
                                    <SelectItem key={r} value={r} className="text-xs">
                                      <div className="flex items-center gap-2">
                                        {getRoleBadge(r, getRoleLabel(r))}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell text-xs">
                            {formatDate(u.created_at)}
                          </td>
                          <td className="px-4 py-3 text-center hidden sm:table-cell">
                            <span className="text-sm font-medium text-foreground tabular-nums">{u.biography_count}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {hasChanged && !isSelf ? (
                              <Button
                                size="sm"
                                className="h-8 text-xs"
                                disabled={isSavingThis}
                                onClick={() => handleSaveClick(u)}
                              >
                                {isSavingThis ? '…' : t.admin.usersSaveRole}
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="mt-5 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="gap-1.5"
              >
                <ChevronLeft className="h-4 w-4" />
                {t.admin.usersPrev}
              </Button>
              <span className="text-sm text-muted-foreground tabular-nums">
                {page} {t.admin.usersPageOf} {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="gap-1.5"
              >
                {t.admin.usersNext}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={!!confirmChange} onOpenChange={(open) => { if (!open) setConfirmChange(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.admin.usersChangeRoleTitle}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {t.admin.usersChangeRoleMessage
                    .replace('{name}', confirmChange?.name ?? '')
                    .replace('{old}', getRoleLabel(confirmChange?.oldRole ?? 'user'))
                    .replace('{new}', getRoleLabel(confirmChange?.newRole ?? 'user'))}
                </p>
                {confirmChange && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/60">
                    {getRoleBadge(confirmChange.oldRole, getRoleLabel(confirmChange.oldRole))}
                    <span className="text-xs text-muted-foreground">→</span>
                    {getRoleBadge(confirmChange.newRole, getRoleLabel(confirmChange.newRole))}
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmChange}>{t.common.confirm}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
