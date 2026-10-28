import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SAVE_DEBOUNCE_MS, createSaveScheduler } from '@/lib/editor/save-scheduler';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('salvataggio poco dopo l\'ultima modifica', () => {
  it('il ritardo è di 2 secondi', () => {
    expect(SAVE_DEBOUNCE_MS).toBe(2000);
  });

  it('salva 2 secondi dopo una modifica, non prima', () => {
    const run = vi.fn();
    const scheduler = createSaveScheduler(run);
    scheduler.schedule();
    vi.advanceTimersByTime(1999);
    expect(run).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(run).toHaveBeenCalledTimes(1);
    expect(scheduler.pending()).toBe(false);
  });

  it('mentre si scrive non salva: ogni modifica rimanda il salvataggio, e ne parte uno solo alla fine', () => {
    const run = vi.fn();
    const scheduler = createSaveScheduler(run);
    for (let i = 0; i < 10; i++) {
      scheduler.schedule();
      vi.advanceTimersByTime(1000);
    }
    expect(run).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2000);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('annulla il salvataggio in attesa', () => {
    const run = vi.fn();
    const scheduler = createSaveScheduler(run);
    scheduler.schedule();
    expect(scheduler.pending()).toBe(true);
    scheduler.cancel();
    expect(scheduler.pending()).toBe(false);
    vi.advanceTimersByTime(5000);
    expect(run).not.toHaveBeenCalled();
  });

  it('dopo un salvataggio, una nuova modifica ne programma un altro', () => {
    const run = vi.fn();
    const scheduler = createSaveScheduler(run, 500);
    scheduler.schedule();
    vi.advanceTimersByTime(500);
    scheduler.schedule();
    vi.advanceTimersByTime(500);
    expect(run).toHaveBeenCalledTimes(2);
  });
});
