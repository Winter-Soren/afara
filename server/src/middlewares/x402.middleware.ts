import { facilitator as cdpFacilitator } from '@coinbase/x402'
import { HTTPFacilitatorClient, x402ResourceServer } from '@x402/core/server'
import { ExactEvmScheme } from '@x402/evm/exact/server'
import { paymentMiddleware } from '@x402/express'
import type { RequestHandler } from 'express'
import { eq } from 'drizzle-orm'
import { db } from '../db/db.js'
import { uploads } from '../db/schema.js'
import { logger } from '../utils/logger.js'
import { getPricingConfig } from '../utils/pricing.js'
import { priceUSDC } from '../utils/agent-payment.js'

const isMainnet = process.env.X402_NETWORK === 'mainnet'
const network = isMainnet ? 'eip155:8453' : 'eip155:84532'
const payTo = process.env.BASE_USDC_WALLET
let agentPaymentMiddleware: RequestHandler = (_req, res) => { res.status(503).json({message:'Agent payments are not configured'}) }
if (payTo && /^0x[0-9a-fA-F]{40}$/.test(payTo)) {
  const facilitator = new HTTPFacilitatorClient(isMainnet ? cdpFacilitator : {url:'https://x402.org/facilitator'})
  const server = new x402ResourceServer(facilitator).register(network, new ExactEvmScheme())
  server.onAfterSettle(async ({result, transportContext}) => {
    if (!result.success || !/^0x[0-9a-fA-F]{64}$/.test(result.transaction)) return
    const context = transportContext as {responseBody?: Buffer}
    const receipt = JSON.parse(Buffer.from(context.responseBody || []).toString())
    if (!Number.isSafeInteger(receipt.uploadId)) throw new Error('Missing upload settlement binding')
    await db.update(uploads).set({transactionHash:result.transaction, deletionStatus:'active'}).where(eq(uploads.id, receipt.uploadId))
  })
  agentPaymentMiddleware = paymentMiddleware({'POST /agent': {accepts: {
    scheme:'exact', network, payTo, maxTimeoutSeconds:120,
    price: async context => {
      const size = Number(context.adapter.getQueryParam?.('size'))
      const days = Number(context.adapter.getQueryParam?.('duration'))
      const config = await getPricingConfig()
      return `$${priceUSDC(size, days, config.ratePerBytePerDay, config.minDurationDays).usdc}`
    },
  }}}, server)
  logger.info('x402 payment middleware configured', {network})
} else logger.error('Agent upload disabled: valid BASE_USDC_WALLET required')
export { agentPaymentMiddleware }
