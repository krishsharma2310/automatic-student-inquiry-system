@import "tailwindcss";

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-display: "Outfit", "Inter", sans-serif;
}

@layer base {
  body {
    @apply bg-slate-950 text-slate-200 antialiased;
  }
}

@layer utilities {
  .glass {
    @apply bg-white/5 backdrop-blur-md border border-white/10;
  }
  .glass-dark {
    @apply bg-black/20 backdrop-blur-lg border border-white/5;
  }
  .glow-red {
    box-shadow: 0 0 20px rgba(211, 47, 47, 0.2);
  }
  .glow-blue {
    box-shadow: 0 0 20px rgba(25, 118, 210, 0.2);
  }
  .text-gradient {
    @apply bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400;
  }
  .bg-mesh {
    background-image: 
      radial-gradient(at 0% 0%, rgba(211, 47, 47, 0.15) 0px, transparent 50%),
      radial-gradient(at 100% 0%, rgba(25, 118, 210, 0.15) 0px, transparent 50%),
      radial-gradient(at 100% 100%, rgba(52, 168, 83, 0.1) 0px, transparent 50%),
      radial-gradient(at 0% 100%, rgba(251, 188, 5, 0.1) 0px, transparent 50%);
  }
  .animate-gradient {
    animation: gradient 8s linear infinite;
  }
}

@keyframes gradient {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

.animate-float {
  animation: float 6s ease-in-out infinite;
}

@keyframes pulse-soft {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.animate-pulse-soft {
  animation: pulse-soft 3s ease-in-out infinite;
}
