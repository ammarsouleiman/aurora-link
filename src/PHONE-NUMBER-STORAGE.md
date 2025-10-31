# Phone Number Storage in AuroraLink

## 📍 Storage Location

Phone numbers are stored **exclusively in Supabase Auth** user metadata, NOT in the KV store index.

### ✅ Where Phone Numbers Are Stored

1. **Supabase Auth User Metadata** (Primary)
   - Field: `user.user_metadata.phone_number`
   - Format: E.164 (e.g., `+1234567890`)
   - Purpose: Single source of truth, searchable via Admin API
   - Access: Via Supabase Admin API

2. **KV Store User Profile** (Copy)
   - Key: `user:{user_id}`
   - Field: `phone_number`
   - Purpose: Display in UI, user profile
   - Access: Via backend API

### ❌ What We Don't Store

- ~~`phone_index:{phone_number}`~~ - REMOVED
- No separate phone number index in KV store
- No duplicate phone tracking system

## 🔍 How Phone Search Works

### When User Signs Up
```typescript
1. Check if phone exists in Supabase Auth users
2. If exists → Return error "Phone number already registered"
3. If not exists → Create user with phone in user_metadata
4. Save user profile to KV store (including phone)
```

### When Searching by Phone
```typescript
1. User enters phone number (e.g., +1234567890)
2. Backend queries Supabase Auth Admin API
3. Search all users for matching user_metadata.phone_number
4. If found → Return user profile from KV store
5. If not found → Return "No user found"
```

## 💾 Data Flow

### Signup Flow
```
User submits:
  - Email: user@example.com
  - Password: ********
  - Name: John Doe
  - Phone: +1234567890
        ↓
Supabase Auth:
  user_metadata: {
    full_name: "John Doe",
    phone_number: "+1234567890"
  }
        ↓
KV Store:
  user:{user_id}: {
    id: "user_123",
    full_name: "John Doe",
    email: "user@example.com",
    phone_number: "+1234567890",
    ...
  }
```

### Search Flow
```
User searches: +1234567890
        ↓
Backend: supabaseAdmin.auth.admin.listUsers()
        ↓
Filter: users.find(u => u.user_metadata.phone_number === "+1234567890")
        ↓
Found: user_id = "user_123"
        ↓
Fetch: kv.get("user:user_123")
        ↓
Return: User profile
```

## 🎯 Benefits

### ✅ Advantages
- **Single Source of Truth**: Phone numbers live in Supabase Auth
- **No Duplicate Data**: No separate phone index to maintain
- **Automatic Cleanup**: When user is deleted, phone is automatically freed
- **Consistent**: Phone number always matches Supabase Auth record
- **Secure**: Phone numbers stored in managed Supabase infrastructure

### ⚠️ Considerations
- **Search Performance**: Listing all users may be slower with many users
- **Scaling**: For 10,000+ users, consider adding search optimization
- **API Limits**: Supabase Admin API has rate limits

## 🚀 Future Optimizations

If the app scales to thousands of users:

1. **Cache Frequently Searched Numbers**
   - Store recent searches in memory/Redis
   - Reduce Supabase API calls

2. **Add Search Index**
   - Create dedicated phone → user_id mapping
   - Update on signup/profile changes

3. **Use Database Triggers**
   - Auto-sync phone numbers to searchable table
   - Maintain consistency automatically

## 📝 Code Examples

### Check Phone Availability (Signup)
```typescript
const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
const phoneExists = existingUsers?.users?.some(
  (u) => u.user_metadata?.phone_number === phone_number
);

if (phoneExists) {
  return error("Phone number already registered");
}
```

### Search User by Phone
```typescript
const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers();

const foundUser = allUsers?.users?.find(
  (u) => u.user_metadata?.phone_number === phone_number
);

if (foundUser) {
  const profile = await kv.get(`user:${foundUser.id}`);
  return profile;
}
```

## 🔒 Security

- Phone numbers are stored in Supabase Auth (encrypted at rest)
- Only accessible via Admin API (requires service role key)
- Service role key never exposed to frontend
- Phone search requires user authentication
- Results exclude sensitive data (email, etc.)

## ✨ Summary

**Phone numbers are stored in Supabase Auth user metadata** and searched directly from there. This provides a clean, consistent architecture where Supabase Auth is the single source of truth for user authentication and contact information.
