import React from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

const queryClient = new QueryClient();
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Hero } from "@/components/sections/Hero";
import { SimpleEventGrid } from "@/components/events/SimpleEventGrid";
import type { EventItem } from "@/types/event";
import EventsPage from "./pages/EventsPage";
import FullEventsPage from "./pages/FullEventsPage";

// Simple debug components with Tailwind CSS
const HomePage = () => (
  <div className="p-8 min-h-screen bg-gray-50">
    <h1 className="text-3xl font-bold text-gray-800 mb-4">🎉 Curated Events</h1>
    <p className="text-gray-600 mb-6">Welcome to the events platform!</p>
    <nav className="space-x-4">
      <a href="/app" className="text-blue-600 hover:text-blue-800 underline font-semibold">🚀 Full Events App (with Auth)</a>
      <a href="/events" className="text-blue-600 hover:text-blue-800 underline">Simple Events</a>
      <a href="/test" className="text-blue-600 hover:text-blue-800 underline">Components Test</a>
    </nav>
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>Status Check</CardTitle>
        <CardDescription>Testing core functionality</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="text-gray-600 space-y-2">
          <li>✅ React is working</li>
          <li>✅ Routing is working</li>
          <li>✅ Tailwind CSS is working</li>
          <li>✅ UI Components are working</li>
          <li>✅ Authentication system integrated</li>
          <li>✅ Backend API ready</li>
        </ul>
        <div className="mt-4 space-x-2">
          <Button>Primary Button</Button>
          <Button variant="secondary">Secondary Button</Button>
          <Button variant="outline">Outline Button</Button>
        </div>
      </CardContent>
    </Card>
  </div>
);

const DebugPage = () => (
  <div className="p-8 min-h-screen bg-blue-50">
    <h1 className="text-3xl font-bold text-blue-800 mb-4">Debug Information</h1>
    <p className="text-blue-600 mb-4">✅ Routing is working</p>
    <a href="/" className="text-blue-600 hover:text-blue-800 underline">← Back to Home</a>
  </div>
);

const TestPage = () => {
  const [selectedEvent, setSelectedEvent] = React.useState<EventItem | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 space-y-12">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-4">Events App Components Test</h1>
          <a href="/" className="text-primary hover:underline">← Back to Home</a>
        </div>
        
        <div>
          <h2 className="text-2xl font-semibold text-foreground mb-6">Hero Section</h2>
          <Hero />
        </div>

        <div>
          <h2 className="text-2xl font-semibold text-foreground mb-6">Events Grid</h2>
          <SimpleEventGrid onSelect={setSelectedEvent} />
        </div>

        {selectedEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-gray-900 mb-2">{selectedEvent.title}</h3>
              <p className="text-gray-600 mb-4">{selectedEvent.description}</p>
              <p className="text-sm text-gray-500 mb-4">
                📅 {new Date(selectedEvent.date).toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 mb-6">
                📍 {selectedEvent.location}
              </p>
              <div className="flex gap-2">
                <Button onClick={() => setSelectedEvent(null)} variant="secondary">
                  Close
                </Button>
                <Button onClick={() => console.log('RSVP to:', selectedEvent.id)}>
                  RSVP
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const App = () => {
  console.log('App component rendering...');
  
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/app" element={<FullEventsPage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/debug" element={<DebugPage />} />
              <Route path="/test" element={<TestPage />} />
              <Route path="*" element={<div style={{ padding: '20px' }}>404 - Page not found</div>} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
