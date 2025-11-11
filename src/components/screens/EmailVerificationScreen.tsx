import { useState, useEffect } from 'react';
import { ArrowLeft, Mail, Shield, CheckCircle2, AlertCircle } from '../ui/icons';
import { Button } from '../ui/button';
import { OTPInput } from '../OTPInput';
import { toast } from '../../utils/toast';
import { validateOTP } from '../../utils/phone';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface EmailVerificationScreenProps {
  userId: string;
  userEmail: string;
  onVerificationComplete: () => void;
  onBack: () => void;
}

type VerificationStep = 'otp' | 'success';

export function EmailVerificationScreen({
  userId,
  userEmail,
  onVerificationComplete,
  onBack,
}: EmailVerificationScreenProps) {
  const [step, setStep] = useState<VerificationStep>('otp');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [otpSent, setOtpSent] = useState(false);
  const [developmentMode, setDevelopmentMode] = useState(false);
  const [developmentOtp, setDevelopmentOtp] = useState('');

  useEffect(() => {
    // Send OTP automatically on mount
    if (!otpSent) {
      sendOTP();
    }
  }, []);

  useEffect(() => {
    if (countdown > 0 && otpSent) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown, otpSent]);

  const sendOTP = async () => {
    setIsLoading(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-29f6739b/email/send-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            user_id: userId,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to send verification code' }));
        const errorMessage = errorData.error || 'Failed to send verification code';
        console.error('Send OTP API error:', errorMessage, response.status);
        throw new Error(errorMessage);
      }

      const data = await response.json();

      setOtpSent(true);
      setCountdown(60);
      
      // Check if we're in development mode
      if (data.development_mode && data.otp) {
        setDevelopmentMode(true);
        setDevelopmentOtp(data.otp);
        console.log('🔐 Development Mode - Verification Code:', data.otp);
        toast.success('Verification code ready', {
          description: data.message || 'Check server logs for your verification code',
        });
      } else {
        setDevelopmentMode(false);
        setDevelopmentOtp('');
        toast.success('Verification code sent', {
          description: `We sent a 6-digit code to ${userEmail}`,
        });
      }
    } catch (error) {
      console.error('Email verification error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send verification code';
      toast.error('Failed to send code', {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async () => {
    setOtpError('');

    if (!validateOTP(otp)) {
      setOtpError('Please enter a valid 6-digit code');
      return;
    }

    setIsLoading(true);

    try {
      // Verify OTP with backend
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-29f6739b/email/verify-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            user_id: userId,
            otp,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Invalid verification code');
      }

      toast.success('Email verified!', {
        description: 'Your email has been successfully verified',
      });

      setStep('success');

      // Auto-complete after 2 seconds
      setTimeout(() => {
        onVerificationComplete();
      }, 2000);
    } catch (error) {
      console.error('OTP verification error:', error);
      setOtpError(error instanceof Error ? error.message : 'Invalid verification code');
      toast.error('Verification failed', {
        description: 'Please check the code and try again',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;

    setOtp('');
    setOtpError('');
    await sendOTP();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-surface">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              disabled={isLoading}
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl">Email Verification</h1>
              <p className="text-sm text-muted-foreground">
                {step === 'otp' && 'Verify your email address'}
                {step === 'success' && 'Verification successful'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 container max-w-md mx-auto px-4 py-8 flex flex-col">
        {/* OTP Entry Step */}
        {step === 'otp' && (
          <div className="space-y-8 animate-[fadeIn_0.3s_ease-in]">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-10 w-10 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl mb-2">Check Your Email</h2>
                <p className="text-muted-foreground">
                  We sent a verification code to
                </p>
                <p className="text-primary mt-1">
                  {userEmail}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block mb-4 text-sm text-center">
                  Enter 6-Digit Code
                </label>
                <OTPInput
                  value={otp}
                  onChange={(value) => {
                    setOtp(value);
                    setOtpError('');
                  }}
                  error={otpError}
                  disabled={isLoading}
                  autoFocus
                />
              </div>

              {/* Development Mode OTP Display */}
              {developmentMode && developmentOtp && (
                <div className="rounded-lg border border-warning/50 bg-warning/10 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Development Mode</p>
                      <p className="text-xs text-muted-foreground">
                        Email service not configured. Your verification code is:
                      </p>
                      <p className="text-lg font-mono font-bold text-warning mt-2">
                        {developmentOtp}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        To send real emails, configure your Resend API key.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <Button
                  onClick={handleOtpSubmit}
                  disabled={isLoading || otp.length !== 6}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? 'Verifying...' : 'Verify Email'}
                </Button>

                <div className="text-center">
                  {countdown > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Resend code in {countdown}s
                    </p>
                  ) : (
                    <Button
                      variant="link"
                      onClick={handleResendOtp}
                      disabled={isLoading}
                      className="text-sm"
                    >
                      Resend Code
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm">Secure Verification</p>
                  <p className="text-xs text-muted-foreground">
                    This code expires in 10 minutes. We'll never share your email with anyone.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Step */}
        {step === 'success' && (
          <div className="flex-1 flex items-center justify-center animate-[scaleIn_0.5s_ease-out]">
            <div className="text-center space-y-6">
              <div className="w-24 h-24 mx-auto rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="h-12 w-12 text-success" />
              </div>
              <div>
                <h2 className="text-2xl mb-2">Email Verified!</h2>
                <p className="text-muted-foreground">
                  Your email has been successfully verified
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-success">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-sm">Setting up your account...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="border-t border-border bg-surface">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <p className="text-xs text-center text-muted-foreground">
            By verifying your email, you can access all AuroraLink features
          </p>
        </div>
      </div>
    </div>
  );
}
