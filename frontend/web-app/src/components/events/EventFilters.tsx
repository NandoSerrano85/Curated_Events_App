import { useState, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES, searchEvents, getSearchSuggestions } from "@/lib/api";
import type { EventCategory, EventFilters } from "@/types/event";
import { CalendarSearch, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";

export interface FilterValues {
  search?: string;
  category?: EventCategory | "all";
  location?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface Props {
  onApply: (filters: FilterValues) => void;
  initial?: FilterValues;
}

export function EventFilters({ onApply, initial }: Props) {
  const [search, setSearch] = useState(initial?.search || "");
  const [category, setCategory] = useState<EventCategory | "all">(initial?.category || "all");
  const [location, setLocation] = useState(initial?.location || "");
  const [dateFrom, setDateFrom] = useState(initial?.dateFrom || "");
  const [dateTo, setDateTo] = useState(initial?.dateTo || "");
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Convert FilterValues to EventFilters for API calls
  const convertToEventFilters = useCallback((filters: FilterValues): EventFilters => {
    return {
      q: filters.search,
      category: filters.category === 'all' ? undefined : filters.category,
      location: filters.location,
      startDate: filters.dateFrom,
      endDate: filters.dateTo,
    };
  }, []);

  // Get search suggestions when user types
  const { data: suggestions } = useQuery({
    queryKey: ['search-suggestions', search],
    queryFn: () => getSearchSuggestions(search),
    enabled: search.length > 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return (
    <form
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6"
      onSubmit={(e) => {
        e.preventDefault();
        onApply({ search, category, location, dateFrom, dateTo });
      }}
      aria-label="Search and filter events"
    >
      <div className="lg:col-span-2">
        <Popover open={showSuggestions && (suggestions?.length || 0) > 0} onOpenChange={setShowSuggestions}>
          <PopoverTrigger asChild>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setShowSuggestions(e.target.value.length > 2);
                }}
                onFocus={() => setShowSuggestions(search.length > 2)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Search events..."
                className="pl-9"
                aria-label="Search events"
              />
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandList>
                <CommandEmpty>No suggestions found.</CommandEmpty>
                <CommandGroup heading="Suggestions">
                  {suggestions?.map((suggestion, index) => (
                    <CommandItem
                      key={index}
                      onSelect={() => {
                        setSearch(suggestion);
                        setShowSuggestions(false);
                      }}
                    >
                      <Search className="mr-2 h-4 w-4" />
                      {suggestion}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <Select value={category} onValueChange={(v) => setCategory(v as any)}>
        <SelectTrigger aria-label="Filter by category">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {CATEGORIES.map((c) => (
            <SelectItem key={c.value} value={c.value}>
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Location"
        aria-label="Filter by location"
      />

      <div className="relative">
        <CalendarSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          aria-label="From date"
          className="pl-9"
        />
      </div>

      <Input
        type="date"
        value={dateTo}
        onChange={(e) => setDateTo(e.target.value)}
        aria-label="To date"
      />

      <div className="flex items-center gap-2">
        <Button type="submit" className="w-full" variant="default">
          Apply
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setSearch("");
            setCategory("all");
            setLocation("");
            setDateFrom("");
            setDateTo("");
            onApply({});
          }}
        >
          Reset
        </Button>
      </div>
    </form>
  );
}
