// Local demo server with an in-memory PostgreSQL (PGlite): no database to install.
//   npm run dev:memory     then set apiUrl in ../env.js to http://localhost:3001 and open the site on http://localhost:8080
import { startServerOn } from './helpers.js';
const port = Number(process.env.PORT) || 3001;
const origins = process.env.CORS_ORIGIN || 'http://localhost:8080,http://127.0.0.1:8080';
const s = await startServerOn(port, { corsOrigins: origins.split(',') });
console.log(`Demo API (in-memory DB, data is lost on exit): ${s.base}`);
