# Post-Meeting Social Content Generator

A Next.js application that automatically generates social media content from meeting transcripts using AI. Built for **jump.ai**.

## Features

- 🔐 **Google Authentication** - Sign in with Google and sync multiple Google Calendar accounts
- 📅 **Calendar Integration** - View upcoming meetings and toggle notetaker attendance
- 🤖 **Recall.ai Integration** - Automatically send bots to meetings (Zoom, Microsoft Teams, Google Meet)
- 📝 **Meeting Transcripts** - View full transcripts of past meetings
- ✉️ **AI-Generated Emails** - Generate follow-up emails from meeting transcripts
- 📱 **Social Media Posting** - Generate and post content to LinkedIn, Facebook, and Twitter/X
- ⚙️ **Automations** - Configure custom automations for different platforms
- 🎯 **Smart Content Generation** - Uses Google Gemini API (free tier) for AI-powered content

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (via Prisma ORM)
- **Authentication**: NextAuth.js v4
- **Styling**: Tailwind CSS
- **AI**: Google Gemini API
- **APIs**: 
  - Google Calendar API
  - Recall.ai API
  - LinkedIn UGC API
  - Facebook Graph API
  - Twitter/X API v2

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (local or cloud)
- Google Cloud Project with OAuth credentials
- Recall.ai API key
- Social media app credentials (LinkedIn, Facebook, Twitter/X)
- Google Gemini API key (optional, falls back to template-based generation)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd post-meeting-social-content-generator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

   # NextAuth
   NEXTAUTH_SECRET="your-secret-key"
   NEXTAUTH_URL="http://localhost:3000"

   # Google OAuth
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"

   # Recall.ai
   RECALL_API_KEY="your-recall-api-key"
   RECALL_REGION="us-west-2"

   # LinkedIn OAuth
   LINKEDIN_CLIENT_ID="your-linkedin-client-id"
   LINKEDIN_CLIENT_SECRET="your-linkedin-client-secret"

   # Facebook OAuth
   FACEBOOK_CLIENT_ID="your-facebook-app-id"
   FACEBOOK_CLIENT_SECRET="your-facebook-app-secret"

   # Twitter/X OAuth
   TWITTER_CLIENT_ID="your-twitter-client-id"
   TWITTER_CLIENT_SECRET="your-twitter-client-secret"

   # Google Gemini API (optional)
   GEMINI_API_KEY="your-gemini-api-key"

   # Cron Secret (for Vercel cron jobs)
   CRON_SECRET="your-cron-secret"
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma Client
   npx prisma generate

   # Push schema to database
   npm run db:push
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

### Required Variables

- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Secret for NextAuth.js (generate with: `openssl rand -base64 32`)
- `NEXTAUTH_URL` - Your application URL
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `RECALL_API_KEY` - Recall.ai API key
- `RECALL_REGION` - Recall.ai region (e.g., `us-west-2`, `us-east-1`)

### Optional Variables

- `GEMINI_API_KEY` - Google Gemini API key for AI content generation
- `LINKEDIN_CLIENT_ID` - LinkedIn OAuth client ID
- `LINKEDIN_CLIENT_SECRET` - LinkedIn OAuth client secret
- `FACEBOOK_CLIENT_ID` - Facebook App ID
- `FACEBOOK_CLIENT_SECRET` - Facebook App Secret
- `TWITTER_CLIENT_ID` - Twitter/X OAuth client ID
- `TWITTER_CLIENT_SECRET` - Twitter/X OAuth client secret
- `CRON_SECRET` - Secret for protecting cron endpoints

## Database Setup

The application uses PostgreSQL with Prisma ORM. The schema includes:

- **User** - User accounts and authentication
- **GoogleAccount** - Connected Google accounts for calendar access
- **Meeting** - Meeting records with transcripts and metadata
- **Automation** - Custom automation configurations
- **UserSettings** - User preferences and OAuth tokens

To update the database schema:
```bash
npm run db:push
```

## Usage

### 1. Sign In
- Click "Sign in with Google" to authenticate
- Grant calendar access permissions

### 2. Connect Multiple Google Accounts
- Go to Settings
- Click "Connect Google Account" to add additional calendars

### 3. View Upcoming Meetings
- The home page displays upcoming calendar events
- Toggle the notetaker switch to enable/disable bot attendance

### 4. Configure Notetaker
- In Settings, set how many minutes before a meeting the bot should join
- The bot will automatically join meetings with meeting links (Zoom, Teams, Google Meet)
- **Password-Protected Meetings**: The app automatically handles password-protected meetings by:
  - Extracting passwords from meeting URLs when present
  - Extracting passwords from calendar event descriptions (looks for patterns like "Password: 1234", "Passcode: ABC123", etc.)
  - Merging passwords into meeting links before sending to Recall.ai bots

### 5. View Past Meetings
- Click on a past meeting to view details
- View the full transcript
- Generate a follow-up email
- Generate and post social media content

### 6. Social Media Posting
- Connect your LinkedIn, Facebook, or Twitter/X accounts in Settings
- Create automations to customize post generation
- Generate posts from meeting transcripts
- Copy or post directly to your social media accounts

## Testing

Run tests with:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## Deployment

### Vercel Deployment

1. **Push your code to GitHub**

2. **Import project in Vercel**
   - Connect your GitHub repository
   - Vercel will auto-detect Next.js

3. **Set up PostgreSQL**
   - Use Neon PostgreSQL (recommended) or another provider
   - Add `DATABASE_URL` environment variable

4. **Add environment variables**
   - Add all required environment variables in Vercel dashboard
   - See `VERCEL_DEPLOYMENT.md` for detailed instructions

5. **Deploy**
   - Vercel will automatically deploy on push
   - The build command is configured in `vercel.json`

### Cron Jobs

The application uses Vercel cron jobs to poll Recall.ai bots. Configured in `vercel.json`:
- Polls every 5 minutes: `/api/cron/recall-poll`

## API Integrations

### Google Calendar
- Reads calendar events from connected Google accounts
- Detects meeting links (Zoom, Teams, Google Meet)
- Automatically extracts and handles meeting passwords from URLs and descriptions
- Requires `https://www.googleapis.com/auth/calendar.readonly` scope

### Recall.ai
- Creates bots to join meetings
- Polls bot status (due to shared account)
- Retrieves transcripts when available
- Tracks bot IDs per user

### Social Media APIs
- **LinkedIn**: Uses UGC API for posting
- **Facebook**: Uses Graph API for posting
- **Twitter/X**: Uses API v2 for posting

## Project Structure

```
├── app/
│   ├── api/              # API routes
│   ├── settings/         # Settings page
│   └── page.tsx          # Home page
├── components/           # React components
├── lib/                  # Utility functions
│   ├── auth.ts          # NextAuth configuration
│   ├── google-calendar.ts
│   ├── recall.ts
│   └── social-media.ts
├── prisma/
│   └── schema.prisma    # Database schema
└── __tests__/           # Test files
```

## Troubleshooting

### Google OAuth Issues
- Ensure test users are added in Google Cloud Console
- Check redirect URIs are configured correctly
- Verify OAuth consent screen is set up

### Calendar Not Syncing
- Check Google account is connected
- Verify calendar API is enabled
- Check access token is valid

### Recall.ai Bot Not Joining
- Verify meeting link is detected
- Check bot join time is configured
- Ensure Recall.ai API key is valid
- **For password-protected meetings**: 
  - Ensure the meeting password is included in the meeting URL (e.g., `?pwd=ABC123`)
  - Or add the password in the calendar event description (e.g., "Password: ABC123")
  - The app will automatically extract and include passwords when creating bots

### Social Media Posting Fails
- Reconnect accounts in Settings
- Verify OAuth scopes are approved
- Check access tokens are valid

## About

The application demonstrates integration with multiple APIs (Google Calendar, Recall.ai, LinkedIn, Facebook, Twitter/X) and AI-powered content generation.

## License

for evaluation purposes only.

