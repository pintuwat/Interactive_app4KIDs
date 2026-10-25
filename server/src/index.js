import { loadConfig, assertConfig } from './config.js';
import { createPool } from './db.js';
import { migrate } from './migrate.js';
import { createApp } from './app.js';

const config = loadConfig();
assertConfig(config);
if (!config.databaseUrl) throw new Error('DATABASE_URL is not set');

const db = createPool(config.databaseUrl);
await migrate(db); // safe to run on every start: applied files are skipped
const app = createApp({ db, config });
const server = app.listen(config.port, () => console.log(`API listening on :${config.port}`));

const stop = () => server.close(() => db.close().then(() => process.exit(0)));
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
