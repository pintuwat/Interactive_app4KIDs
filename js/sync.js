// Phase 2 hook. Loaded lazily so Phase 1 works without any server.
import { cloudConfigured } from './config.js';

export async function startSync(app) {
  if (!cloudConfigured()) return;
  try {
    const { startApiSync } = await import('./storage/api.js');
    startApiSync(app);
  } catch (err) {
    console.warn('Sync unavailable', err);
  }
}
