import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useScreenPlayer } from '../../hooks/useScreenPlayer';

// Mock logger
vi.mock('../../lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn()
  }
}));

describe('useScreenPlayer', () => {
  const mockPlaylist = [
    { id: '1', name: 'Video 1', url: '/video1.mp4', type: 'video' as const },
    { id: '2', name: 'Image 1', url: '/image1.jpg', type: 'image' as const, duration: 5 },
    { id: '3', name: 'Video 2', url: '/video2.mp4', type: 'video' as const }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with first item', () => {
    const { result } = renderHook(() => useScreenPlayer(mockPlaylist));
    
    expect(result.current.currentItem).toEqual(mockPlaylist[0]);
    expect(result.current.currentIndex).toBe(0);
  });

  it('should navigate to next item', () => {
    const { result } = renderHook(() => useScreenPlayer(mockPlaylist));
    
    act(() => {
      result.current.goToNext();
    });
    
    expect(result.current.currentIndex).toBe(1);
    expect(result.current.currentItem).toEqual(mockPlaylist[1]);
  });

  it('should navigate to previous item', () => {
    const { result } = renderHook(() => useScreenPlayer(mockPlaylist));
    
    // Go to second item first
    act(() => {
      result.current.goToNext();
    });
    
    // Then go back
    act(() => {
      result.current.goToPrevious();
    });
    
    expect(result.current.currentIndex).toBe(0);
  });

  it('should loop to first item when reaching end', () => {
    const { result } = renderHook(() => useScreenPlayer(mockPlaylist));
    
    // Go to last item
    act(() => {
      result.current.goToItem(2);
    });
    
    // Go to next (should loop to first)
    act(() => {
      result.current.goToNext();
    });
    
    expect(result.current.currentIndex).toBe(0);
  });

  it('should auto-advance for images with duration', () => {
    const { result } = renderHook(() => useScreenPlayer(mockPlaylist));
    
    // Go to image item
    act(() => {
      result.current.goToItem(1);
    });
    
    expect(result.current.currentItem?.type).toBe('image');
    
    // Fast-forward timer
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    
    expect(result.current.currentIndex).toBe(2);
  });
});