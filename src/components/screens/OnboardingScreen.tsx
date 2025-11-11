import { useState, useEffect } from 'react';
import { ArrowRight, MessageCircle, Shield, Zap, Check } from '../ui/icons';
import { Button } from '../ui/button';

interface OnboardingScreenProps {
  onComplete: () => void;
}

const slides = [
  {
    icon: MessageCircle,
    title: 'Welcome to AuroraLink',
    description: 'Connect with friends and family through secure, encrypted messaging, voice and video calls. Your conversations, always within reach.',
    gradient: 'from-primary via-primary/80 to-accent',
    features: ['Instant Messaging', 'Voice & Video Calls', 'Media Sharing'],
  },
  {
    icon: Shield,
    title: 'Private & Secure',
    description: 'Your messages are protected with end-to-end encryption. Only you and your recipients can read them. Your privacy is our priority.',
    gradient: 'from-accent via-accent/80 to-primary',
    features: ['End-to-End Encryption', 'Privacy First', 'Secure Storage'],
  },
  {
    icon: Zap,
    title: 'Fast & Reliable',
    description: 'Send messages, share media, and make calls instantly with real-time delivery and notifications. Lightning-fast communication.',
    gradient: 'from-primary via-accent/60 to-primary',
    features: ['Real-Time Sync', 'Instant Delivery', 'Always Connected'],
  },
];

// Floating particles component for kinetic background
function FloatingParticles() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    size: Math.random() * 60 + 20,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 10 + 15,
    delay: Math.random() * 5,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full bg-gradient-to-br from-primary/10 to-accent/10 backdrop-blur-sm animate-float"
          style={{
            width: particle.size,
            height: particle.size,
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            animationDuration: `${particle.duration}s`,
            animationDelay: `${particle.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1);

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setDirection(1);
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setDirection(-1);
      setCurrentSlide(currentSlide - 1);
    }
  };

  const goToSlide = (index: number) => {
    setDirection(index > currentSlide ? 1 : -1);
    setCurrentSlide(index);
  };

  const slide = slides[currentSlide];
  const Icon = slide.icon;

  return (
    <div className="h-screen w-full flex flex-col relative overflow-hidden bg-background">
      {/* Animated gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${slide.gradient} transition-all duration-1000`} />

      {/* Floating particles background */}
      <FloatingParticles />

      {/* Skip button - Mobile optimized */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <Button
          variant="ghost"
          onClick={onComplete}
          className="text-white/90 hover:text-white hover:bg-white/10 backdrop-blur-sm px-4 py-2 text-sm sm:text-base"
        >
          Skip
        </Button>
      </div>

      {/* Main content - Centered and mobile-optimized */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 sm:px-8 md:px-12 pt-16 pb-8">
        {/* Icon with animation - Responsive sizing */}
        <div 
          className="mb-8 sm:mb-10 transition-all duration-500"
          style={{
            opacity: 1,
            transform: `translateX(${direction * 0}px) scale(1)`,
          }}
        >
          <div className="relative">
            {/* Pulsing ring effect */}
            <div className="absolute inset-0 -m-8 sm:-m-10">
              <div className="w-full h-full rounded-full border-4 border-white/30 animate-ping" style={{ animationDuration: '2s' }} />
            </div>

            {/* Icon container */}
            <div className="relative w-20 h-20 xs:w-24 xs:h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full bg-white/95 shadow-2xl flex items-center justify-center ring-6 sm:ring-8 ring-white/40 backdrop-blur-sm">
              <Icon className="w-10 h-10 xs:w-12 xs:h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 text-primary" strokeWidth={2} />
            </div>
          </div>
        </div>

        {/* Content - Mobile responsive */}
        <div 
          className="text-center max-w-md lg:max-w-lg space-y-4 sm:space-y-6 transition-all duration-500"
          style={{
            opacity: 1,
            transform: `translateX(${direction * 0}px)`,
          }}
        >
          <h1 className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight px-2">
            {slide.title}
          </h1>

          <p className="text-base xs:text-lg sm:text-xl text-white/90 leading-relaxed px-4 sm:px-0">
            {slide.description}
          </p>

          {/* Features list - Mobile optimized */}
          <div className="flex flex-col gap-3 sm:gap-4 pt-4 sm:pt-6">
            {slide.features.map((feature, index) => (
              <div
                key={index}
                className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-lg px-4 sm:px-5 py-3 sm:py-3.5 border border-white/20 transition-all duration-300"
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
              >
                <div className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" strokeWidth={3} />
                </div>
                <span className="text-white font-medium text-sm xs:text-base sm:text-lg">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom navigation - Mobile optimized */}
      <div className="relative z-10 px-6 sm:px-8 md:px-12 pb-8 sm:pb-10 space-y-6 sm:space-y-8">
        {/* Dots indicator - Responsive sizing */}
        <div className="flex justify-center gap-2 sm:gap-3">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? 'w-8 sm:w-10 bg-white'
                  : 'w-2 bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Navigation buttons - Mobile optimized */}
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            onClick={prevSlide}
            disabled={currentSlide === 0}
            className="text-white/90 hover:text-white hover:bg-white/10 backdrop-blur-sm disabled:opacity-0 disabled:pointer-events-none px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base"
          >
            Previous
          </Button>

          <Button
            onClick={nextSlide}
            size="lg"
            className="bg-white hover:bg-white/90 shadow-xl hover:shadow-2xl transition-all duration-300 gap-2 px-6 sm:px-8 py-2 sm:py-3 text-sm sm:text-base font-semibold"
          >
            <span className="text-[#0057FF]">{currentSlide === slides.length - 1 ? "Get Started" : "Next"}</span>
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-[#0057FF]" />
          </Button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes float {
            0%, 100% {
              transform: translate(0, 0) scale(1);
              opacity: 0.3;
            }
            50% {
              transform: translate(20px, -30px) scale(1.1);
              opacity: 0.6;
            }
          }

          .animate-float {
            animation: float ease-in-out infinite;
          }
        `
      }} />
    </div>
  );
}
