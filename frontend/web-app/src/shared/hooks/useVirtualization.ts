import { useState, useEffect, useMemo, useCallback } from 'react';

interface VirtualizationOptions {
  itemHeight: number | ((index: number) => number);
  containerHeight: number;
  overscan?: number;
  scrollElement?: HTMLElement | null;
}

interface VirtualizationResult {
  virtualItems: Array<{
    index: number;
    start: number;
    size: number;
    end: number;
  }>;
  totalSize: number;
  scrollOffset: number;
  setScrollElement: (element: HTMLElement | null) => void;
}

export const useVirtualization = (
  itemCount: number,
  options: VirtualizationOptions
): VirtualizationResult => {
  const { itemHeight, containerHeight, overscan = 3 } = options;
  const [scrollOffset, setScrollOffset] = useState(0);
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(
    options.scrollElement || null
  );

  // Calculate item positions and sizes
  const { totalSize, itemPositions } = useMemo(() => {
    const positions: Array<{ start: number; size: number; end: number }> = [];
    let totalHeight = 0;

    for (let i = 0; i < itemCount; i++) {
      const size = typeof itemHeight === 'function' ? itemHeight(i) : itemHeight;
      const start = totalHeight;
      const end = start + size;
      
      positions.push({ start, size, end });
      totalHeight = end;
    }

    return {
      totalSize: totalHeight,
      itemPositions: positions,
    };
  }, [itemCount, itemHeight]);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const scrollTop = scrollOffset;
    const scrollBottom = scrollTop + containerHeight;

    let startIndex = 0;
    let endIndex = itemCount - 1;

    // Find start index using binary search
    let low = 0;
    let high = itemCount - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const item = itemPositions[mid];

      if (item.end <= scrollTop) {
        low = mid + 1;
      } else if (item.start > scrollTop) {
        high = mid - 1;
      } else {
        startIndex = mid;
        break;
      }
    }

    if (low > high) {
      startIndex = low;
    }

    // Find end index
    for (let i = startIndex; i < itemCount; i++) {
      const item = itemPositions[i];
      if (item.start >= scrollBottom) {
        endIndex = i - 1;
        break;
      }
    }

    // Apply overscan
    const overscanStart = Math.max(0, startIndex - overscan);
    const overscanEnd = Math.min(itemCount - 1, endIndex + overscan);

    return { start: overscanStart, end: overscanEnd };
  }, [scrollOffset, containerHeight, itemPositions, itemCount, overscan]);

  // Generate virtual items
  const virtualItems = useMemo(() => {
    const items = [];
    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      const position = itemPositions[i];
      items.push({
        index: i,
        start: position.start,
        size: position.size,
        end: position.end,
      });
    }
    return items;
  }, [visibleRange, itemPositions]);

  // Handle scroll events
  const handleScroll = useCallback((event: Event) => {
    const target = event.target as HTMLElement;
    setScrollOffset(target.scrollTop);
  }, []);

  // Setup scroll listener
  useEffect(() => {
    if (!scrollElement) return;

    const element = scrollElement;
    element.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      element.removeEventListener('scroll', handleScroll);
    };
  }, [scrollElement, handleScroll]);

  return {
    virtualItems,
    totalSize,
    scrollOffset,
    setScrollElement,
  };
};

// Hook for infinite scrolling with virtualization
export const useInfiniteVirtualization = <T>(
  items: T[],
  options: VirtualizationOptions & {
    hasNextPage?: boolean;
    isFetchingNextPage?: boolean;
    fetchNextPage?: () => void;
    threshold?: number;
  }
) => {
  const { hasNextPage, isFetchingNextPage, fetchNextPage, threshold = 5 } = options;
  
  const virtualization = useVirtualization(items.length, options);
  
  // Check if we need to fetch more data
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage || !fetchNextPage) return;
    
    const lastVisibleIndex = Math.max(
      ...virtualization.virtualItems.map(item => item.index)
    );
    
    if (items.length - lastVisibleIndex <= threshold) {
      fetchNextPage();
    }
  }, [
    virtualization.virtualItems,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    items.length,
    threshold,
  ]);

  return virtualization;
};

// Hook for measuring dynamic item heights
export const useMeasure = () => {
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
  }>({ width: 0, height: 0 });

  const measureRef = useCallback((node: HTMLElement | null) => {
    if (!node) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });

    resizeObserver.observe(node);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return { dimensions, measureRef };
};