# upstash-vercel-cron

Vercel has a nice Cron job syntax where you can list api directory endpoints to be called periodically in `vercel.json`. Because Vercel keeps every past deployment hosted, as well as generated new ones for each branch, they only implement this in production to avoid having thousands of past deployments running cron.

However, it's a common requirement to have a staging environment that matches production as closely as possible, including cron jobs. My setup on Vercel isolates a branch called `staging`  and has a custom domain mapped to `myapp-staging.vercel.app`, since I also have an isolated staging database. I do this because branches auto-deploy to preview on Vercel, so the preview database isn't gaurenteed to be in a clean state that matches the migration history of staging, because I also auto-deploy database migrations with the builds.

This repo is a workaround for the staging-production difference, with a simple node script that runs on deployment to staging, and reconciles QStash to execute the same cron job schedule as specified in `vercel.json `... to make sure that the reconciliation is complete, it just deletes all existing jobs and recreates them according to the new `vercel.json`, which is not an ideal solution if you're using Qstash schedules for anything else!

## Usage

You'll need two environment variables set for your staging environment:
- `UPSTASH_URL` - the url of your upstash redis instance
- `UPSTASH_TOKEN` - the auth token for QStash
- `ENVIRONMENT` - needs to be set to "staging" in the environment you want to trigger this script in (or you can rewrite the conditional)
- `STAGING_CUSTOM_URL` - the custom url for your staging environment, so the script knows the callback prefix to pass to QStash

Then, add the following line to your package.json `vercel-build` script, like so:
```
{
    "name": "myapp",
    ...
    "scripts": {
        ...
        "vercel-build": "node putCronsOnStaging.mjs && next build",
        ...
    },
    ...
}
```
