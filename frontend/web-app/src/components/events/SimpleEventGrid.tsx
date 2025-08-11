import React from "react";
import { EventCard } from "./EventCard";
import type { EventItem } from "@/types/event";

// Simple demo data for testing
const demoEvents: EventItem[] = [
  {
    id: "1",
    title: "Tech Conference 2025",
    description: "Join us for the latest in tech innovation",
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
    location: "San Francisco, CA",
    category: "technology",
    capacity: 500,
  },
  {
    id: "2",
    title: "Music Festival",
    description: "Amazing artists and great music",
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    location: "Austin, TX",
    category: "music",
    capacity: 2000,
  },
  {
    id: "3",
    title: "Art Exhibition",
    description: "Contemporary art showcase",
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 21).toISOString(),
    location: "New York, NY",
    category: "art",
    capacity: 200,
  },
];

interface Props {
  onSelect?: (event: EventItem) => void;
}

export function SimpleEventGrid({ onSelect }: Props) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {demoEvents.map((event) => (
        <EventCard key={event.id} event={event} onView={() => onSelect?.(event)} />
      ))}
    </div>
  );
}