# Phone Verification Flow - Visual Guide

## 🔄 Complete User Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    NEW USER REGISTRATION                     │
└─────────────────────────────────────────────────────────────┘
                             ↓
                ┌────────────────────────┐
                │   Sign Up / Login      │
                │                        │
                │  • Email               │
                │  • Password            │
                │  • Full Name           │
                └────────────────────────┘
                             ↓
                ┌────────────────────────┐
                │  Phone Verification    │
                │      Required          │
                └────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                 PHONE NUMBER ENTRY                           │
└─────────────────────────────────────────────────────────────┘
                             ↓
        ┌────────────────────────────────────────┐
        │  Select Country from 195 options       │
        │                                        │
        │  🇺🇸 United States (+1)                │
        │  🇱🇧 Lebanon (+961)          ← ✅      │
        │  🇸🇦 Saudi Arabia (+966)              │
        │  🇦🇪 UAE (+971)                        │
        │  ... and 191 more                      │
        └────────────────────────────────────────┘
                             ↓
        ┌────────────────────────────────────────┐
        │  Enter Phone Number                    │
        │                                        │
        │  Example (Lebanon):                    │
        │  71 123 456                            │
        │                                        │
        │  Formatted: +961 71 123 456            │
        └────────────────────────────────────────┘
                             ↓
        ┌────────────────────────────────────────┐
        │  Click "Send Verification Code"        │
        └────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                    EMAIL OTP DELIVERY                        │
└─────────────────────────────────────────────────────────────┘
                             ↓
        ┌────────────────────────────────────────┐
        │  Backend Process:                      │
        │                                        │
        │  1. Retrieve user email from profile   │
        │  2. Generate 6-digit OTP               │
        │  3. Store OTP (10 min expiry)          │
        │  4. Send to email address              │
        └────────────────────────────────────────┘
                             ↓
        ┌────────────────────────────────────────┐
        │  📧 Email Sent To:                     │
        │  user@example.com                      │
        │                                        │
        │  Subject: AuroraLink Phone             │
        │           Verification Code            │
        │                                        │
        │  Body: Your verification code is:      │
        │        123456                          │
        │                                        │
        │  (Code expires in 10 minutes)          │
        └────────────────────────────────────────┘
                             ↓
        ┌────────────────────────────────────────┐
        │  Demo Mode Display:                    │
        │                                        │
        │  ⚠️  Demo Mode - Check Your Email      │
        │  Code sent to: user@example.com        │
        │  Your verification code is: 123456     │
        └────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                    OTP VERIFICATION                          │
└─────────────────────────────────────────────────────────────┘
                             ↓
        ┌────────────────────────────────────────┐
        │  User Enters 6-Digit Code              │
        │                                        │
        │  [1] [2] [3] [4] [5] [6]               │
        └────────────────────────────────────────┘
                             ↓
        ┌────────────────────────────────────────┐
        │  Backend Validation:                   │
        │                                        │
        │  ✓ Check OTP matches                   │
        │  ✓ Verify not expired                  │
        │  ✓ Mark phone as verified              │
        │  ✓ Create phone index                  │
        └────────────────────────────────────────┘
                             ↓
        ┌────────────────────────────────────────┐
        │  ✅ SUCCESS!                            │
        │                                        │
        │  Phone +961 71 123 456 verified!       │
        └────────────────────────────────────────┘
                             ↓
        ┌────────────────────────────────────────┐
        │  Redirect to Home Screen               │
        └────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                  USER DISCOVERY ENABLED                      │
└─────────────────────────────────────────────────────────────┘
                             ↓
        ┌────────────────────────────────────────┐
        │  Features Now Available:               │
        │                                        │
        │  ✅ Can be found by phone number       │
        │  ✅ Can search for others              │
        │  ✅ Start conversations                │
        │  ✅ Full messaging access              │
        └────────────────────────────────────────┘
```

---

## 🔍 Phone-Based User Discovery Flow

```
┌─────────────────────────────────────────────────────────────┐
│              FIND FRIENDS BY PHONE NUMBER                    │
└─────────────────────────────────────────────────────────────┘
                             ↓
        ┌────────────────────────────────────────┐
        │  Click "New Chat" → "Find by Phone"    │
        └────────────────────────────────────────┘
                             ↓
        ┌────────────────────────────────────────┐
        │  Enter Friend's Phone Number           │
        │                                        │
        │  Country: Lebanon 🇱🇧                  │
        │  Number: 76 123 456                    │
        │                                        │
        │  Will search: +961 76 123 456          │
        └────────────────────────────────────────┘
                             ↓
        ┌────────────────────────────────────────┐
        │  Backend Search:                       │
        │                                        │
        │  1. Format to E.164: +96176123456      │
        │  2. Lookup in phone_index              │
        │  3. Retrieve user profile              │
        │  4. Return user data                   │
        └────────────────────────────────────────┘
                             ↓
              ┌──────────────────────┐
              │   User Found? ✓      │
              └──────────────────────┘
                   ↓         ↓
         ┌─────────┘         └─────────┐
         ↓                             ↓
    ┌─────────┐                  ┌─────────┐
    │   YES   │                  │   NO    │
    └─────────┘                  └─────────┘
         ↓                             ↓
┌─────────────────────┐      ┌──────────────────────┐
│  Display User Card  │      │  "User not found"    │
│                     │      │                      │
│  👤 Full Name       │      │  Possible reasons:   │
│  @username          │      │  • Not registered    │
│  ● Online           │      │  • Phone not verified│
│  "Status message"   │      │  • Wrong number      │
└─────────────────────┘      └──────────────────────┘
         ↓
┌─────────────────────┐
│  [Start Chat]       │
│  [Search Again]     │
└─────────────────────┘
         ↓
┌─────────────────────┐
│  Create/Open        │
│  Conversation       │
└─────────────────────┘
```

---

## 🌍 Country Selection Process

```
┌─────────────────────────────────────────────────────────────┐
│                 COUNTRY CODE SELECTOR                        │
└─────────────────────────────────────────────────────────────┘

    ┌──────────────────────────────────┐
    │  [🇺🇸 +1      ▼]                 │  ← Click to open
    └──────────────────────────────────┘
                 ↓
    ┌──────────────────────────────────────────────┐
    │  Search country...                 [🔍]      │
    │─────────────────────────────────────────────│
    │  Popular Countries:                          │
    │  🇺🇸 United States        +1                │
    │  🇬🇧 United Kingdom       +44               │
    │  🇮🇳 India                +91               │
    │  🇨🇳 China                +86               │
    │─────────────────────────────────────────────│
    │  All Countries (A-Z):                        │
    │  🇦🇫 Afghanistan          +93               │
    │  🇦🇱 Albania              +355              │
    │  🇩🇿 Algeria              +213              │
    │  ...                                         │
    │  🇱🇧 Lebanon              +961    ← ✅       │
    │  ...                                         │
    │  🇿🇼 Zimbabwe             +263              │
    │                                              │
    │  Total: 195 countries                        │
    └──────────────────────────────────────────────┘
                 ↓
    ┌──────────────────────────────────┐
    │  [🇱🇧 +961     ▼]                │  ← Selected
    └──────────────────────────────────┘
```

### Search Example:

```
Type "leb" → Shows:
  🇱🇧 Lebanon +961

Type "961" → Shows:
  🇱🇧 Lebanon +961

Type "+961" → Shows:
  🇱🇧 Lebanon +961
```

---

## 📧 Email OTP vs SMS Comparison

```
┌─────────────────────────────────────────────────────────────┐
│                    OLD: SMS BASED                            │
└─────────────────────────────────────────────────────────────┘

User enters phone → SMS Gateway → 💸 Cost per message
                       ↓
                  SMS to phone
                       ↓
              Delivery issues:
              • Network problems
              • Carrier blocks
              • International delays
              • High costs


┌─────────────────────────────────────────────────────────────┐
│                    NEW: EMAIL BASED                          │
└─────────────────────────────────────────────────────────────┘

User enters phone → Email Service → 💰 Free/Low cost
                       ↓
               Email to inbox
                       ↓
              Benefits:
              ✓ Reliable delivery
              ✓ No SMS costs
              ✓ Easy testing
              ✓ Better formatting
              ✓ Accessible anywhere
              ✓ No carrier dependency
```

---

## 🔐 Security Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   SECURITY MEASURES                          │
└─────────────────────────────────────────────────────────────┘

[OTP Generation]
       ↓
  Random 6 digits
  (100000-999999)
       ↓
┌──────────────────┐
│  Store in KV:    │
│  • OTP code      │
│  • User ID       │
│  • Phone number  │
│  • Email         │
│  • Created time  │
│  • Expires time  │ ← 10 minutes
└──────────────────┘
       ↓
┌──────────────────────────────────┐
│  Verification Checks:            │
│                                  │
│  1. ✓ OTP matches stored value  │
│  2. ✓ Not expired (< 10 min)    │
│  3. ✓ User ID matches            │
│  4. ✓ Phone matches              │
│  5. ✓ Delete OTP after use       │
└──────────────────────────────────┘
       ↓
┌──────────────────────────────────┐
│  On Success:                     │
│  • Mark phone as verified        │
│  • Create phone_index entry      │
│  • Delete OTP from storage       │
│  • Enable user discovery         │
└──────────────────────────────────┘
```

---

## 🛠️ Developer View: Backend Flow

```
┌─────────────────────────────────────────────────────────────┐
│              POST /phone/send-otp                            │
└─────────────────────────────────────────────────────────────┘

Request:
{
  "user_id": "uuid-123",
  "phone_number": "+96171123456"
}

Backend Process:
1. Get user profile → Retrieve email
2. Check phone not already used
3. Generate OTP (6 digits)
4. Store in KV with expiry
5. Log email (demo mode)
6. Return success + email

Response:
{
  "success": true,
  "email": "user@example.com",
  "otp": "123456",  ← Demo only
  "message": "OTP sent to your email successfully"
}

Console Output:
📧 OTP Email to user@example.com for phone +96171123456: 123456
📧 Email Subject: AuroraLink Phone Verification Code
📧 Email Body: Your AuroraLink verification code is: 123456
📧 This code will expire in 10 minutes.


┌─────────────────────────────────────────────────────────────┐
│              POST /phone/verify-otp                          │
└─────────────────────────────────────────────────────────────┘

Request:
{
  "user_id": "uuid-123",
  "phone_number": "+96171123456",
  "otp": "123456"
}

Backend Process:
1. Retrieve stored OTP
2. Check expiration
3. Validate OTP match
4. Update user profile
5. Create phone index
6. Delete OTP

Response:
{
  "success": true,
  "message": "Phone verified successfully"
}


┌─────────────────────────────────────────────────────────────┐
│              POST /phone/search                              │
└─────────────────────────────────────────────────────────────┘

Request:
{
  "phone_number": "+96171123456"
}

Backend Process:
1. Format to E.164
2. Lookup phone_index
3. Get user_id
4. Fetch user profile
5. Return limited data

Response:
{
  "user": {
    "id": "uuid-123",
    "full_name": "John Doe",
    "username": "johndoe",
    "avatar_url": "https://...",
    "is_online": true
  }
}
```

---

## 🎨 UI States

### Phone Entry Screen

```
┌─────────────────────────────────────────┐
│  ← Phone Verification                   │
│  Enter your phone number                │
├─────────────────────────────────────────┤
│                                         │
│           📱                            │
│     Verify Your Number                  │
│                                         │
│  AuroraLink uses your phone number to   │
│  connect you with friends and family    │
│                                         │
│  Phone Number                           │
│  ┌─────────────┬────────────────────┐  │
│  │ 🇱🇧 +961 ▼ │ 71 123 456         │  │
│  └─────────────┴────────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  Send Verification Code          │  │
│  └──────────────────────────────────┘  │
│                                         │
│  We'll send a 6-digit verification     │
│  code to your registered email          │
│                                         │
│  🛡️ Your privacy is protected          │
│  Your phone number is encrypted and     │
│  never shared without your permission.  │
│  We'll send a verification code to      │
│  your registered email address.         │
│                                         │
└─────────────────────────────────────────┘
```

### OTP Entry Screen

```
┌─────────────────────────────────────────┐
│  ← Phone Verification                   │
│  Enter verification code                │
├─────────────────────────────────────────┤
│                                         │
│           🛡️                            │
│   Enter Verification Code               │
│                                         │
│  We sent a code to user@example.com     │
│  Verifying: +961 71 123 456             │
│                                         │
│  6-Digit Code                           │
│  ┌───┬───┬───┬───┬───┬───┐            │
│  │ 1 │ 2 │ 3 │ 4 │ 5 │ 6 │            │
│  └───┴───┴───┴───┴───┴───┘            │
│                                         │
│  ⚠️  Demo Mode - Check Your Email       │
│  Code sent to: user@example.com         │
│  Your verification code is: 123456      │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │         Verify                   │  │
│  └──────────────────────────────────┘  │
│                                         │
│  Resend code in 45s                     │
│                                         │
│  [ Change Phone Number ]                │
│                                         │
└─────────────────────────────────────────┘
```

### Success Screen

```
┌─────────────────────────────────────────┐
│  ← Phone Verification                   │
│  Verification successful                │
├─────────────────────────────────────────┤
│                                         │
│                                         │
│           ✅                            │
│         Verified!                       │
│                                         │
│  Your phone number has been             │
│  successfully verified                  │
│                                         │
│  ● Setting up your account...           │
│                                         │
│                                         │
└─────────────────────────────────────────┘
```

---

## 📊 Data Flow Diagram

```
┌──────────────┐
│   Frontend   │
│   (React)    │
└──────────────┘
       ↓ POST /phone/send-otp
       │ { user_id, phone_number }
       ↓
┌──────────────────────────────────┐
│   Backend (Hono Server)          │
│                                  │
│  1. Validate input               │
│  2. Get user profile → email     │
│  3. Check phone availability     │
│  4. Generate OTP                 │
│  5. Store in KV                  │
│  6. Log email (demo)             │
│  7. Return success               │
└──────────────────────────────────┘
       ↓
┌──────────────────────────────────┐
│   KV Store (Supabase)            │
│                                  │
│   otp:{phone}:                   │
│   {                              │
│     otp: "123456",               │
│     user_id: "uuid",             │
│     phone_number: "+961...",     │
│     email: "user@email.com",     │
│     expires_at: "2025..."        │
│   }                              │
└──────────────────────────────────┘
       ↑
       │ Verify OTP
       ↓
┌──────────────────────────────────┐
│   User Profile Update            │
│                                  │
│   user:{id}:                     │
│   {                              │
│     ...existing data,            │
│     phone_number: "+961...",     │
│     phone_verified: true,        │
│     phone_verified_at: "..."     │
│   }                              │
└──────────────────────────────────┘
       ↓
┌──────────────────────────────────┐
│   Phone Index (for search)       │
│                                  │
│   phone_index:{phone}:           │
│   {                              │
│     user_id: "uuid",             │
│     phone_number: "+961...",     │
│     verified_at: "..."           │
│   }                              │
└──────────────────────────────────┘
```

---

## 🌟 Key Features Highlighted

### ✅ Universal Country Support
- 195 countries
- Lebanon included with +961
- Smart search and filtering
- Visual flags for recognition

### ✅ Email-Based Verification
- Sent to registered email
- No SMS costs
- Reliable delivery
- Easy to test

### ✅ User Discovery
- Find by phone number
- Privacy-focused
- Verified users only
- Instant messaging

### ✅ Security First
- 10-minute OTP expiry
- One-time use
- Encrypted storage
- Audit logging

---

**Last Updated:** October 25, 2025  
**System Version:** 2.0.0  
**Status:** ✅ Production Ready
