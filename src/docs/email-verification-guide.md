# Email Verification Guide

## Overview

AuroraLink uses email verification to ensure users have access to their registered email address. After signing up, users must verify their email by entering a 6-digit code sent to their inbox.

## How It Works

### 1. User Registration Flow

1. User creates an account with email and password
2. After successful registration, they're automatically redirected to the email verification screen
3. A 6-digit OTP code is automatically sent to their email
4. User enters the code to verify their email
5. Once verified, they gain full access to AuroraLink

### 2. Verification Code Delivery

**Demo Mode:**
- Verification codes are displayed in the browser console
- Codes are also shown in the UI for easy testing
- In production, remove the `otp` field from the API response

**Production Mode:**
- Integrate with an email service provider (SendGrid, AWS SES, Resend, etc.)
- Replace the console.log statements in `/supabase/functions/server/index.tsx`
- Send actual emails to users with their verification codes

### 3. Security Features

- **Time-Limited Codes**: OTP codes expire after 10 minutes
- **Single-Use Codes**: Each code can only be used once
- **Secure Storage**: Codes are stored with user_id to prevent cross-user attacks
- **Rate Limiting**: 60-second cooldown between resend requests

## API Endpoints

### Send Verification Code

```typescript
POST /make-server-29f6739b/email/send-otp
Content-Type: application/json

{
  "user_id": "uuid-of-user"
}

// Response
{
  "success": true,
  "otp": "123456",  // Remove in production!
  "email": "user@example.com",
  "message": "Verification code sent to your email successfully"
}
```

### Verify Code

```typescript
POST /make-server-29f6739b/email/verify-otp
Content-Type: application/json

{
  "user_id": "uuid-of-user",
  "otp": "123456"
}

// Response
{
  "success": true,
  "message": "Email verified successfully"
}
```

## Frontend Components

### EmailVerificationScreen

Located at `/components/screens/EmailVerificationScreen.tsx`

**Props:**
- `userId`: The Supabase auth user ID
- `userEmail`: The user's email address
- `onVerificationComplete`: Callback when verification succeeds
- `onBack`: Callback for back button

**Features:**
- Automatic OTP sending on mount
- 6-digit OTP input with validation
- Resend functionality with countdown timer
- Demo mode indicator showing the code
- Success animation and auto-redirect

## Database Schema

### User Profile (KV Store)

```typescript
{
  id: string;              // Supabase auth user ID
  email: string;           // User's email address
  email_verified: boolean; // Verification status
  email_verified_at: string; // ISO timestamp
  full_name: string;
  username: string;
  // ... other fields
}
```

### OTP Storage (KV Store)

**Key:** `email_otp:{user_id}`

```typescript
{
  otp: string;           // 6-digit code
  user_id: string;       // User ID
  email: string;         // Email address
  created_at: string;    // ISO timestamp
  expires_at: string;    // ISO timestamp (created_at + 10 minutes)
}
```

## Configuration

### Email Service Integration (Production)

To integrate with a real email service, update `/supabase/functions/server/index.tsx`:

```typescript
// Example with SendGrid
import sgMail from 'npm:@sendgrid/mail';

sgMail.setApiKey(Deno.env.get('SENDGRID_API_KEY') || '');

// In the send-otp endpoint, replace console.log with:
await sgMail.send({
  to: userEmail,
  from: 'noreply@auroralink.com',
  subject: 'Verify Your AuroraLink Email',
  text: `Your verification code is: ${otp}`,
  html: `
    <h2>Verify Your Email</h2>
    <p>Hi ${fullName},</p>
    <p>Your AuroraLink email verification code is:</p>
    <h1 style="font-size: 32px; letter-spacing: 8px;">${otp}</h1>
    <p>This code will expire in 10 minutes.</p>
  `,
});
```

### Environment Variables Required

For production email sending, add to Supabase secrets:
- `SENDGRID_API_KEY` (if using SendGrid)
- Or equivalent for your chosen email provider

## Testing

### Demo Mode Testing

1. Sign up with any email address
2. Check the browser console for the verification code
3. Or look at the blue info box on the verification screen
4. Enter the 6-digit code
5. You should see a success message

### Production Testing

1. Configure a real email service
2. Sign up with a real email address
3. Check your inbox for the verification email
4. Enter the code from the email
5. Verify you can access the app

## Customization

### Code Expiration Time

Change the expiration time in `/supabase/functions/server/index.tsx`:

```typescript
// Default: 10 minutes
expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),

// Example: 5 minutes
expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
```

### Resend Cooldown

Change the countdown in `/components/screens/EmailVerificationScreen.tsx`:

```typescript
// Default: 60 seconds
const [countdown, setCountdown] = useState(60);

// Example: 30 seconds
const [countdown, setCountdown] = useState(30);
```

### Email Template

Customize the email template in the server's send-otp endpoint to match your brand.

## Troubleshooting

### Code Not Received

**In Demo Mode:**
- Check browser console for the code
- Look at the server logs in Supabase dashboard

**In Production:**
- Check spam/junk folder
- Verify email service credentials
- Check email service logs
- Ensure sender email is verified with email provider

### Invalid Code Error

- Code may have expired (10-minute limit)
- Code may have been used already
- User may have requested a new code (invalidates old ones)
- Ask user to request a new code

### Code Expired Error

- Codes expire after 10 minutes
- User should click "Resend Code"
- New code will be sent to email

## Security Best Practices

1. **Never log OTP codes in production** - Remove console.log statements
2. **Use HTTPS only** - Supabase Edge Functions use HTTPS by default
3. **Implement rate limiting** - Consider limiting OTP requests per email/IP
4. **Monitor for abuse** - Track failed verification attempts
5. **Clear expired OTPs** - Consider a cleanup job for old OTP records

## Support

For issues or questions about email verification:
1. Check the browser console for error messages
2. Check the server logs in Supabase dashboard
3. Verify your email service configuration
4. Review the API endpoint responses
