import { Router } from 'express'
import { getOperations } from '../controllers/operations.controller'

const router = Router()

router.get('/', getOperations)

export default router
