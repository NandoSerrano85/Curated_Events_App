import { useState, useMemo, useEffect } from "react";
import { Hero } from "@/components/sections/Hero";
// import { EventFilters, type FilterValues } from "@/components/events/EventFilters";
// import { EventGrid } from "@/components/events/EventGrid";
import { SimpleEventGrid } from "@/components/events/SimpleEventGrid";

// Simple FilterValues type for now
type FilterValues = {
  search?: string;
  category?: string;
};
import type { EventItem } from "@/types/event";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin } from "lucide-react";
// import { AuthDialog } from "@/components/auth/AuthDialog";
// import { UserMenu } from "@/components/auth/UserMenu";
// import { useAuth } from "@/hooks/useAuth";
// Temporarily comment out problematic imports
// import { ConnectionStatus } from "@/components/ui/ConnectionStatus";
// import { useLiveEventUpdates } from "@/hooks/useLiveEventUpdates";

const Index = () => {
  // const { isAuthenticated, isLoading } = useAuth(); // Temporarily commented out
  // const { isConnected } = useLiveEventUpdates(); // Temporarily commented out
  const [filters, setFilters] = useState<FilterValues>({});
  const [selected, setSelected] = useState<EventItem | null>(null);
  // const [authDialogOpen, setAuthDialogOpen] = useState(false); // Temporarily commented out

  useEffect(() => {
    document.title = "Curated Events • Discover the Best Events";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Discover curated tech, music, and art events. Search, filter, and explore events with a delightful web experience.");
  }, []);

  const headerTitle = useMemo(() => {
    const parts: string[] = [];
    if (filters.category && filters.category !== "all") parts.push(String(filters.category));
    if (filters.location) parts.push(String(filters.location));
    return parts.length ? `Events · ${parts.join(" · ")}` : "Trending events";
  }, [filters]);

  return (
    <div className="min-h-screen bg-background">
      <header className="container mx-auto py-6">
        <nav className="flex items-center justify-between">
          <a href="/" className="text-xl font-semibold">Curated Events</a>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <a href="#how-it-works">About</a>
            </Button>
            <Button>Get Started</Button>
          </div>
        </nav>
      </header>

      <main className="container mx-auto space-y-10 pb-16">
        <Hero />

        <section aria-labelledby="events-section" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 id="events-section" className="text-xl font-semibold">{headerTitle}</h2>
            {/* <ConnectionStatus /> */}
          </div>
          <SimpleEventGrid onSelect={(e) => setSelected(e)} />
        </section>
      </main>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.title}</DialogTitle>
                <DialogDescription>{selected.description}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="size-4" />
                  <span>{new Date(selected.date).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="size-4" />
                  <span>{selected.location}</span>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setSelected(null)}>Close</Button>
                <Button 
                  onClick={() => {
                    console.log('RSVP to event:', selected.id);
                  }}
                >
                  RSVP
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* <AuthDialog 
        open={authDialogOpen} 
        onOpenChange={setAuthDialogOpen} 
      /> */}
    </div>
  );
};

export default Index;
