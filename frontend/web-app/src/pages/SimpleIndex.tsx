import React from 'react';

const SimpleIndex = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="container mx-auto py-6">
        <nav className="flex items-center justify-between">
          <a href="/" className="text-xl font-semibold">Curated Events</a>
        </nav>
      </header>

      <main className="container mx-auto space-y-10 pb-16">
        <section className="text-center py-20">
          <h1 className="text-4xl font-bold mb-4">Welcome to Curated Events</h1>
          <p className="text-xl text-gray-600">Discover and attend the best events</p>
        </section>
      </main>
    </div>
  );
};

export default SimpleIndex;