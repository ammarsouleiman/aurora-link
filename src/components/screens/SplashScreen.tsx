import { useEffect, useState } from 'react';
import { MessageCircle, Sparkles } from '../ui/local-icons';

interface SplashScreenProps {
  onComplete?: () => void;
  duration?: number;
}

export function SplashScreen({ onComplete, duration = 2500 }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Simulate loading progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2;
      });
    }, duration / 50);

    // Complete after duration
    const timeout = setTimeout(() => {
      onComplete?.();
    }, duration);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [onComplete, duration]);

  return (
    <div className="h-screen w-full flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-[#0057FF] via-[#0047DD] to-[#00D4A6] px-4 sm:px-6 pt-safe pb-safe">
      {/* Animated background gradients */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 animate-pulse"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)',
            animationDuration: '4s'
          }}
        />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/10 backdrop-blur-sm animate-float"
            style={{
              width: Math.random() * 80 + 20,
              height: Math.random() * 80 + 20,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${Math.random() * 8 + 10}s`,
            }}
          />
        ))}
      </div>

      {/* Main content - Mobile-responsive */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-md">
        {/* Logo with animations - Responsive sizing */}
        <div className={`relative mb-8 sm:mb-10 transition-all duration-1000 ${mounted ? 'scale-100 rotate-0 opacity-100' : 'scale-0 -rotate-180 opacity-0'}`}>
          {/* Multiple pulsing rings */}
          <div className="absolute inset-0 -m-6">
            <div className="w-44 h-44 rounded-full border-3 border-white/40 animate-ping" style={{ animationDuration: '2s' }} />
          </div>
          
          <div className="absolute inset-0 -m-3">
            <div className="w-38 h-38 rounded-full border-2 border-white/30 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.3s' }} />
          </div>

          {/* Logo container - Responsive sizing */}
          <div className="relative w-24 h-24 xs:w-28 xs:h-28 sm:w-32 sm:h-32 rounded-full bg-white shadow-2xl flex items-center justify-center ring-4 xs:ring-6 sm:ring-8 ring-white/30">
            <div
              className="absolute inset-0 rounded-full animate-spin"
              style={{
                background: 'conic-gradient(from 0deg, transparent, rgba(255,255,255,0.3), transparent)',
                animationDuration: '20s'
              }}
            />
            <div className="relative animate-pulse" style={{ animationDuration: '2s' }}>
              <MessageCircle className="w-12 h-12 xs:w-14 xs:h-14 sm:w-16 sm:h-16 text-primary" strokeWidth={2.5} />
            </div>
          </div>
          
          {/* Sparkle effects - Responsive positioning */}
          <div 
            className="absolute -top-2 -right-2 xs:-top-3 xs:-right-3 sm:-top-4 sm:-right-4 animate-spin"
            style={{ animationDuration: '3s' }}
          >
            <Sparkles className="w-6 h-6 xs:w-7 xs:h-7 sm:w-8 sm:h-8 text-white" fill="white" />
          </div>
        </div>

        {/* App name - Mobile-responsive */}
        <div className={`text-center mb-12 sm:mb-16 transition-all duration-800 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
          <h1 className="text-4xl xs:text-5xl sm:text-6xl md:text-7xl font-bold text-white mb-2 sm:mb-3 tracking-tight animate-glow">
            AuroraLink
          </h1>
          <p className={`text-white/90 text-base xs:text-lg sm:text-xl font-medium tracking-wide px-4 transition-opacity delay-800 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            Connect. Communicate. Collaborate.
          </p>
        </div>

        {/* Loading bar - Mobile-responsive */}
        <div className={`w-48 xs:w-56 sm:w-64 space-y-2.5 sm:space-y-3 px-4 transition-all delay-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          {/* Progress bar background */}
          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
            <div
              className="h-full bg-white rounded-full shadow-lg shadow-white/50 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Loading text */}
          <p className="text-center text-white/70 text-sm animate-pulse">
            Loading...
          </p>
        </div>
      </div>

      {/* Bottom decorative elements */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/10 to-transparent" />
      
      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.3; }
          50% { transform: translate(30px, -40px) scale(1.2); opacity: 0.6; }
        }
        
        @keyframes glow {
          0%, 100% { text-shadow: 0 0 20px rgba(255,255,255,0.5); }
          50% { text-shadow: 0 0 40px rgba(255,255,255,0.8); }
        }
        
        .animate-float {
          animation: float ease-in-out infinite;
        }
        
        .animate-glow {
          animation: glow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
