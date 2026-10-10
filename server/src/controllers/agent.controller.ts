import * as Sentry from '@sentry/node'
import { eq } from 'drizzle-orm'
import { Request, Response } from 'express'
import { randomUUID } from 'node:crypto'
import { db } from '../db/db.js'
import { uploads } from '../db/schema.js'
import { pinFiles, gatewayUrl } from '../services/storage/pinata.service.js'
import { getExpiryDate } from '../utils/functions.js'
import { logger } from '../utils/logger.js'
import { getPricingConfig } from '../utils/pricing.js'
import { priceUSDC, validateAgentFile } from '../utils/agent-payment.js'

// x402 buffers this handler's response, settles, then attaches PAYMENT-RESPONSE.
export const uploadAgentFile = async (req: Request, res: Response) => {
  try {
    const sha256 = validateAgentFile(req.file, req.query)
    const file = req.file!
    const id = String(req.query.id || randomUUID())
    const existing = await db.select().from(uploads).where(eq(uploads.agentExportId, id)).limit(1)
    if (existing.length) return res.status(409).json({message:'Export already attempted; check its receipt instead of paying again', id})
    const config = await getPricingConfig()
    const quote = priceUSDC(file.size, Number(req.query.duration), config.ratePerBytePerDay, config.minDurationDays)
    const payment = JSON.parse(Buffer.from(String(req.headers['payment-signature']), 'base64').toString())
    const payer = payment.payload?.authorization?.from
    if (!/^0x[0-9a-fA-F]{40}$/.test(payer || '')) throw new Error('Verified payer missing')
    const expiresAt = getExpiryDate(quote.effectiveDuration)
    // Claim the export before the external pin. A failed attempt is reconciled, not replayed.
    const inserted = await db.insert(uploads).values({
      agentExportId:id, artifactSha256:sha256, depositAmount:Number(quote.atomic), durationDays:quote.effectiveDuration,
      contentCid:'pending:'+id, depositKey:payer, depositSlot:1, lastClaimedSlot:1,
      expiresAt, createdAt:new Date().toISOString(), userEmail:null, fileName:file.originalname,
      fileType:file.mimetype, fileSize:file.size, transactionHash:null, deletionStatus:'pending',
      warningSentAt:null, paymentChain:'base', paymentToken:'USDC',
    }).onConflictDoNothing().returning({id:uploads.id})
    if (!inserted.length) return res.status(409).json({message:'Export already attempted',id})
    const cid = await pinFiles({[file.originalname]:{buffer:new Uint8Array(file.buffer),mimetype:file.mimetype}},file.originalname)
    await db.update(uploads).set({contentCid:cid}).where(eq(uploads.id,inserted[0].id))
    return res.status(200).json({id,uploadId:inserted[0].id,cid,sha256,expiresAt,fileName:file.originalname,fileSize:file.size,url:gatewayUrl(cid,file.originalname)})
  } catch(error) {
    Sentry.captureException(error)
    logger.error('Agent upload failed',{error:error instanceof Error?error.message:String(error)})
    return res.status(500).json({message:'Agent upload could not complete. Check the receipt before retrying.'})
  }
}

export const getAgentReceipt = async (req: Request, res: Response) => {
  const id = String(req.params.id)
  if (!/^[0-9a-f-]{36}$/.test(id)) return res.status(400).json({message:'Invalid export ID'})
  const [row] = await db.select().from(uploads).where(eq(uploads.agentExportId,id)).limit(1)
  if (!row) return res.status(404).json({message:'Export not found'})
  return res.json({id,cid:row.contentCid,sha256:row.artifactSha256,transaction:row.transactionHash,
    status:row.transactionHash?'stored':'uncertain',fileName:row.fileName,expiresAt:row.expiresAt,network:process.env.X402_NETWORK === 'mainnet'?'eip155:8453':'eip155:84532'})
}
