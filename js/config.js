// Deployment settings. The static site reads window.KIDS_CONFIG (optionally set in config.local.js)
// so the same files work in Docker with or without the API.
//   apiUrl: "https://api.example.com"   (empty = guest/personal mode only)
export const config = {
  apiUrl: (window.KIDS_CONFIG && window.KIDS_CONFIG.apiUrl) || '',
};

// Single letter sounds (/s/, /m/ on their own). OFF in Phase 1: the generated sounds are not good enough yet, so
// letter cards show the sound written (/s/) and only whole words play. Set to true in Phase 2 (better or recorded
// sounds): the sound buttons, "sound it out" and the sounds in blending and games come back.
export const PLAY_SINGLE_SOUNDS = false;

export const cloudConfigured = () => !!config.apiUrl;
