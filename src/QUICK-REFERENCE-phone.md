# Quick Reference: Phone Numbers in AuroraLink

## 🎯 Where Phone Numbers Live

| Location | Field | Purpose | Access |
|----------|-------|---------|--------|
| **Supabase Auth** | `user.user_metadata.phone_number` | Single source of truth | Admin API |
| **KV Store** | `user:{id}.phone_number` | Display in UI | Backend API |

## 🔄 Key Operations

### ✅ Signup
```typescript
// Check availability
const { data: users } = await supabaseAdmin.auth.admin.listUsers();
const exists = users.users.some(u => u.user_metadata?.phone_number === phone);

// Create user
await supabaseAdmin.auth.admin.createUser({
  email,
  password,
  user_metadata: { full_name, phone_number },
  email_confirm: true
});
```

### 🔍 Search
```typescript
// Find user by phone
const { data: users } = await supabaseAdmin.auth.admin.listUsers();
const user = users.users.find(u => u.user_metadata?.phone_number === phone);
```

### 📱 Get User's Phone
```typescript
// From Supabase Auth
const { data: { user } } = await supabase.auth.getUser();
const phone = user.user_metadata?.phone_number;

// From KV Store
const profile = await kv.get(`user:${userId}`);
const phone = profile.phone_number;
```

## 📊 Data Flow

```
User Signs Up
    ↓
Phone → Supabase Auth (user_metadata)
    ↓
Phone → KV Store (user profile)
    ↓
User Searches Phone
    ↓
Query Supabase Auth users
    ↓
Find matching user_metadata.phone_number
    ↓
Fetch profile from KV Store
    ↓
Return user info
```

## 🚫 What NOT to Do

❌ Don't create `phone_index:` keys in KV store  
❌ Don't store phone separately from user_metadata  
❌ Don't trust phone from KV as source of truth  
❌ Don't bypass Supabase Auth for phone checks  

## ✅ What TO Do

✅ Always store phone in user_metadata during signup  
✅ Search phones via Supabase Auth Admin API  
✅ Copy phone to KV profile for UI display  
✅ Trust Supabase Auth as single source of truth  

## 🐛 Debugging

### Check Phone in Supabase Auth
```typescript
const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId);
console.log(user.user_metadata?.phone_number);
```

### Check Phone in KV Store
```typescript
const profile = await kv.get(`user:${userId}`);
console.log(profile?.phone_number);
```

### List All Users with Phones
```typescript
const { data: users } = await supabaseAdmin.auth.admin.listUsers();
users.users.forEach(u => {
  console.log(u.email, '→', u.user_metadata?.phone_number);
});
```

## 📝 Format Requirements

- **Format:** E.164 (e.g., `+1234567890`)
- **Validation:** `^\\+[1-9]\\d{1,14}$`
- **Required:** Yes (during signup)
- **Unique:** Yes (one phone per user)

## 🔗 Related Files

- `/supabase/functions/server/index.tsx` - Main server logic
- `/components/FindByPhoneDialog.tsx` - Search UI
- `/components/PhoneInput.tsx` - Phone input component
- `/utils/phone.ts` - Phone formatting utilities

## 💡 Quick Tips

1. **Phone is required** for signup
2. **Search is case-sensitive** for phone format
3. **Always use E.164 format** (with `+` prefix)
4. **Logs show** phone operations with emojis 📱🔍✅❌
5. **Admin API required** for phone search/check
