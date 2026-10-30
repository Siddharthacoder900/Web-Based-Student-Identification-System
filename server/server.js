import app from './app.js'
import { connectDatabase } from './db.js'
import { config } from './config/env.js'

try {
  await connectDatabase()
  app.listen(config.port, () => {
    console.info(`BIET API listening on http://localhost:${config.port}`)
  })
} catch (error) {
  console.error(`BIET API startup failed: ${error.message}`)
  process.exitCode = 1
}
