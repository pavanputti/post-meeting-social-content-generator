# Vercel Deployment Guide

This guide will help you deploy the Post-meeting Social Media Content Generator to Vercel.

## Prerequisites

1. A Vercel account (sign up at https://vercel.com)
2. A GitHub account with the repository pushed
3. A PostgreSQL database (Vercel Postgres, Supabase, or any PostgreSQL provider)

## Step 1: Set up PostgreSQL Database

The application uses SQLite locally but requires PostgreSQL for production.

### Option A: Vercel Postgres (Recommended)
1. Go to your Vercel project dashboard
2. Navigate to the "Storage" tab
3. Click "Create Database" → "Postgres"
4. Create a new database
5. Copy the connection string (you'll need it for `DATABASE_URL`)

### Option B: External PostgreSQL (Supabase, Railway, etc.)
1. Create a PostgreSQL database on your preferred provider
2. Copy the connection string

## Step 2: Deploy to Vercel

### Method 1: Deploy via Vercel Dashboard

1. Go to https://vercel.com/new
2. Import your GitHub repository: `pavanputti/post-meeting-social-content-generator`
3. Configure the project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (or leave default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)

### Method 2: Deploy via Vercel CLI

```bash
npm i -g vercel
vercel
```

Follow the prompts to link your project.

## Step 3: Configure Environment Variables

In your Vercel project dashboard, go to **Settings** → **Environment Variables** and add the following:

### Required Environment Variables

#### Authentication
- `NEXTAUTH_SECRET` - Generate a random secret: `openssl rand -base64 32`
- `NEXTAUTH_URL` - Your Vercel deployment URL (e.g., `https://your-app.vercel.app`)

#### Google OAuth
- `GOOGLE_CLIENT_ID` - Your Google OAuth Client ID
- `GOOGLE_CLIENT_SECRET` - Your Google OAuth Client Secret

**Important**: Update your Google OAuth redirect URI in Google Cloud Console:
- Add: `https://your-app.vercel.app/api/auth/callback/google`

#### Database
- `DATABASE_URL` - PostgreSQL connection string
  - Format: `postgresql://user:password@host:port/database?sslmode=require`

#### Recall.ai
- `RECALL_API_KEY` - Your Recall.ai API key
- `RECALL_REGION` - Your Recall.ai region (e.g., `us-west-2`, `us-east-1`, `eu-central-1`, `ap-northeast-1`)

#### LinkedIn OAuth
- `LINKEDIN_CLIENT_ID` - Your LinkedIn App Client ID
- `LINKEDIN_CLIENT_SECRET` - Your LinkedIn App Client Secret

**Important**: Update your LinkedIn redirect URI in LinkedIn Developer Portal:
- Add: `https://your-app.vercel.app/api/auth/linkedin/callback`

#### Facebook OAuth
- `FACEBOOK_CLIENT_ID` - Your Facebook App ID
- `FACEBOOK_CLIENT_SECRET` - Your Facebook App Secret

**Important**: Update your Facebook redirect URI in Facebook Developer Portal:
- Add: `https://your-app.vercel.app/api/auth/facebook/callback`

#### Twitter/X OAuth (Optional)
- `TWITTER_CLIENT_ID` - Your Twitter App Client ID
- `TWITTER_CLIENT_SECRET` - Your Twitter App Client Secret

**Important**: Update your Twitter redirect URI in Twitter Developer Portal:
- Add: `https://your-app.vercel.app/api/auth/twitter/callback`

#### AI Generation (Optional)
- `GEMINI_API_KEY` - Your Google Gemini API key (for AI post generation)
  - If not provided, the app will use template-based generation

#### Cron Job Security
- `CRON_SECRET` - A random secret for securing cron endpoints
  - Generate: `openssl rand -base64 32`

### Environment Variable Setup in Vercel

1. Go to your project in Vercel dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable for **Production**, **Preview**, and **Development** environments
4. Click **Save**

## Step 4: Update Prisma Schema for PostgreSQL

The schema is currently set to SQLite. For production, you need to update it:

1. In `prisma/schema.prisma`, change:
   ```prisma
   datasource db {
     provider = "postgresql"  // Change from "sqlite"
     url      = env("DATABASE_URL")
   }
   ```

2. Commit and push the change:
   ```bash
   git add prisma/schema.prisma
   git commit -m "Update Prisma schema for PostgreSQL"
   git push
   ```

3. Vercel will automatically redeploy

## Step 5: Run Database Migrations

After deployment, you need to run Prisma migrations:

### Option A: Via Vercel CLI
```bash
vercel env pull .env.local
npx prisma migrate deploy
```

### Option B: Via Vercel Dashboard
1. Go to your project → **Deployments**
2. Click on the latest deployment
3. Open the deployment logs
4. The build process should run `prisma migrate deploy` automatically

## Step 6: Set up Cron Jobs

The app uses Vercel Cron Jobs to poll Recall.ai for transcripts. The cron job is configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/recall-poll",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**Important**: 
- Cron jobs are only available on Vercel Pro plan or higher
- For Hobby plan, you can use external cron services (e.g., cron-job.org) to ping the endpoint
- Make sure `CRON_SECRET` is set and matches in your cron service

## Step 7: Verify Deployment

1. Visit your Vercel deployment URL
2. Test Google sign-in
3. Test calendar sync
4. Test LinkedIn/Facebook connections
5. Verify cron jobs are running (check Vercel logs)

## Troubleshooting

### Build Fails
- Check that all environment variables are set
- Verify `DATABASE_URL` is correct
- Check build logs in Vercel dashboard

### Database Connection Issues
- Verify `DATABASE_URL` format is correct
- Check database is accessible from Vercel's IP ranges
- Ensure SSL is enabled (add `?sslmode=require` to connection string)

### OAuth Redirect Errors
- Verify redirect URIs match exactly in OAuth provider settings
- Check `NEXTAUTH_URL` matches your deployment URL
- Ensure no trailing slashes in redirect URIs

### Cron Jobs Not Running
- Verify you're on Vercel Pro plan (or use external cron service)
- Check `CRON_SECRET` is set correctly
- Verify the cron endpoint is accessible

## Next Steps

1. Set up a custom domain (optional)
2. Enable Vercel Analytics (optional)
3. Set up monitoring and error tracking
4. Configure backup strategy for database

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Review environment variables
3. Verify OAuth redirect URIs
4. Check database connectivity

