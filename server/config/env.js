import 'dotenv/config'

const required = ['MONGODB_URI', 'JWT_SECRET']

for (const name of required) {
  if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`)
}

if (process.env.JWT_SECRET.length < 32 || /replace-with|change-me|your-secret/i.test(process.env.JWT_SECRET)) {
  throw new Error('JWT_SECRET must be a non-placeholder random secret of at least 32 characters.')
}

export const config = {
  port: Number(process.env.PORT || 5001),
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  frontendOrigins: (process.env.FRONTEND_ORIGINS || 'http://localhost:5173').split(',').map(value => value.trim()),
  publicAppUrl: process.env.PUBLIC_APP_URL || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development',
}
