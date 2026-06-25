'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Users, Search, ChevronLeft, ChevronRight, Ban, RotateCcw, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
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

type AccountStatus = 'active' | 'suspended';

interface UserRow {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  account_status: AccountStatus;
  created_at: string;
  biography_count: number;
}

interface PendingChange {
  userId: string;
  name: string;
  oldRole: UserRole;
  newRole: UserRole;
}

type PendingAccountAction = 'suspend' | 'reinstate' | 'delete';

const PAGE_SIZE = 20;

const REVIEW_LANG_CODES = ['en', 'it', 'fr', 'de'] as const;

const ROLE_ORDER: UserRole[] = ['user', 'reviewer', 'admin', 'super_admin'];

function getRoleBadge(role: UserRole, label: string) {
  const base = 'text-xs font-semibold px-2 py-0.5 rounded-full border';
  switch (role) {
    case 'super_admin':
      return <span className={`${base} bg-[#6D323E] text-white border-brand-wine/35 dark:bg-[#6D323E] dark:text-white dark:border-brand-wine/45`}>{label}</span>;
    case 'admin':
      return <span className={`${base} bg-[#DDCF88] text-[#121212] border-brand-mustardDark/50 dark:bg-[#DDCF88]/20 dark:text-[#DDCF88] dark:border-brand-mustardDark/40`}>{label}</span>;
    case 'reviewer':
      return <span className={`${base} bg-[#C4DAEB] text-[#121212] border-brand-blue/55 dark:bg-[#C4DAEB]/20 dark:text-[#C4DAEB] dark:border-brand-blue/40`}>{label}</span>;
    default:
      return <span className={`${base} bg-brand-beigeBg text-brand-ink border-brand-greenDark/25 dark:bg-brand-ink/35 dark:text-brand-beigeLight dark:border-brand-greenDark/40`}>{label}</span>;
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
  const { toast } = useToast();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pendingChanges, setPendingChanges] = useState<Record<string, UserRole>>({});
  const [confirmChange, setConfirmChange] = useState<PendingChange | null>(null);
  const [confirmAccount, setConfirmAccount] = useState<{
    action: PendingAccountAction;
    user: UserRow;
  } | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [accountActionLoading, setAccountActionLoading] = useState<string | null>(null);
  const [reviewerLangs, setReviewerLangs] = useState<Record<string, string[]>>({});
  const [savingReviewerLangs, setSavingReviewerLangs] = useState<string | null>(null);

  const isStaffAdmin = role === 'admin' || role === 'super_admin';
  const canEditRoles = role === 'super_admin';

  function canManageTargetRow(u: UserRow): boolean {
    if (!user || u.id === user.id) return false;
    if (role === 'super_admin') return true;
    if (role === 'admin') return u.role === 'user' || u.role === 'reviewer';
    return false;
  }

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    setLoadError(null);
    try {
      let profiles: unknown[] | null = null;

      const full = await supabase
        .from('profiles')
        .select('id, name, email, role, account_status, created_at')
        .order('created_at', { ascending: false });

      if (full.error) {
        const legacy = await supabase
          .from('profiles')
          .select('id, name, email, role, created_at')
          .order('created_at', { ascending: false });
        if (legacy.error) throw legacy.error;
        profiles = legacy.data as unknown[];
      } else {
        profiles = full.data as unknown[];
      }

      const { data: bioCounts, error: bioError } = await supabase
        .from('biographies')
        .select('user_id');

      if (bioError) throw bioError;

      const { data: langRows, error: langError } = await supabase
        .from('reviewer_languages')
        .select('user_id, language_code');

      if (langError) throw langError;

      const langMap: Record<string, string[]> = {};
      for (const row of langRows ?? []) {
        const uid = (row as { user_id: string; language_code: string }).user_id;
        const code = (row as { user_id: string; language_code: string }).language_code;
        if (!langMap[uid]) langMap[uid] = [];
        langMap[uid].push(code);
      }
      setReviewerLangs(langMap);

      const countMap: Record<string, number> = {};
      for (const b of bioCounts ?? []) {
        countMap[b.user_id] = (countMap[b.user_id] ?? 0) + 1;
      }

      const rows: UserRow[] = (profiles ?? []).map((p) => {
        const row = p as {
          id: string;
          name: string | null;
          email: string | null;
          role: string;
          account_status?: string;
          created_at: string;
        };
        return {
          id: row.id,
          full_name: row.name,
          email: row.email ?? null,
          role: row.role as UserRole,
          account_status: (row.account_status ?? 'active') as AccountStatus,
          created_at: row.created_at,
          biography_count: countMap[row.id] ?? 0,
        };
      });

      setUsers(rows);
    } catch {
      setLoadError(t.admin.usersLoadError);
    } finally {
      setLoadingUsers(false);
    }
  }, [t.admin.usersLoadError]);

  useEffect(() => {
    if (loading || !isStaffAdmin) return;
    void loadUsers();
  }, [loading, isStaffAdmin, loadUsers]);

  async function toggleReviewerLanguage(userId: string, code: string, enabled: boolean) {
    if (!user || !isStaffAdmin) return;
    setSavingReviewerLangs(userId);
    try {
      if (enabled) {
        const { error } = await supabase.from('reviewer_languages').insert({
          user_id: userId,
          language_code: code,
          assigned_by: user.id,
        });
        if (error) throw error;
        setReviewerLangs((prev) => ({
          ...prev,
          [userId]: [...(prev[userId] ?? []).filter((c) => c !== code), code],
        }));
      } else {
        const { error } = await supabase
          .from('reviewer_languages')
          .delete()
          .eq('user_id', userId)
          .eq('language_code', code);
        if (error) throw error;
        setReviewerLangs((prev) => ({
          ...prev,
          [userId]: (prev[userId] ?? []).filter((c) => c !== code),
        }));
      }
      toast({ title: t.admin.usersReviewerLanguagesSaved });
    } catch {
      toast({ title: t.admin.usersReviewerLanguagesError, variant: 'destructive' });
    } finally {
      setSavingReviewerLangs(null);
    }
  }

  async function callAdminUserApi(path: string, method: 'POST' | 'DELETE') {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('no_session');
    const res = await fetch(path, {
      method,
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((body as { error?: string }).error ?? 'request_failed');
  }

  async function handleConfirmAccountAction() {
    if (!confirmAccount) return;
    const { action, user: u } = confirmAccount;
    setAccountActionLoading(u.id);
    try {
      const base = `/api/admin/users/${u.id}`;
      if (action === 'suspend') await callAdminUserApi(`${base}/suspend`, 'POST');
      else if (action === 'reinstate') await callAdminUserApi(`${base}/reinstate`, 'POST');
      else await callAdminUserApi(base, 'DELETE');

      setUsers((prev) =>
        action === 'delete'
          ? prev.filter((x) => x.id !== u.id)
          : prev.map((x) =>
              x.id === u.id
                ? { ...x, account_status: action === 'suspend' ? 'suspended' : 'active' }
                : x
            )
      );
      if (action === 'suspend') toast({ title: t.admin.usersToastSuspended });
      else if (action === 'reinstate') toast({ title: t.admin.usersToastReinstated });
      else toast({ title: t.admin.usersToastDeleted });
    } catch {
      toast({ title: t.admin.usersActionFailed, variant: 'destructive' });
    } finally {
      setAccountActionLoading(null);
      setConfirmAccount(null);
    }
  }

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
    if (!canEditRoles) return;
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
      const res = await fetch(`/api/admin/users/${confirmChange.userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: confirmChange.newRole }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed');
      }

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

  return (
    <TooltipProvider>
      <>
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
            <div className="mb-4 p-4 rounded-xl bg-brand-wine/10 dark:bg-brand-wine/15 text-sm text-brand-wineDark dark:text-brand-mustardLight">
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
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">{t.admin.usersReviewerLanguages}</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden xl:table-cell">{t.admin.usersColStatus}</th>
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
                        <td className="px-4 py-3 hidden xl:table-cell"><div className="h-4 w-16 bg-muted rounded animate-pulse" /></td>
                        <td className="px-4 py-3 hidden lg:table-cell"><div className="h-4 w-24 bg-muted rounded animate-pulse" /></td>
                        <td className="px-4 py-3 hidden sm:table-cell"><div className="h-4 w-8 bg-muted rounded animate-pulse mx-auto" /></td>
                        <td className="px-4 py-3"><div className="h-8 w-20 bg-muted rounded animate-pulse ml-auto" /></td>
                      </tr>
                    ))
                  ) : pageUsers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground text-sm">
                        {t.admin.usersNoUsersFound}
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
                      const showRoleSelect = canEditRoles && !isSelf;
                      const manage = canManageTargetRow(u);
                      const busyAccount = accountActionLoading === u.id;

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
                            ) : showRoleSelect ? (
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
                            ) : (
                              <span className="inline-flex">{getRoleBadge(currentRole, getRoleLabel(currentRole))}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            {(currentRole === 'reviewer' || currentRole === 'admin' || currentRole === 'super_admin') && isStaffAdmin ? (
                              <div className="flex flex-wrap gap-1">
                                {REVIEW_LANG_CODES.map((code) => {
                                  const active = (reviewerLangs[u.id] ?? []).includes(code);
                                  const busy = savingReviewerLangs === u.id;
                                  return (
                                    <button
                                      key={code}
                                      type="button"
                                      disabled={busy || isSelf}
                                      onClick={() => void toggleReviewerLanguage(u.id, code, !active)}
                                      className={`text-[10px] uppercase px-1.5 py-0.5 rounded border transition-colors ${
                                        active
                                          ? 'bg-brand-blue/30 border-brand-blue/50 text-brand-ink'
                                          : 'border-border text-muted-foreground hover:bg-muted/50'
                                      } disabled:opacity-50`}
                                    >
                                      {code}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 hidden xl:table-cell">
                            <Badge
                              variant="outline"
                              className={
                                u.account_status === 'suspended'
                                  ? 'text-brand-wineDark border-brand-wine/40 bg-brand-wine/8'
                                  : 'border-border'
                              }
                            >
                              {u.account_status === 'suspended' ? t.admin.usersStatusSuspended : t.admin.usersStatusActive}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell text-xs">
                            {formatDate(u.created_at)}
                          </td>
                          <td className="px-4 py-3 text-center hidden sm:table-cell">
                            <span className="text-sm font-medium text-foreground tabular-nums">{u.biography_count}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex flex-col items-end gap-1.5 min-w-[7rem]">
                              {canEditRoles && hasChanged && !isSelf && (
                                <Button
                                  size="sm"
                                  className="h-8 text-xs"
                                  disabled={isSavingThis}
                                  onClick={() => handleSaveClick(u)}
                                >
                                  {isSavingThis ? '…' : t.admin.usersSaveRole}
                                </Button>
                              )}
                              {manage && (
                                <div className="flex items-center justify-end gap-0.5">
                                  {u.account_status === 'active' ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          type="button"
                                          className="p-2 rounded-md text-muted-foreground hover:text-brand-wineDark hover:bg-brand-wine/10 disabled:opacity-50"
                                          disabled={busyAccount}
                                          onClick={() => setConfirmAccount({ action: 'suspend', user: u })}
                                          aria-label={t.admin.usersSuspend}
                                        >
                                          <Ban className="h-4 w-4" />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent>{t.admin.usersSuspend}</TooltipContent>
                                    </Tooltip>
                                  ) : (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          type="button"
                                          className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50"
                                          disabled={busyAccount}
                                          onClick={() => setConfirmAccount({ action: 'reinstate', user: u })}
                                          aria-label={t.admin.usersReinstate}
                                        >
                                          <RotateCcw className="h-4 w-4" />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent>{t.admin.usersReinstate}</TooltipContent>
                                    </Tooltip>
                                  )}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        type="button"
                                        className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-50"
                                        disabled={busyAccount}
                                        onClick={() => setConfirmAccount({ action: 'delete', user: u })}
                                        aria-label={t.admin.usersDeleteUser}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent>{t.admin.usersDeleteUser}</TooltipContent>
                                  </Tooltip>
                                </div>
                              )}
                              {!manage && !(canEditRoles && hasChanged && !isSelf) && (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </div>
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

      <AlertDialog open={!!confirmAccount} onOpenChange={(open) => { if (!open) setConfirmAccount(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAccount?.action === 'suspend' && t.admin.usersConfirmSuspendTitle}
              {confirmAccount?.action === 'reinstate' && t.admin.usersConfirmReinstateTitle}
              {confirmAccount?.action === 'delete' && t.admin.usersConfirmDeleteTitle}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <p className="text-sm text-muted-foreground">
                {confirmAccount?.action === 'suspend' && t.admin.usersConfirmSuspendDetail}
                {confirmAccount?.action === 'reinstate' && t.admin.usersConfirmReinstateDetail}
                {confirmAccount?.action === 'delete' && t.admin.usersConfirmDeleteDetail}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!accountActionLoading}>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmAccountAction();
              }}
              disabled={!!accountActionLoading}
              className={confirmAccount?.action === 'delete' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : undefined}
            >
              {accountActionLoading ? '…' : t.common.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </>
    </TooltipProvider>
  );
}
