# Facebook Access Token Setup Guide

## Problem
If you're getting error `(#200) If posting to a group...`, it means your Facebook access token doesn't have the `user_posts` permission, even if it shows in Graph API Explorer.

## Solution: Generate a New Token with user_posts Permission

### Step 1: Go to Facebook Graph API Explorer
1. Visit: https://developers.facebook.com/tools/explorer/
2. Make sure you're logged into Facebook

### Step 2: Select Your App
1. In the top right, click the dropdown next to "Meta App"
2. Select "Post Meeting Content Generator" (or your app name)

### Step 3: Generate Access Token
1. Click "Generate Access Token" button
2. A popup will appear asking for permissions
3. **IMPORTANT**: Make sure `user_posts` is checked
4. Also check `public_profile` (usually checked by default)
5. Click "Generate Access Token"

### Step 4: Verify Permissions
1. In the "Permissions" section on the right, you should see:
   - ✅ `user_posts` (with a checkmark)
   - ✅ `public_profile` (with a checkmark)

### Step 5: Copy the Token
1. Copy the long access token string
2. It will look like: `EAAQ06lHY7RYBP7bZBbdgt3hJ4k3dxjnBZCivr...`

### Step 6: Add Token to Your App

**Option A: Using Browser Console (Easiest)**
1. Open your app in the browser (logged in)
2. Open Developer Console (F12)
3. Run this command (replace with your new token):
```javascript
fetch('/api/settings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    facebookAccessToken: 'YOUR_NEW_TOKEN_HERE'
  })
}).then(r => r.json()).then(data => {
  console.log('✅ Token saved!', data);
  alert('Facebook token saved successfully!');
}).catch(err => {
  console.error('❌ Error:', err);
  alert('Error: ' + err.message);
});
```

**Option B: Using Settings Page**
- The token will be saved automatically when you click "Connect" on Facebook in Settings

### Step 7: Test Posting
1. Go to a meeting with a transcript
2. Generate a post
3. Click "Post to Facebook"
4. Check your Facebook feed - the post should appear!

## Troubleshooting

### Token Still Not Working?
1. **Check Token Type**: Make sure it's a "User Token", not "Page Token"
   - In Graph API Explorer, check "User or Page" section
   - Should say "User Token"

2. **Verify Permissions**: 
   - Go to Graph API Explorer
   - Click the "i" icon next to your token
   - Check that `user_posts` shows as "granted"

3. **Token Expired?**
   - User tokens expire after 1-2 hours
   - Generate a new token and update it
   - For production, use the OAuth flow which gets long-lived tokens

4. **App Not Approved?**
   - If your app is in development mode, only you can use it
   - Make sure you're using your own Facebook account
   - For production, submit your app for review

### Common Errors

**Error 200: Permission denied**
- Your token doesn't have `user_posts` permission
- Generate a new token with this permission checked

**Error 190: Invalid token**
- Token expired or invalid
- Generate a new token

**Error 10: Permission denied**
- App doesn't have required permissions
- Check your app settings in Facebook Developer Portal

## Notes

- **Token Expiration**: User tokens from Graph API Explorer expire quickly (1-2 hours)
- **For Production**: Use the OAuth flow in Settings to get long-lived tokens (60 days)
- **Permissions**: The app needs `user_posts` permission to post to user feed
- **App Review**: For production, you may need to submit your app for review to get `user_posts` permission approved

