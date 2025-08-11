import { Button } from "@/components/ui/button";
import { Sparkles, CalendarRange, ArrowRight, Zap } from "lucide-react";
import { useEffect, useRef } from "react";

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      el.style.setProperty("--mx", `${x}px`);
      el.style.setProperty("--my", `${y}px`);
    };
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <section
      ref={ref}
      className="relative overflow-hidden rounded-2xl glass-pastel p-8 sm:p-12 lg:p-16 min-h-[600px] flex items-center justify-center"
      aria-label="Curated Events hero"
    >
      {/* Enhanced background with mouse interaction */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(800px circle at var(--mx,50%) var(--my,50%), hsl(var(--sidebar-ring)/0.15), transparent 50%)",
        }}
      />

      {/* Floating elements */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-16 w-32 h-32 bg-gradient-to-br from-pastel-blue to-pastel-lavender rounded-full float-animation blur-sm"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-br from-pastel-pink to-pastel-rose rounded-full float-animation blur-sm" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-32 left-1/4 w-16 h-16 bg-gradient-to-br from-pastel-mint to-pastel-emerald rounded-full float-animation blur-sm" style={{ animationDelay: '4s' }}></div>
        <div className="absolute bottom-20 right-1/3 w-20 h-20 bg-gradient-to-br from-pastel-peach to-pastel-orange rounded-full float-animation blur-sm" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-40 h-40 bg-gradient-to-br from-pastel-yellow to-pastel-sky rounded-full float-animation blur-md opacity-20" style={{ animationDelay: '3s' }}></div>
      </div>

      <div className="relative mx-auto max-w-4xl text-center animate-slide-up">
        {/* Enhanced badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-100 to-accent-100 border border-primary-200/50 px-4 py-2 text-sm font-medium text-primary-700 backdrop-blur-sm">
          <Sparkles className="size-4 animate-pulse-soft" />
          Smart discovery for what's worth your time
        </div>

        {/* Enhanced heading */}
        <h1 className="mb-6 text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-tight">
          <span className="block text-foreground mb-2">Curated Events</span>
          <span className="block gradient-text">Platform</span>
        </h1>

        {/* Enhanced description */}
        <p className="mx-auto mb-10 max-w-3xl text-xl text-muted-foreground leading-relaxed">
          Discover, filter, and track the best events across tech, music, art, and more — powered by a modern API and a delightful UI with beautiful pastel design.
        </p>

        {/* Enhanced CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <Button 
            size="lg" 
            className="group px-8 py-4 text-lg font-semibold min-w-[200px] transition-all duration-200 hover:scale-102 hover:shadow-color-lg"
          >
            <CalendarRange className="size-5 mr-2 group-hover:rotate-12 transition-transform duration-200" />
            Explore Events
            <ArrowRight className="size-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            className="px-8 py-4 text-lg font-semibold min-w-[200px] glass transition-all duration-200 hover:scale-102"
          >
            <Zap className="size-5 mr-2" />
            How it works
          </Button>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto text-center">
          <div className="glass rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary-400 to-primary-600 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="size-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Smart Curation</h3>
            <p className="text-sm text-muted-foreground">AI-powered event recommendations tailored to your interests</p>
          </div>
          
          <div className="glass rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1" style={{ animationDelay: '200ms' }}>
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-accent-400 to-accent-600 flex items-center justify-center mx-auto mb-4">
              <CalendarRange className="size-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Easy Discovery</h3>
            <p className="text-sm text-muted-foreground">Filter by category, date, location, and more with intuitive controls</p>
          </div>
          
          <div className="glass rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1" style={{ animationDelay: '400ms' }}>
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-secondary-400 to-secondary-600 flex items-center justify-center mx-auto mb-4">
              <Zap className="size-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Modern Design</h3>
            <p className="text-sm text-muted-foreground">Beautiful, responsive interface with delightful interactions</p>
          </div>
        </div>
      </div>
    </section>
  );
}
