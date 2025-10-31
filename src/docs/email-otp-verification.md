# Email-Based Phone Number Verification System

## Overview

AuroraLink uses a phone-based user discovery system where users can find and connect with each other using phone numbers. The verification process sends a One-Time Password (OTP) to the user's registered email address instead of SMS.

## How It Works

### 1. **Phone Number Registration**
- Users enter their phone number in E.164 international format
- Support for 195+ countries worldwide, including Lebanon (+961)
- Phone numbers are validated and stored securely

### 2. **Email OTP Verification**
- When a user submits their phone number for verification:
  1. System generates a 6-digit OTP code
  2. OTP is sent to the user's **registered email address** (not SMS)
  3. User receives the code via email and enters it in the app
  4. Upon successful verification, the phone number is linked to their account

### 3. **User Discovery**
- Once verified, users can be found by others using their phone number
- Use the "Find by Phone" feature to search for contacts
- Only users with verified phone numbers can be discovered

## Key Features

### Comprehensive Country Support
- **195 countries** supported with full E.164 formatting
- Special mention: **Lebanon (🇱🇧 +961)** is fully supported
- Automatic country code selection with flags
- Smart phone number formatting based on country

### Email-Based Verification Benefits
- **No SMS costs** - Verification codes sent via email
- **More reliable** - Email delivery is more consistent than SMS
- **Better for development** - Easy to test without SMS gateway
- **Production ready** - Can be integrated with email services like SendGrid, AWS SES, or Resend

### Privacy & Security
- Phone numbers are encrypted and stored securely
- Only visible to users who search for them
- Never shared without permission
- OTP expires after 10 minutes
- One phone number per user account

## Implementation Details

### Backend Endpoints

#### `/phone/send-otp` (POST)
Sends verification code to user's email
```json
Request:
{
  "user_id": "uuid",
  "phone_number": "+9611234567"
}

Response:
{
  "success": true,
  "email": "user@example.com",
  "otp": "123456" // Demo only, remove in production
}
```

#### `/phone/verify-otp` (POST)
Verifies the OTP code
```json
Request:
{
  "user_id": "uuid",
  "phone_number": "+9611234567",
  "otp": "123456"
}

Response:
{
  "success": true,
  "message": "Phone verified successfully"
}
```

#### `/phone/search` (POST)
Find users by phone number
```json
Request:
{
  "phone_number": "+9611234567"
}

Response:
{
  "user": {
    "id": "uuid",
    "full_name": "John Doe",
    "username": "johndoe",
    "avatar_url": "https://...",
    "is_online": true
  }
}
```

### Components

- **PhoneInput** - International phone number input with country selector
- **PhoneVerificationScreen** - Complete verification flow UI
- **FindByPhoneDialog** - Search and add users by phone number
- **OTPInput** - 6-digit code entry component

## For Production Use

To enable email sending in production, integrate with an email service:

### Option 1: SendGrid
```typescript
// In server/index.tsx
import sgMail from '@sendgrid/mail';
sgMail.setApiKey(Deno.env.get('SENDGRID_API_KEY'));

await sgMail.send({
  to: userProfile.email,
  from: 'verify@auroralink.app',
  subject: 'AuroraLink Phone Verification Code',
  text: `Your verification code is: ${otp}`,
  html: `<p>Your AuroraLink verification code is: <strong>${otp}</strong></p>`
});
```

### Option 2: AWS SES
```typescript
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const ses = new SESClient({ region: 'us-east-1' });
await ses.send(new SendEmailCommand({
  Source: 'verify@auroralink.app',
  Destination: { ToAddresses: [userProfile.email] },
  Message: {
    Subject: { Data: 'AuroraLink Phone Verification Code' },
    Body: { Text: { Data: `Your verification code is: ${otp}` } }
  }
}));
```

### Option 3: Resend
```typescript
import { Resend } from 'resend';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
await resend.emails.send({
  from: 'verify@auroralink.app',
  to: userProfile.email,
  subject: 'AuroraLink Phone Verification Code',
  html: `<p>Your verification code is: <strong>${otp}</strong></p>`
});
```

## Testing

In demo/development mode:
1. The OTP is displayed in the browser console
2. The OTP is also shown in a warning box on screen
3. The email address is displayed so you know where it would be sent
4. Check server logs to see the formatted email that would be sent

## User Flow

```
1. User signs up/logs in
   ↓
2. Prompted to verify phone number
   ↓
3. Select country code (e.g., Lebanon +961)
   ↓
4. Enter phone number
   ↓
5. Click "Send Verification Code"
   ↓
6. Check registered email for 6-digit code
   ↓
7. Enter OTP code
   ↓
8. Phone verified! Can now be found by others
   ↓
9. Can search for other users by their phone numbers
```

## Benefits of This System

1. **Global Reach** - All countries supported with proper formatting
2. **Cost Effective** - No SMS gateway fees during development
3. **Reliable** - Email delivery is more consistent than SMS
4. **User Friendly** - Users can check email from any device
5. **Secure** - OTP expires in 10 minutes, one-time use
6. **Privacy** - Phone numbers only visible through intentional search

## Support

For Lebanon (🇱🇧) and all other countries:
- Full E.164 format support
- Country-specific formatting hints
- Visual flag indicators
- Smart validation

Example Lebanese number: +961 71 123 456
