import express from 'express'
import * as serverController from '../controllers/server.controller.js'

export const serverRouter = express.Router()

serverRouter.get('/live', (_req, res) => res.json({status: 'healthy', service: 'toju', network: process.env.X402_NETWORK}))

serverRouter.get('/', serverController.getServerHealth)
