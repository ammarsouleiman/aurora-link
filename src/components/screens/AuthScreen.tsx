import { useState } from 'react';
import { Mail, Lock, User, Loader2, AlertCircle, ArrowRight, MessageCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { createClient } from '../../utils/supabase/client';
import { authApi } from '../../utils/api';
import { motion } from 'motion/react';
import { PhoneInput } from '../PhoneInput';

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

export function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dialCode, setDialCode] = useState('+1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();

      if (mode === 'signup') {
        // Validate phone number is provided
        if (!phoneNumber) {
          setError('Phone number is required');
          setLoading(false);
          return;
        }
        
        // Call backend to create user with phone number
        const fullPhoneNumber = `${dialCode}${phoneNumber}`;
        const signupResult = await authApi.signup(email, password, fullName, fullPhoneNumber);
        
        if (!signupResult.success) {
          let errorMsg = signupResult.error || 'Signup failed';
          
          // Parse error if it's a JSON string
          try {
            const parsed = JSON.parse(errorMsg);
            errorMsg = parsed.error || errorMsg;
          } catch {
            // Not JSON, use as is
          }
          
          // Provide helpful message for phone number already registered
          if (errorMsg.includes('Phone number is already registered')) {
            errorMsg = 'This phone number is already registered. Please use a different phone number or sign in.';
          }
          
          setError(errorMsg);
          setLoading(false);
          return;
        }

        // Now sign in
        console.log('[Auth] Signing in after signup...');
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          console.error('[Auth] Sign in error after signup:', signInError);
          setError(signInError.message);
          setLoading(false);
          return;
        }

        if (!signInData.session) {
          console.error('[Auth] No session returned after sign in');
          setError('Failed to establish session. Please try logging in.');
          setLoading(false);
          return;
        }

        console.log('[Auth] Sign in successful, session established');
        console.log('[Auth] Session user:', signInData.session.user.id);
        console.log('[Auth] Access token available:', !!signInData.session.access_token);
        
        // Explicitly set the session to ensure it's saved
        console.log('[Auth] Explicitly setting session...');
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token,
        });
        
        if (setSessionError) {
          console.error('[Auth] Failed to set session:', setSessionError);
          setError('Failed to save session. Please try again.');
          setLoading(false);
          return;
        }
        
        // Wait for session to be fully persisted to localStorage
        console.log('[Auth] Waiting for session persistence...');
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Verify session is persisted
        console.log('[Auth] Verifying session in storage...');
        const { data: { session: verifySession } } = await supabase.auth.getSession();
        if (!verifySession) {
          console.error('[Auth] CRITICAL: Session not persisted to storage!');
          
          // Check localStorage directly
          const allKeys = Object.keys(localStorage);
          console.error('[Auth] Available localStorage keys:', allKeys);
          
          setError('Session failed to save. Please ensure cookies/storage is enabled.');
          setLoading(false);
          return;
        }
        
        console.log('[Auth] ✅ Session verified in storage');
        onAuthSuccess();
      } else {
        // Login
        console.log('[Auth] Attempting login...');
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          // Only log as error if it's not just wrong credentials
          if (!signInError.message.toLowerCase().includes('invalid login credentials')) {
            console.error('[Auth] Login error:', signInError.message);
          }
          setError(signInError.message);
          setLoading(false);
          return;
        }

        if (!signInData.session) {
          console.error('[Auth] No session returned after login');
          setError('Failed to establish session. Please try again.');
          setLoading(false);
          return;
        }

        console.log('[Auth] Login successful, session established');
        console.log('[Auth] Session user:', signInData.session.user.id);
        console.log('[Auth] Access token available:', !!signInData.session.access_token);
        console.log('[Auth] Access token preview:', signInData.session.access_token?.substring(0, 30) + '...');
        
        // Explicitly set the session to ensure it's saved
        console.log('[Auth] Explicitly setting session...');
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token,
        });
        
        if (setSessionError) {
          console.error('[Auth] Failed to set session:', setSessionError);
          setError('Failed to save session. Please try again.');
          setLoading(false);
          return;
        }
        
        // Wait for session to be fully persisted to localStorage
        console.log('[Auth] Waiting for session persistence...');
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Verify session is persisted
        console.log('[Auth] Verifying session in storage...');
        const { data: { session: verifySession }, error: verifyError } = await supabase.auth.getSession();
        
        if (verifyError) {
          console.error('[Auth] Error verifying session:', verifyError);
        }
        
        if (!verifySession) {
          console.error('[Auth] CRITICAL: Session not persisted to storage!');
          console.error('[Auth] This means localStorage may be disabled or cleared');
          
          // Check localStorage directly
          const allKeys = Object.keys(localStorage);
          console.error('[Auth] Available localStorage keys:', allKeys);
          console.error('[Auth] Total localStorage keys:', allKeys.length);
          
          setError('Session failed to save. Please ensure cookies/storage is enabled.');
          setLoading(false);
          return;
        }
        
        console.log('[Auth] ✅ Session verified in storage');
        console.log('[Auth] Stored session user:', verifySession.user.id);
        console.log('[Auth] Stored access token preview:', verifySession.access_token?.substring(0, 30) + '...');
        
        onAuthSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 md:p-8 pt-safe pb-safe pl-safe pr-safe relative overflow-hidden bg-gradient-to-br from-background via-surface to-background">
      {/* Refined animated background gradient */}
      <motion.div
        className="absolute inset-0 opacity-40"
        animate={{
          background: [
            'radial-gradient(circle at 20% 30%, var(--primary) 0%, transparent 60%)',
            'radial-gradient(circle at 80% 70%, var(--accent) 0%, transparent 60%)',
            'radial-gradient(circle at 50% 50%, var(--primary) 0%, transparent 60%)',
            'radial-gradient(circle at 20% 30%, var(--primary) 0%, transparent 60%)',
          ],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* Subtle floating orbs - more refined */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-gradient-to-br from-primary/15 to-accent/15 backdrop-blur-2xl"
            style={{
              width: Math.random() * 250 + 150,
              height: Math.random() * 250 + 150,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              x: [0, Math.random() * 60 - 30],
              y: [0, Math.random() * 60 - 30],
              scale: [1, 1.15, 1],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{
              duration: Math.random() * 8 + 12,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Main auth card - Mobile-responsive */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative w-full max-w-sm xs:max-w-md"
      >
        {/* Enhanced glass morphism card */}
        <div className="bg-card/90 dark:bg-card/50 backdrop-blur-3xl rounded-2xl sm:rounded-3xl shadow-2xl border border-border/50 p-6 xs:p-8 sm:p-10 relative overflow-hidden">
          {/* Subtle card glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-50 pointer-events-none" />
          
          {/* Content */}
          <div className="relative z-10">
            {/* Header - Mobile-optimized */}
            <motion.div
              className="text-center mb-8 sm:mb-10"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {/* Logo with refined styling - Responsive sizing */}
              <motion.div
                className="inline-flex items-center justify-center gap-2.5 sm:gap-3 mb-5 sm:mb-6"
                whileHover={{ scale: 1.03 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <div className="relative">
                  <div className="w-12 h-12 xs:w-14 xs:h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary to-accent shadow-xl shadow-primary/30 flex items-center justify-center">
                    <MessageCircle className="w-7 h-7 xs:w-8 xs:h-8 sm:w-9 sm:h-9 text-white" strokeWidth={2.5} />
                  </div>
                  {/* Subtle pulsing glow */}
                  <motion.div
                    className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary to-accent opacity-30 blur-xl"
                    animate={{
                      opacity: [0.2, 0.4, 0.2],
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                </div>
              </motion.div>
              
              <h1 className="mb-2.5 sm:mb-3 text-2xl xs:text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
                AuroraLink
              </h1>
              <motion.p
                className="text-muted-foreground text-base"
                key={mode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {mode === 'login' ? 'Welcome back! Sign in to continue.' : 'Create your account to get started'}
              </motion.p>
            </motion.div>

            {/* Error alert */}
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </motion.div>
            )}

            {/* Form with improved spacing */}
            <motion.form
              onSubmit={handleSubmit}
              className="space-y-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {mode === 'signup' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-sm font-semibold">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="fullName"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="John Doe"
                        className="pl-11 h-12 text-base"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber" className="text-sm font-semibold">Phone Number</Label>
                    <div>
                      <PhoneInput
                        value={phoneNumber}
                        dialCode={dialCode}
                        onChange={(phone, code) => {
                          setPhoneNumber(phone);
                          setDialCode(code);
                        }}
                        disabled={loading}
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Used to find and connect with others on AuroraLink
                      </p>
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="pl-11 h-12 text-base"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-11 h-12 text-base"
                    required
                    disabled={loading}
                    minLength={6}
                  />
                </div>
                {mode === 'signup' && (
                  <p className="text-xs text-muted-foreground">
                    At least 6 characters
                  </p>
                )}
              </div>

          <motion.div
            whileHover={{ scale: loading ? 1 : 1.01 }}
            whileTap={{ scale: loading ? 1 : 0.99 }}
            className="mt-2"
          >
            <Button
              type="submit"
              className="w-full h-14 text-base font-semibold bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-xl shadow-primary/30 transition-all duration-300"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                <>
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </motion.div>
        </motion.form>

            {/* Toggle mode */}
            <motion.div
              className="mt-8 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <button
                onClick={() => {
                  setMode(mode === 'login' ? 'signup' : 'login');
                  setError('');
                }}
                className="text-sm text-primary hover:text-primary/80 transition-colors font-medium inline-flex items-center gap-1"
                disabled={loading}
              >
                {mode === 'login'
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Sign in'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>

            {/* Footer */}
            <motion.div
              className="mt-10 pt-6 border-t border-border/30 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <p className="text-xs text-muted-foreground leading-relaxed">
                By continuing, you agree to our{' '}
                <span className="text-primary hover:underline cursor-pointer font-medium">Terms of Service</span>
                {' '}and{' '}
                <span className="text-primary hover:underline cursor-pointer font-medium">Privacy Policy</span>
              </p>
            </motion.div>
          </div>
        </div>

        {/* Refined decorative elements */}
        <div className="absolute -z-10 top-0 left-0 w-40 h-40 bg-gradient-to-br from-primary/15 to-transparent rounded-full blur-3xl" />
        <div className="absolute -z-10 bottom-0 right-0 w-40 h-40 bg-gradient-to-tl from-accent/15 to-transparent rounded-full blur-3xl" />
      </motion.div>
    </div>
  );
}
