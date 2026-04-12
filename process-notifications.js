#!/usr/bin/env node
// scripts/process-notifications.js
// Run this on a cron: */30 * * * * (every 30 seconds via node-cron or external scheduler)
// Can also be triggered as a Vercel cron function at /api/cron/notifications

const { processNotificationQueue } = require('../lib/notifications');

async function main() {
  console.log(`[${new Date().toISOString()}] Processing notification queue...`);

  try {
    const result = await processNotificationQueue(100);
    console.log(`  ✓ Sent: ${result.sent}  Failed: ${result.failed}`);
  } catch (err) {
    console.error('  ✗ Error processing queue:', err);
    process.exit(1);
  }
}

main();
