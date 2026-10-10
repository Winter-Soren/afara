import { Request, Response } from 'express'
import { getSolPrice } from '../services/price/sol-price.service.js'
import { PaymentChain, QuoteOutput } from '../types.js'
import { logger } from '../utils/logger.js'
import { getQuoteForFileUpload } from '../utils/pricing.js'

/**
 * Function to get Quote For File Upload
 * @param req Request
 * @param res Response
 * @returns quoteObject || null and success
 */
export const GetQuoteForFileUpload = async (req: Request, res: Response) => {
  try {
    const duration = parseInt(req.query.duration as string, 10)
    const size = parseInt(req.query.size as string, 10)
    const chain = (req.query.chain as string) || 'sol'

    const QuoteObject: QuoteOutput = await getQuoteForFileUpload({
      durationInUnits: duration,
      sizeInBytes: size,
      chain: chain as PaymentChain,
    })
    return res.status(200).json({
      quote: QuoteObject,
      ...(chain === 'base' ? {network: process.env.X402_NETWORK === 'mainnet' ? 'eip155:8453' : 'eip155:84532', asset: process.env.X402_NETWORK === 'mainnet' ? '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' : '0x036CbD53842c5426634e7929541eC2318f3dCF7e', payTo: process.env.BASE_USDC_WALLET} : {}),
      success: true,
    })
  } catch (err) {
    logger.error('Error getting file upload quote', {
      error: err instanceof Error ? err.message : String(err),
    })
    return res.status(400).json({
      quoteObject: null,
      success: false,
    })
  }
}

export const getSolUsdPrice = async (_req: Request, res: Response) => {
  try {
    const price = await getSolPrice()
    return res.status(200).json({
      price,
      timestamp: Date.now,
    })
  } catch (error) {
    logger.error('Error getting SOL/USD price', {
      error: error instanceof Error ? error.message : String(error),
    })
    return res.status(500).json({ message: 'Failed to get SOL/USD price' })
  }
}
