// Deployment settings. The static site reads window.KIDS_CONFIG (optionally set in config.local.js)
// so the same files work in Docker with or without the API.
//   apiUrl: "https://api.example.com"   (empty = guest/personal mode only)
export const config = {
  apiUrl: (window.KIDS_CONFIG && window.KIDS_CONFIG.apiUrl) || '',
};

export const cloudConfigured = () => !!config.apiUrl;
