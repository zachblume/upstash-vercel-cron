import fs from "fs";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

// Only run the script if we're deploying to staging
if (process.env.ENVIRONMENT === "staging") {
    console.log("Scheduling cron jobs on staging");
    destroyAndScheduleAllCronJobs();
}

async function fetchCurrentSchedules() {
    const response = await fetch(`${QSTASH_PREFIX_URL}/schedules`, {
        headers: {
            Authorization: `Bearer ${process.env.QSTASH_TOKEN}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Error fetching schedules: ${response.statusText}`);
    }

    return response.json();
}

async function destroyAllSchedules() {
    const schedules = await fetchCurrentSchedules();
    const promises = schedules.map(async (schedule) => {
        const url = `${QSTASH_PREFIX_URL}/schedules/${schedule.id}`;

        const response = await fetch(url, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${process.env.QSTASH_TOKEN}`,
            },
        });

        if (!response.ok) {
            throw new Error(`Error destroying schedule ${schedule.id}: ${response.statusText}`);
        }
    });

    await Promise.allSettled(promises);
}

async function scheduleSingleCronJob(job) {
    const url = `${process.env.QSTASH_PREFIX_URL}/publish${encodeURIComponent(job.endpoint)}`;

    const response = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${process.env.QSTASH_TOKEN}`,
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        throw new Error(`Error scheduling job for endpoint ${job.endpoint}: ${response.statusText}`);
    }

    console.log(`Scheduled cron job for endpoint ${job.endpoint}`);
}

async function destroyAndScheduleAllCronJobs() {
    await destroyAllSchedules();

    // Read the vercel.json file to get the cron jobs
    const vercelConfig = JSON.parse(fs.readFileSync("vercel.json", "utf8"));
    const cronJobs = vercelConfig.crons || [];

    // Schedule the jobs in parallel
    const promises = cronJobs.map((job) =>
        scheduleSingleCronJob({
            ...job,
            // Add the staging custom URL to the endpoint to make it an absolute URL
            endpoint: `${process.env.STAGING_CUSTOM_URL}${job.endpoint}`,
        })
    );
    await Promise.allSettled(promises);
}
