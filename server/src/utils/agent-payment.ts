import { createHash } from 'node:crypto'

export function priceUSDC(size: number, days: number, rate: number, minimum: number) {
  if (!Number.isSafeInteger(size) || size < 1 || size > 10 * 1024 * 1024 || !Number.isSafeInteger(days) || days < 1 || days > 3650 || !Number.isFinite(rate) || rate <= 0)
    throw new Error('Invalid upload size, duration or pricing configuration')
  const effectiveDuration = Math.max(days, minimum)
  const atomic = Math.max(1, Math.ceil(size * effectiveDuration * rate * 1_000_000))
  if (!Number.isSafeInteger(atomic)) throw new Error('Price exceeds supported range')
  return { atomic: String(atomic), usdc: (atomic / 1_000_000).toFixed(6), totalCost: atomic / 1_000_000, effectiveDuration }
}

export function validateAgentFile(file: Express.Multer.File | undefined, query: Record<string, unknown>) {
  const size = Number(query.size), duration = Number(query.duration)
  if (!file || file.size !== size || !Number.isSafeInteger(duration) || duration < 1 || duration > 3650)
    throw new Error('Uploaded bytes must match the quoted size and duration')
  if (!file.originalname || /[\\/\x00]/.test(file.originalname)) throw new Error('Invalid filename')
  const sha256 = createHash('sha256').update(file.buffer).digest('hex')
  if (query.sha256 !== undefined && query.sha256 !== sha256) throw new Error('Artifact differs from approval')
  if (query.id !== undefined && !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(String(query.id))) throw new Error('Invalid export ID')
  return sha256
}
