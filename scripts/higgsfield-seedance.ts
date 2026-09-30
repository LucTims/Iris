/**
 * Higgsfield SDK smoke test — Seedance 2.5 text-to-video.
 *
 * Usage:
 *   node --env-file=.env.local node_modules/.bin/tsx scripts/higgsfield-seedance.ts
 *   # or via npm script:
 *   npm run higgsfield:seedance
 *
 * Credentials are read from HF_CREDENTIALS in .env.local
 * (KEY_ID:KEY_SECRET). They are never logged.
 *
 * NOTE: This makes a real, billable generation request.
 */
import { higgsfield } from "@higgsfield/client/v2";
import type { V2Response } from "@higgsfield/client/v2";

const MODEL_ENDPOINT = "bytedance/seedance-2.5/text-to-video";

async function main(): Promise<void> {
  if (!process.env.HF_CREDENTIALS && !process.env.HF_KEY) {
    console.error(
      "HF_CREDENTIALS is missing. Ensure .env.local is loaded " +
        "(run with `node --env-file=.env.local ...`).",
    );
    process.exitCode = 1;
    return;
  }

  console.log(`Submitting ${MODEL_ENDPOINT} generation...`);

  let response: V2Response;
  try {
    response = await higgsfield.subscribe(MODEL_ENDPOINT, {
      input: {
        prompt: "A cinematic scene at sunset",
        duration: 5,
        resolution: "720p",
        aspect_ratio: "16:9",
      },
      withPolling: true,
    });
  } catch (err) {
    console.error("Generation request failed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
    return;
  }

  console.log(`request_id: ${response.request_id}`);
  console.log(`status:     ${response.status}`);

  const status = response.status as string;
  if (status === "completed") {
    const videoUrl = response.video?.url;
    if (!videoUrl) {
      console.error(
        "Status is `completed` but no video URL was returned. Payload:",
        JSON.stringify(response, null, 2),
      );
      process.exitCode = 1;
      return;
    }
    console.log("Video URL:", videoUrl);
    return;
  }
  if (status === "failed") {
    console.error("Generation FAILED. Credits should have been refunded.");
    process.exitCode = 1;
    return;
  }
  if (status === "canceled" || status === "cancelled") {
    console.error("Generation was CANCELED.");
    process.exitCode = 1;
    return;
  }
  if (status === "nsfw" || status === "moderated") {
    console.error("Generation was MODERATED. Credits should have been refunded.");
    process.exitCode = 1;
    return;
  }
  if (status === "queued" || status === "in_progress") {
    console.error(
      `Polling ended while status is still \`${status}\`. ` +
        `Poll manually via ${response.status_url}.`,
    );
    process.exitCode = 1;
    return;
  }
  console.error(`Unexpected status: ${status}`);
  process.exitCode = 1;
}

main().catch((err) => {
  console.error("Unhandled error:", err instanceof Error ? err.stack ?? err.message : err);
  process.exitCode = 1;
});
