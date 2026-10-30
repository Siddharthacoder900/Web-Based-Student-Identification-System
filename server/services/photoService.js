import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { fileTypeFromBuffer } from 'file-type'

const serverDirectory = path.dirname(fileURLToPath(import.meta.url))
export const uploadDirectory = path.join(serverDirectory, '..', 'uploads')
const supportedTypes = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
])

export async function savePhotograph(file) {
  if (!file) return null
  const detected = await fileTypeFromBuffer(file.buffer)
  const extension = detected && supportedTypes.get(detected.mime)
  if (!extension) {
    const error = new Error('Upload a valid JPEG or PNG photograph.')
    error.status = 400
    throw error
  }
  await mkdir(uploadDirectory, { recursive: true })
  const filename = `${randomUUID()}${extension}`
  await writeFile(path.join(uploadDirectory, filename), file.buffer, { flag: 'wx', mode: 0o600 })
  return filename
}

export async function removePhotograph(filename) {
  if (filename) await unlink(path.join(uploadDirectory, path.basename(filename))).catch(error => {
    if (error.code !== 'ENOENT') throw error
  })
}
