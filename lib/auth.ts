import { betterAuth } from 'better-auth';
import { Pool } from '@neondatabase/serverless';

if (!process.env.BETTER_AUTH_URL) {
  throw new Error('BETTER_AUTH_URL env var wajib di-set. Jangan gunakan localhost di production.');
}

if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error('BETTER_AUTH_SECRET env var wajib di-set.');
}

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),
  emailAndPassword: {
    enabled: true,
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: [process.env.BETTER_AUTH_URL],
});
