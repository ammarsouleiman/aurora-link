import { useState, useEffect } from 'react';
import { ArrowRight, MessageCircle, Shield, Zap, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { motion, AnimatePresence } from 'motion/react';

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
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-gradient-to-br from-primary/10 to-accent/10 backdrop-blur-sm"
          style={{
            width: particle.size,
            height: particle.size,
            left: `${particle.x}%`,
            top: `${particle.y}%`,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, 20, 0],
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  const slide = slides[currentSlide];
  const Icon = slide.icon;

  return (
    <div className="onboarding-container w-full overflow-hidden relative bg-gradient-to-br from-background via-surface to-background">
      {/* Animated gradient background */}
      <motion.div
        className="absolute inset-0 opacity-30"
        animate={{
          background: [
            'radial-gradient(circle at 0% 0%, var(--primary) 0%, transparent 50%)',
            'radial-gradient(circle at 100% 100%, var(--accent) 0%, transparent 50%)',
            'radial-gradient(circle at 0% 100%, var(--primary) 0%, transparent 50%)',
            'radial-gradient(circle at 100% 0%, var(--accent) 0%, transparent 50%)',
            'radial-gradient(circle at 0% 0%, var(--primary) 0%, transparent 50%)',
          ],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* Floating particles for kinetic effect */}
      <FloatingParticles />

      {/* Main content - Mobile-optimized with safe area support */}
      <div className="relative z-10 h-full w-full flex flex-col items-center justify-between px-4 py-4 xs:py-5 sm:py-6 md:py-8 lg:py-10" style={{ paddingTop: 'max(env(safe-area-inset-top), 1rem)', paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)' }}>
        {/* Logo and branding - Mobile-responsive */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center w-full"
        >
          <motion.div
            className="inline-flex items-center gap-2 xs:gap-2.5 sm:gap-3 md:gap-4 mb-1.5 xs:mb-2"
            animate={{ scale: [1, 1.01, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="relative">
              <div className="w-9 h-9 xs:w-10 xs:h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-xl shadow-primary/30">
                <MessageCircle className="w-5 h-5 xs:w-6 xs:h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" strokeWidth={2.5} />
              </div>
              {/* Subtle glow effect */}
              <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary to-accent opacity-20 blur-xl" />
            </div>
            <h1 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
              AuroraLink
            </h1>
          </motion.div>
        </motion.div>

        {/* Slide content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            className="w-full max-w-[90%] xs:max-w-sm sm:max-w-md md:max-w-lg lg:max-w-4xl flex flex-col items-center text-center flex-1 justify-center py-1 xs:py-2 sm:py-4"
          >
            {/* Professional Icon Display - No Photos */}
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
              className="relative mb-6 xs:mb-8 sm:mb-10 md:mb-12 w-full px-2 sm:px-0"
            >
              {/* Large centered icon with gradient background */}
              <div className="relative mx-auto w-full max-w-[280px] xs:max-w-[300px] sm:max-w-[340px] md:max-w-md px-4">
                {/* Gradient glow background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${slide.gradient} opacity-20 blur-[60px] sm:blur-[80px] md:blur-[100px] rounded-full`} />
                
                {/* Main icon container */}
                <motion.div
                  className="relative w-full aspect-square"
                  animate={{
                    y: [0, -12, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  {/* Outer ring - animated */}
                  <motion.div
                    className={`relative w-full h-full mx-auto rounded-full bg-gradient-to-br ${slide.gradient} p-1 shadow-2xl`}
                    animate={{
                      rotate: [0, 360],
                    }}
                    transition={{
                      duration: 20,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  >
                    {/* Inner background */}
                    <div className="w-full h-full rounded-full bg-surface/95 backdrop-blur-sm flex items-center justify-center">
                      {/* Icon - responsive sizing */}
                      <motion.div
                        className={`w-[45%] h-[45%] rounded-full bg-gradient-to-br ${slide.gradient} flex items-center justify-center shadow-2xl`}
                        animate={{
                          scale: [1, 1.05, 1],
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      >
                        <Icon className="w-[55%] h-[55%] text-white" strokeWidth={2.5} />
                        
                        {/* Pulsing glow effect */}
                        <motion.div
                          className="absolute inset-0 rounded-full bg-white/30"
                          animate={{
                            opacity: [0.2, 0.5, 0.2],
                            scale: [0.9, 1.1, 0.9],
                          }}
                          transition={{
                            duration: 2.5,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        />
                      </motion.div>
                    </div>
                  </motion.div>
                  
                  {/* Orbiting particles - responsive positioning */}
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className={`absolute top-1/2 left-1/2 w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-gradient-to-br ${slide.gradient} shadow-lg -translate-x-1/2 -translate-y-1/2`}
                      animate={{
                        rotate: [i * 120, i * 120 + 360],
                      }}
                      transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "linear",
                        delay: i * 0.5,
                      }}
                    >
                      <div className="absolute top-0 left-0 w-3 h-3 sm:w-4 sm:h-4" style={{ 
                        transform: `translateY(calc(-1 * min(80px, 28vw)))` 
                      }} />
                    </motion.div>
                  ))}
                </motion.div>
                
                {/* Feature badges */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                  className="mt-6 xs:mt-8 sm:mt-10 md:mt-12 space-y-2.5 xs:space-y-3 sm:space-y-4 w-full"
                >
                  {slide.features.map((feature, index) => (
                    <motion.div
                      key={feature}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + index * 0.1, duration: 0.5 }}
                      className="flex items-center gap-2.5 xs:gap-3 bg-surface/50 backdrop-blur-sm rounded-xl sm:rounded-2xl px-3.5 xs:px-4 sm:px-5 py-2.5 xs:py-3 sm:py-3.5 border border-border/50 shadow-sm hover:shadow-md transition-all duration-300 min-h-[52px] touch-manipulation"
                    >
                      <div className={`flex-shrink-0 w-7 h-7 xs:w-8 xs:h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-gradient-to-br ${slide.gradient} flex items-center justify-center`}>
                        <Check className="w-3.5 h-3.5 xs:w-4 xs:h-4 sm:w-5 sm:h-5 text-white" strokeWidth={3} />
                      </div>
                      <span className="text-[13px] xs:text-sm sm:text-base font-medium text-foreground leading-snug">{feature}</span>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </motion.div>

            {/* Text content - Mobile-optimized hierarchy */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="space-y-2 xs:space-y-3 sm:space-y-4 md:space-y-6 mb-4 xs:mb-5 sm:mb-6 md:mb-8 px-2 xs:px-4 sm:px-6 md:px-8 w-full"
            >
              <h2 className="text-lg xs:text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight">
                {slide.title}
              </h2>
              <p className="text-[13px] xs:text-sm sm:text-base md:text-lg text-muted-foreground max-w-md sm:max-w-lg md:max-w-2xl mx-auto leading-relaxed">
                {slide.description}
              </p>
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation - Mobile-optimized */}
        <div className="w-full max-w-[90%] xs:max-w-sm sm:max-w-md md:max-w-lg space-y-4 xs:space-y-5 sm:space-y-6 md:space-y-8 px-2 xs:px-4 sm:px-6">
          {/* Dots indicator */}
          <div className="flex justify-center gap-1.5 xs:gap-2 sm:gap-2.5 md:gap-3">
            {slides.map((_, index) => (
              <motion.button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className="relative focus:outline-none touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                aria-label={`Go to slide ${index + 1}`}
              >
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === currentSlide
                      ? 'w-7 xs:w-8 sm:w-10 bg-gradient-to-r from-primary to-accent shadow-lg shadow-primary/30'
                      : 'w-2 bg-muted-foreground/40 hover:bg-muted-foreground/60'
                  }`}
                />
              </motion.button>
            ))}
          </div>

          {/* Action buttons - Mobile-optimized touch targets */}
          <div className="flex gap-2.5 xs:gap-3 sm:gap-4">
            {currentSlide > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex-1"
              >
                <Button
                  variant="outline"
                  onClick={() => setCurrentSlide(currentSlide - 1)}
                  className="w-full min-h-[48px] h-12 sm:h-13 md:h-14 text-[13px] xs:text-sm sm:text-base font-semibold border-2 hover:bg-muted touch-manipulation"
                >
                  Back
                </Button>
              </motion.div>
            )}
            <motion.div
              className={currentSlide > 0 ? 'flex-1' : 'w-full'}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                onClick={handleNext}
                className="w-full min-h-[48px] h-12 sm:h-13 md:h-14 text-[13px] xs:text-sm sm:text-base font-semibold bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-xl shadow-primary/30 transition-all duration-300 touch-manipulation"
              >
                {currentSlide < slides.length - 1 ? (
                  <>
                    Next
                    <ArrowRight className="ml-1.5 sm:ml-2 w-4 h-4 sm:w-5 sm:h-5" />
                  </>
                ) : (
                  <>
                    Get Started
                    <ArrowRight className="ml-1.5 sm:ml-2 w-4 h-4 sm:w-5 sm:h-5" />
                  </>
                )}
              </Button>
            </motion.div>
          </div>

          {/* Skip button */}
          {currentSlide < slides.length - 1 && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              onClick={onComplete}
              className="w-full text-[13px] xs:text-sm sm:text-base font-medium text-muted-foreground hover:text-foreground transition-colors py-2.5 xs:py-3 sm:py-3.5 touch-manipulation min-h-[48px]"
            >
              Skip
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
