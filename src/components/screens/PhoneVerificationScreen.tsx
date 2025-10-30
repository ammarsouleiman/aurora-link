import { useState, useEffect } from 'react';
import { ArrowLeft, Phone, Shield, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { PhoneInput } from '../PhoneInput';
import { OTPInput } from '../OTPInput';
import { toast } from '../../utils/toast';
import { formatToE164, validateOTP, COUNTRY_CODES } from '../../utils/phone';
import { projectId } from '../../utils/supabase/info';

interface PhoneVerificationScreenProps {
  userId: string;
  onVerificationComplete: (phoneNumber: string) => void;
  onBack: () => void;
}

type VerificationStep = 'phone' | 'otp' | 'success';

export function PhoneVerificationScreen({
  userId,
  onVerificationComplete,
  onBack,
}: PhoneVerificationScreenProps) {
  const [step, setStep] = useState<VerificationStep>('phone');
  const [phone, setPhone] = useState('');
  const [dialCode, setDialCode] = useState(COUNTRY_CODES[0].dialCode);
  const [otp, setOtp] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handlePhoneSubmit = async () => {
    setPhoneError('');

    if (!phone || phone.trim().length < 7) {
      setPhoneError('Please enter a valid phone number');
      return;
    }

    setIsLoading(true);

    try {
      const e164Phone = formatToE164(dialCode, phone);

      // Send OTP request to backend
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-29f6739b/phone/send-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userId,
            phone_number: e164Phone,
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

      // Store OTP and email for demo purposes
      setGeneratedOtp(data.otp);
      setUserEmail(data.email || '');
      
      toast.success('Verification code sent', {
        description: `We sent a 6-digit code to ${data.email || 'your email'}`,
      });

      // Show OTP in console for demo/testing
      console.log('🔐 Verification Code (Demo):', data.otp);
      console.log('📧 Sent to email:', data.email);
      
      setStep('otp');
      setCountdown(60);
    } catch (error) {
      console.error('Phone verification error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send verification code';
      setPhoneError(errorMessage);
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
      const e164Phone = formatToE164(dialCode, phone);

      // Verify OTP with backend
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-29f6739b/phone/verify-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userId,
            phone_number: e164Phone,
            otp,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Invalid verification code');
      }

      toast.success('Phone verified!', {
        description: 'Your phone number has been successfully verified',
      });

      setStep('success');

      // Auto-complete after 2 seconds
      setTimeout(() => {
        onVerificationComplete(e164Phone);
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
    await handlePhoneSubmit();
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
              <h1 className="text-xl">Phone Verification</h1>
              <p className="text-sm text-muted-foreground">
                {step === 'phone' && 'Enter your phone number'}
                {step === 'otp' && 'Enter verification code'}
                {step === 'success' && 'Verification successful'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 container max-w-md mx-auto px-4 py-8 flex flex-col">
        {/* Phone Entry Step */}
        {step === 'phone' && (
          <div className="space-y-8 animate-[fadeIn_0.3s_ease-in]">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Phone className="h-10 w-10 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl mb-2">Verify Your Number</h2>
                <p className="text-muted-foreground">
                  AuroraLink uses your phone number to connect you with friends and family
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label htmlFor="phone" className="block mb-3 text-sm">
                  Phone Number
                </label>
                <PhoneInput
                  value={phone}
                  dialCode={dialCode}
                  onChange={(newPhone, newDialCode) => {
                    setPhone(newPhone);
                    setDialCode(newDialCode);
                    setPhoneError('');
                  }}
                  error={phoneError}
                  disabled={isLoading}
                  autoFocus
                />
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handlePhoneSubmit}
                  disabled={isLoading || !phone}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? 'Sending...' : 'Send Verification Code'}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  We'll send a 6-digit verification code to your registered email
                </p>
              </div>
            </div>

            {/* Info Box */}
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm">Your privacy is protected</p>
                  <p className="text-xs text-muted-foreground">
                    Your phone number is encrypted and never shared without your permission. We'll send a verification code to your registered email address.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* OTP Entry Step */}
        {step === 'otp' && (
          <div className="space-y-8 animate-[fadeIn_0.3s_ease-in]">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-accent/10 flex items-center justify-center">
                <Shield className="h-10 w-10 text-accent" />
              </div>
              <div>
                <h2 className="text-2xl mb-2">Enter Verification Code</h2>
                <p className="text-muted-foreground">
                  We sent a code to {userEmail || 'your email'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Verifying: {dialCode} {phone}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block mb-4 text-sm text-center">
                  6-Digit Code
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

              {/* Demo OTP Display */}
              {generatedOtp && (
                <div className="rounded-lg border border-warning/50 bg-warning/10 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="text-sm">Demo Mode - Check Your Email</p>
                      <p className="text-xs text-muted-foreground">
                        Code sent to: <span className="font-semibold">{userEmail}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Your verification code is: <span className="font-mono font-semibold">{generatedOtp}</span>
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
                  {isLoading ? 'Verifying...' : 'Verify'}
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

                <Button
                  variant="ghost"
                  onClick={() => setStep('phone')}
                  disabled={isLoading}
                  className="w-full"
                >
                  Change Phone Number
                </Button>
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
                <h2 className="text-2xl mb-2">Verified!</h2>
                <p className="text-muted-foreground">
                  Your phone number has been successfully verified
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
            By verifying your phone number, you can connect with other AuroraLink users
          </p>
        </div>
      </div>
    </div>
  );
}
