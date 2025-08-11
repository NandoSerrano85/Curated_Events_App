import { useQuery } from "@tanstack/react-query";
import { fetchEvents } from "@/lib/api";
import type { EventItem, EventFilters } from "@/types/event";
import { EventCard } from "./EventCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { FilterValues } from "./EventFilters";

interface Props {
  filters?: FilterValues;
  onSelect?: (event: EventItem) => void;
}

export function EventGrid({ filters, onSelect }: Props) {
  // Convert FilterValues to EventFilters for API calls
  const convertToEventFilters = (filters?: FilterValues): EventFilters | undefined => {
    if (!filters) return undefined;
    
    return {
      q: filters.search,
      category: filters.category === 'all' ? undefined : filters.category,
      location: filters.location,
      startDate: filters.dateFrom,
      endDate: filters.dateTo,
    };
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ["events", filters],
    queryFn: () => fetchEvents(convertToEventFilters(filters)),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-[3/2] w-full" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-8 text-center">
        <p className="text-destructive mb-2">Failed to load events</p>
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : 'An unexpected error occurred'}
        </p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        No events found. Try adjusting your filters.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((e) => (
        <EventCard key={e.id} event={e} onView={() => onSelect?.(e)} />
      ))}
    </div>
  );
}
