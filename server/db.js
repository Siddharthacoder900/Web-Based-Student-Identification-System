import mongoose from 'mongoose'
import { config } from './config/env.js'

export async function connectDatabase() {
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10000 })
  return mongoose.connection
}
