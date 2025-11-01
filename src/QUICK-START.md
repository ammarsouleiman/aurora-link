# 🚀 Quick Start - Email Verification

## Try It Now!

### 1. Sign Up

1. Open the AuroraLink app
2. Click **"Create Account"**
3. Fill in:
   - **Email:** `test@example.com` (or any email)
   - **Password:** `password123` (or any password)
   - **Full Name:** `Test User` (or your name)
4. Click **"Create Account"**

### 2. Verify Email

You'll be automatically redirected to the **Email Verification** screen.

**In Demo Mode**, find your verification code in one of these places:

#### Option 1: Browser Console
1. Press `F12` or right-click → Inspect
2. Go to **Console** tab
3. Look for: `🔐 Email Verification Code (Demo): 123456`

#### Option 2: Blue Info Box
Look for the blue box on the verification screen that says:
```
Demo Mode - Code Sent!
Your verification code is: 123456
```

#### Option 3: Server Logs
1. Go to Supabase Dashboard
2. Navigate to Edge Functions → Logs
3. Find the email with your code

### 3. Enter Code

1. Type the 6-digit code into the input fields
2. Click **"Verify Email"**
3. Success! You'll be redirected to the home screen 🎉

## Example Flow

```
┌─────────────────────────────────────────┐
│         🌟 AuroraLink                   │
│                                         │
│  Email:     test@example.com            │
│  Password:  ••••••••                    │
│  Name:      Test User                   │
│                                         │
│  [        Create Account        ]       │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  📧 Check Your Email                    │
│                                         │
│  We sent a verification code to         │
│  test@example.com                       │
│                                         │
│  [1] [2] [3] [4] [5] [6]               │
│                                         │
│  Demo Mode - Code Sent!                 │
│  Your verification code is: 123456      │
│                                         │
│  [      Verify Email      ]            │
│                                         │
│  Resend code in 60s                     │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  ✅ Email Verified!                     │
│                                         │
│  Your email has been successfully       │
│  verified                               │
│                                         │
│  • Setting up your account...           │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  🏠 Welcome to AuroraLink!              │
│                                         │
│  Start messaging, create groups, and    │
│  connect with friends!                  │
└─────────────────────────────────────────┘
```

## Features to Try

After verification, you can:

✅ **Create Conversations** - Start 1-on-1 or group chats  
✅ **Send Messages** - Text, images, files  
✅ **React to Messages** - Add emoji reactions  
✅ **Edit Profile** - Update name, avatar, status  
✅ **Toggle Theme** - Switch between light/dark mode  

## Common Scenarios

### Resend Code

If you didn't get the code or it expired:

1. Wait for the countdown to finish (60 seconds)
2. Click **"Resend Code"**
3. A new code will be sent and displayed

### Wrong Code

If you enter the wrong code:

- You'll see an error message
- Try again with the correct code
- Or resend a new code

### Code Expired

Codes expire after 10 minutes. If yours expired:

1. Click **"Resend Code"**
2. Enter the new 6-digit code

### Go Back

If you want to sign in with a different account:

1. Click the **← back arrow**
2. You'll return to the login screen

## Testing Multiple Users

To test conversations, create multiple accounts:

1. Sign up as User 1 → Verify email
2. Log out
3. Sign up as User 2 → Verify email
4. (Optional) Add User 2's phone number
5. User 1 can search for User 2 by phone
6. Start a conversation!

## Production Notes

When deploying to production:

⚠️ **Remove Demo Code**
- Delete the OTP from API responses
- Remove the blue info box showing codes
- Don't log codes to console

✅ **Add Real Email Service**
- Configure SendGrid, AWS SES, or similar
- Update server code to send real emails
- Add environment variables for API keys

See `/docs/email-verification-guide.md` for production setup.

## Troubleshooting

### Code Not Showing

**Check these in order:**

1. ✅ Browser console is open (F12)
2. ✅ Looking at the Console tab (not Elements or Network)
3. ✅ Console filter is not hiding logs
4. ✅ Blue info box is visible on screen

### "Invalid Code" Error

- Make sure you entered all 6 digits
- Check for typos
- Codes are case-sensitive (though we use only numbers)
- Try requesting a new code

### Can't Click Verify Button

The button is disabled until:
- All 6 digits are entered
- You're not already submitting

### Stuck on Loading

If the app is stuck loading:

1. Check browser console for errors
2. Refresh the page
3. Clear browser cache and cookies
4. Try in an incognito/private window

## Next Steps

After you're verified and logged in:

1. **Explore the Home Screen** - See your conversations
2. **Create a New Chat** - Click the + button
3. **Update Your Profile** - Click settings (gear icon)
4. **Try Dark Mode** - Toggle theme in settings
5. **Send a Message** - Start chatting!

## Need Help?

📚 **Documentation:**
- `/README-VERIFICATION.md` - System overview
- `/docs/email-verification-guide.md` - Technical details
- `/CHANGELOG-email-verification.md` - What changed

🐛 **Found a Bug?**
Check the browser console and server logs for error messages.

---

**Happy Testing! 🎉**
