import express from 'express'
import multer from 'multer'
import * as agentController from '../controllers/agent.controller.js'
import * as uploadsController from '../controllers/upload.controller.js'
import { uploadLimiter } from '../middlewares/rate-limit.middleware.js'
import { agentPaymentMiddleware } from '../middlewares/x402.middleware.js'

import { validateAgentFile } from '../utils/agent-payment.js'

const upload = multer({limits:{fileSize:10*1024*1024,files:20}})

export const uploadsRouter = express.Router()



uploadsRouter.post(
  '/deposit',
  upload.fields([{ name: 'file' }]),
  uploadsController.deposit,
)
uploadsRouter.post(
  '/deposit-usdfc',
  upload.fields([{ name: 'file' }]),
  uploadsController.depositUsdFC,
)
uploadsRouter.post(
  '/file',
  uploadLimiter,
  upload.single('file'),
  uploadsController.uploadFile,
)
uploadsRouter.post(
  '/files',
  uploadLimiter,
  upload.array('file'),
  uploadsController.uploadFiles,
)
uploadsRouter.get('/history', uploadsController.getUploadHistory)
uploadsRouter.post('/confirm', uploadsController.confirmUpload)
uploadsRouter.post('/fil/verify-payment', uploadsController.verifyUsdFcPayment)

uploadsRouter.post(
  '/agent',
  upload.single('file'),
  (req, res, next) => { try { validateAgentFile(req.file, req.query); next() } catch (error) { res.status(400).json({message:error instanceof Error?error.message:'Invalid artifact'}) } },
  agentPaymentMiddleware,
  agentController.uploadAgentFile,
)

uploadsRouter.get('/agent/receipt/:id', agentController.getAgentReceipt)
