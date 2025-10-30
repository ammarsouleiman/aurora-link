# Email Verification - Migration from Phone Verification

## Summary

AuroraLink has been updated to use **email verification** instead of phone number verification. Users now verify their email address after signup using a 6-digit OTP code sent to their inbox.

## What Changed

### ✅ New Features

1. **Email Verification Screen**
   - New `EmailVerificationScreen` component
   - Automatic OTP sending on screen load
   - Clean, user-friendly interface
   - Demo mode showing verification codes for testing

2. **Email-Based OTP System**
   - Codes sent to user's registered email
   - 10-minute expiration time
   - Secure, single-use codes
   - Resend functionality with 60-second cooldown

3. **Updated Backend Endpoints**
   - `/email/send-otp` - Sends verification code to email
   - `/email/verify-otp` - Verifies the entered code

### 🔄 Modified Components

- **App.tsx**: Updated to use `EmailVerificationScreen` instead of `PhoneVerificationScreen`
- **User Type**: Added `email` and `email_verified` fields
- **ViewState Type**: Changed 'phone-verification' to 'email-verification'

### 📁 New Files

- `/components/screens/EmailVerificationScreen.tsx` - Email verification UI
- `/docs/email-verification-guide.md` - Complete documentation
- `/CHANGELOG-email-verification.md` - This file

### 🗑️ Deprecated (but not removed)

The following phone-related components still exist but are not used in the main flow:
- `PhoneVerificationScreen.tsx` - Can be removed if not needed
- `PhoneInput.tsx` - Can be removed if not needed
- `FindByPhoneDialog.tsx` - Can be removed if not needed
- `/utils/phone.ts` - Still contains the `validateOTP` function which is used

## Migration Guide

If you were using the old phone verification system, here's what you need to know:

### For Existing Users

Existing user profiles may have:
- `phone_number` field (optional, no longer required)
- `phone_verified` field (optional, no longer checked)

New users will have:
- `email` field (required)
- `email_verified` field (required for app access)

### Database Changes

**User Profile Schema (KV Store):**

```typescript
// Old (phone-based)
{
  id: string;
  phone_number: string;      // Required
  phone_verified: boolean;   // Required
  // ...
}

// New (email-based)
{
  id: string;
  email: string;            // Required
  email_verified: boolean;  // Required
  phone_number?: string;    // Optional
  phone_verified?: boolean; // Optional
  // ...
}
```

### Flow Comparison

**Old Phone Verification Flow:**
1. User signs up with email/password
2. User enters phone number
3. OTP sent to email (confusing!)
4. User verifies phone number
5. Access granted

**New Email Verification Flow:**
1. User signs up with email/password
2. OTP automatically sent to email
3. User verifies email address
4. Access granted

## Testing

### Demo Mode

The verification code is displayed:
1. In the browser console
2. In a blue info box on the verification screen
3. In the server logs (Supabase dashboard)

### Testing Steps

1. **Sign Up**
   ```
   - Navigate to app
   - Click "Create Account"
   - Enter email, password, name
   - Submit
   ```

2. **Verify Email**
   ```
   - You'll be redirected to email verification
   - Check console or info box for code
   - Enter the 6-digit code
   - Click "Verify Email"
   ```

3. **Access App**
   ```
   - On success, you're redirected to home
   - Email is marked as verified
   - Full app access granted
   ```

## Production Setup

To enable real email sending:

1. **Choose an Email Service**
   - SendGrid
   - AWS SES
   - Resend
   - Mailgun
   - Postmark

2. **Install Email SDK**
   ```typescript
   // Example: SendGrid
   import sgMail from 'npm:@sendgrid/mail';
   ```

3. **Update Server Code**
   
   In `/supabase/functions/server/index.tsx`, find the `/email/send-otp` endpoint and replace the console.log section with actual email sending:
   
   ```typescript
   // Replace this:
   console.log(`📧 OTP Email to ${userEmail}...`);
   
   // With this:
   await sgMail.send({
     to: userEmail,
     from: 'noreply@auroralink.com',
     subject: 'Verify Your AuroraLink Email',
     html: `Your verification code is: <strong>${otp}</strong>`,
   });
   ```

4. **Add Environment Variables**
   
   In Supabase dashboard > Edge Functions > Secrets:
   ```
   SENDGRID_API_KEY=your_api_key_here
   ```

5. **Remove Demo Code**
   
   Delete the `otp` field from the API response:
   ```typescript
   // Remove this line in production:
   otp, // Remove this in production!
   ```

## Benefits of Email Verification

✅ **Simpler User Experience**
- Users already provided their email during signup
- No need to enter a phone number
- Familiar verification process

✅ **Lower Costs**
- Email is free or very cheap
- No SMS costs

✅ **Global Compatibility**
- Works in all countries
- No phone number formatting issues
- No carrier limitations

✅ **Privacy**
- Users don't need to share phone numbers
- Reduced PII (Personal Identifiable Information)

✅ **Security**
- Email ownership verification
- Same security level as phone verification
- Single-use, time-limited codes

## Backwards Compatibility

The phone number fields remain in the database schema for backwards compatibility:
- Existing users with verified phones keep their phone data
- New users can optionally add phone numbers later
- Phone search functionality (`FindByPhoneDialog`) still works if needed

## Support

For questions or issues:
1. Check `/docs/email-verification-guide.md` for detailed documentation
2. Review browser console for errors
3. Check server logs in Supabase dashboard
4. Verify email service configuration (production)

## Next Steps

Optional enhancements you might want to add:

1. **Email Resend Limits**
   - Track number of OTP requests per hour
   - Prevent email bombing

2. **Magic Link Alternative**
   - Allow email verification via clickable link
   - No code entry needed

3. **Custom Email Templates**
   - Branded email design
   - HTML templates with company colors

4. **Email Change Flow**
   - Allow users to change email
   - Verify new email before switching

5. **Two-Factor Authentication**
   - Optional 2FA using email codes
   - Enhanced security for sensitive actions
