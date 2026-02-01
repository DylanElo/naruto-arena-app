import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import useDebounce from './useDebounce';

describe('useDebounce', () => {
  it('should return the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));
    expect(result.current).toBe('initial');
  });

  it('should debounce value updates', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'initial', delay: 500 },
    });

    // Update value
    rerender({ value: 'updated', delay: 500 });

    // Should not update immediately
    expect(result.current).toBe('initial');

    // Fast-forward time partially
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(result.current).toBe('initial');

    // Fast-forward time to completion
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(result.current).toBe('updated');

    vi.useRealTimers();
  });

  it('should cancel previous timeout on value change', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'initial', delay: 500 },
    });

    rerender({ value: 'update1', delay: 500 });

    act(() => {
      vi.advanceTimersByTime(250);
    });

    // Update again before timeout finishes
    rerender({ value: 'update2', delay: 500 });

    act(() => {
      vi.advanceTimersByTime(250);
    });
    // Total time 500ms since start, but only 250ms since update2
    // Should still be 'initial' (or 'update1' if it updated? No, update1 was cancelled)
    expect(result.current).toBe('initial');

    act(() => {
      vi.advanceTimersByTime(250);
    });
    // Now 500ms since update2
    expect(result.current).toBe('update2');

    vi.useRealTimers();
  });
});
