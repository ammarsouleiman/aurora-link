# AuroraLink Verification System

## 🎯 Current System: EMAIL VERIFICATION

AuroraLink uses **email verification** to ensure users have access to their registered email address.

## Quick Start

### For Users

1. **Sign Up** with email and password
2. **Receive OTP** - A 6-digit code is automatically sent to your email
3. **Enter Code** - Input the code on the verification screen
4. **Access App** - Start using AuroraLink!

### For Developers (Demo Mode)

The verification code appears in **3 places** for easy testing:

1. **Browser Console** - Check DevTools console
2. **Verification Screen** - Blue info box shows the code
3. **Server Logs** - Supabase Edge Functions logs

```javascript
// Example console output:
🔐 Email Verification Code (Demo): 123456
📧 Sent to: user@example.com
```

## Flow Diagram

```
┌─────────────┐
│   Sign Up   │
│ (AuthScreen)│
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│ Email Verification│
│ OTP Auto-Sent     │
└──────┬───────────┘
       │
       ▼
┌──────────────┐      ┌─────────────┐
│  Enter Code  │─────→│  Verify OTP │
└──────┬───────┘      └──────┬──────┘
       │                     │
       │ ◄───────────────────┘
       │ (if invalid)
       ▼
┌──────────────┐
│  Home Screen │
│ (Full Access)│
└──────────────┘
```

## API Endpoints

### 📧 Send Verification Code
```
POST /make-server-29f6739b/email/send-otp

Body: { "user_id": "uuid" }

Response: {
  "success": true,
  "otp": "123456",  // Demo only!
  "email": "user@example.com"
}
```

### ✅ Verify Code
```
POST /make-server-29f6739b/email/verify-otp

Body: {
  "user_id": "uuid",
  "otp": "123456"
}

Response: {
  "success": true,
  "message": "Email verified successfully"
}
```

## Key Features

✅ **Automatic OTP Sending** - Code sent immediately upon reaching verification screen  
✅ **10-Minute Expiration** - Codes are time-limited for security  
✅ **Single-Use Codes** - Each code can only be used once  
✅ **Resend Functionality** - Get a new code after 60 seconds  
✅ **Demo Mode** - Codes displayed for testing  
✅ **Clean UX** - Smooth animations and clear feedback  

## Files

### Active Components (Currently Used)

```
✅ /components/screens/EmailVerificationScreen.tsx
✅ /components/OTPInput.tsx
✅ /supabase/functions/server/index.tsx (email/send-otp, email/verify-otp)
✅ /App.tsx (uses EmailVerificationScreen)
```

### Legacy Components (Not Currently Used)

```
⚠️ /components/screens/PhoneVerificationScreen.tsx
⚠️ /components/PhoneInput.tsx
⚠️ /components/FindByPhoneDialog.tsx
```

These phone-related components still exist but are not part of the main authentication flow. They can be:
- Removed if not needed
- Kept for optional phone number features
- Used for future phone-based user discovery

## Production Setup

### Step 1: Choose Email Provider

Recommended services:
- **SendGrid** - Popular, reliable
- **AWS SES** - Cost-effective for high volume
- **Resend** - Modern, developer-friendly
- **Mailgun** - Feature-rich
- **Postmark** - High deliverability

### Step 2: Install SDK

```typescript
// Example: SendGrid
import sgMail from 'npm:@sendgrid/mail';
```

### Step 3: Update Server Code

Edit `/supabase/functions/server/index.tsx` in the `/email/send-otp` endpoint:

```typescript
// REPLACE the console.log section with:

await sgMail.send({
  to: userEmail,
  from: 'noreply@yourdomain.com',
  subject: 'Verify Your AuroraLink Email',
  text: `Your verification code is: ${otp}`,
  html: `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Verify Your Email</h2>
      <p>Hi ${fullName},</p>
      <p>Your AuroraLink verification code is:</p>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
        ${otp}
      </div>
      <p>This code will expire in 10 minutes.</p>
      <p style="color: #666; font-size: 12px;">
        If you didn't request this code, please ignore this email.
      </p>
    </div>
  `,
});
```

### Step 4: Add Secrets

In Supabase Dashboard → Settings → Edge Functions → Secrets:

```
SENDGRID_API_KEY=your_api_key_here
```

Or equivalent for your email provider.

### Step 5: Remove Demo Code

In the API response, remove the OTP from being sent to client:

```typescript
return c.json({ 
  success: true,
  // otp,  // ← DELETE THIS LINE IN PRODUCTION
  email: userEmail,
  message: 'Verification code sent to your email successfully' 
});
```

Also remove the demo display from `/components/screens/EmailVerificationScreen.tsx`:

```typescript
{/* Demo OTP Display - DELETE THIS SECTION IN PRODUCTION */}
{generatedOtp && (
  <div className="rounded-lg border border-accent/50 bg-accent/10 p-4">
    ...
  </div>
)}
```

## Testing Checklist

- [ ] Sign up with a new email
- [ ] Verification screen appears automatically
- [ ] OTP is visible in console/UI (demo mode)
- [ ] Can enter 6-digit code
- [ ] Invalid code shows error
- [ ] Valid code shows success and redirects
- [ ] Can resend code after 60 seconds
- [ ] New code invalidates old code
- [ ] Code expires after 10 minutes
- [ ] Back button returns to auth screen

## Security Considerations

🔒 **Time-Limited Codes**  
Codes expire after 10 minutes to prevent replay attacks

🔒 **Single-Use Codes**  
Each code is deleted after successful verification

🔒 **User-Specific**  
Codes are tied to specific user IDs

🔒 **Secure Storage**  
Codes stored in Supabase KV with automatic cleanup

🔒 **Rate Limiting**  
60-second cooldown between resend requests

## Troubleshooting

### Code Not Appearing (Demo Mode)

1. Check browser console (DevTools → Console tab)
2. Check blue info box on verification screen
3. Check Supabase logs (Dashboard → Edge Functions → Logs)

### Code Not Received (Production)

1. Check email spam/junk folder
2. Verify email service API key is correct
3. Check email service dashboard for errors
4. Ensure sender email is verified
5. Check daily sending limits

### "Invalid Code" Error

- Code may have expired (10 minutes)
- Code may have been used already
- User may have requested a new code
- Solution: Click "Resend Code"

### "Code Expired" Error

- Codes expire after 10 minutes
- Solution: Click "Resend Code"

## Documentation

📚 **Detailed Guides:**
- `/docs/email-verification-guide.md` - Complete technical documentation
- `/CHANGELOG-email-verification.md` - Migration notes from phone verification

## Support

Need help?

1. Review the error in browser console
2. Check server logs in Supabase dashboard  
3. Verify your configuration matches this guide
4. Check email service provider documentation

## Next Steps

Consider adding:

- [ ] Magic link authentication (no code needed)
- [ ] Email templates with brand colors
- [ ] Email change/update flow
- [ ] Two-factor authentication
- [ ] Failed attempt tracking
- [ ] Account recovery via email

---

**Last Updated:** October 25, 2025  
**System:** Email Verification  
**Status:** ✅ Active and Working
