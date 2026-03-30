import app from "./app";
import { logger } from "./lib/logger";
import { loadSubs } from "./lib/push-store";
import { configurePush } from "./lib/push-sender";
import { startPushMonitor } from "./lib/push-monitor";
import { startWalletChainCron } from "./lib/wallet-chain-cron";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  loadSubs();
  configurePush();
  startPushMonitor().catch(e => logger.warn({ e }, 'Push monitor başlatılamadı'));
  startWalletChainCron();
});
