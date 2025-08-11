import { Calendar, MapPin, Ticket, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { EventItem, EventCategory } from "@/types/event";

interface Props {
  event: EventItem;
  onView?: (id: string) => void;
}

export function EventCard({ event, onView }: Props) {
  const dt = new Date(event.date);
  const dateLabel = dt.toLocaleString(undefined, {
    weekday: "short",
    month: "short", 
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const getCategoryStyle = (category: EventCategory) => {
    const styles = {
      tech: "bg-gradient-to-r from-primary-100 to-primary-200 text-primary-800 border border-primary-300",
      music: "bg-gradient-to-r from-pastel-pink to-pastel-rose text-secondary-800 border border-secondary-300",
      art: "bg-gradient-to-r from-pastel-lavender to-pastel-purple text-accent-800 border border-accent-300", 
      sports: "bg-gradient-to-r from-pastel-orange to-pastel-peach text-orange-800 border border-orange-300",
      business: "bg-gradient-to-r from-pastel-mint to-pastel-emerald text-accent-800 border border-accent-300",
      other: "bg-gradient-to-r from-neutral-100 to-neutral-200 text-neutral-800 border border-neutral-300"
    };
    return styles[category] || styles.other;
  };

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-large hover:-translate-y-1 card-pastel animate-fade-in">
      {event.imageUrl && (
        <div className="aspect-[3/2] overflow-hidden relative">
          <img
            src={event.imageUrl}
            alt={`${event.title} event cover image`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute top-3 right-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getCategoryStyle(event.category)} backdrop-blur-sm`}>
              {event.category}
            </span>
          </div>
        </div>
      )}

      <CardHeader className="pb-3">
        <CardTitle className="line-clamp-1 group-hover:text-primary transition-colors duration-200">
          {event.title}
        </CardTitle>
        <CardDescription className="line-clamp-2 leading-relaxed">
          {event.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3 pb-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="w-4 h-4 text-primary">
            <Calendar className="size-4" aria-hidden="true" />
          </div>
          <span className="font-medium text-sm">{dateLabel}</span>
        </div>
        
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="w-4 h-4 text-accent">
            <MapPin className="size-4" aria-hidden="true" />
          </div>
          <span className="line-clamp-1 font-medium text-sm">{event.location}</span>
        </div>

        {event.capacity && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-4 h-4 text-secondary">
              <Users className="size-4" aria-hidden="true" />
            </div>
            <span className="font-medium text-sm">{event.capacity} spots available</span>
          </div>
        )}

        {!event.imageUrl && (
          <div className="flex justify-start mb-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getCategoryStyle(event.category)}`}>
              {event.category}
            </span>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-4 border-t border-border/50">
        <Button 
          variant="default" 
          size="sm" 
          onClick={() => onView?.(event.id)} 
          aria-label={`View details for ${event.title}`}
          className="w-full group/btn transition-all duration-200 hover:scale-102"
        >
          <Ticket className="size-4 mr-2 group-hover/btn:rotate-12 transition-transform duration-200" />
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
}
