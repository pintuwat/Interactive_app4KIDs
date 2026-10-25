// All settings come from environment variables. Nothing secret lives in the repository (see .env.example).
const list = (v) => (v || '').split(',').map((s) => s.trim()).filter(Boolean);

export function loadConfig(env = process.env) {
  const production = env.NODE_ENV === 'production';
  const cfg = {
    production,
    port: Number(env.PORT) || 3000,
    databaseUrl: env.DATABASE_URL || '',
    jwtSecret: env.JWT_SECRET || '',
    corsOrigins: list(env.CORS_ORIGIN),
    trustProxy: env.TRUST_PROXY === undefined ? 1 : Number(env.TRUST_PROXY),
    allowInsecure: env.ALLOW_INSECURE === 'true',
    allowRegistration: env.ALLOW_REGISTRATION !== 'false',
    registrationCode: env.REGISTRATION_CODE || '',
    teacherTokenHours: Number(env.TEACHER_TOKEN_HOURS) || 8,
    studentTokenDays: Number(env.STUDENT_TOKEN_DAYS) || 90,
    maxStudentsPerClass: Number(env.MAX_STUDENTS_PER_CLASS) || 60,
    bcryptRounds: Number(env.BCRYPT_ROUNDS) || 12,
    rateLimit: env.RATE_LIMIT === 'off' ? false : true,
  };
  return cfg;
}

export function assertConfig(cfg) {
  const problems = [];
  if (!cfg.jwtSecret || cfg.jwtSecret.length < 32) problems.push('JWT_SECRET must be set (at least 32 random characters)');
  if (cfg.production && !cfg.corsOrigins.length) problems.push('CORS_ORIGIN must list the website origin, e.g. https://phonics.example.com');
  if (cfg.production && cfg.corsOrigins.some((o) => !o.startsWith('https://'))) problems.push('CORS_ORIGIN entries must be https:// in production');
  if (problems.length) throw new Error('Invalid configuration:\n - ' + problems.join('\n - '));
}
