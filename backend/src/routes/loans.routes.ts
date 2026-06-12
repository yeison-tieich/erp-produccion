
import { Router } from 'express';
import { getLoans, lendTool, returnTool } from '../controllers/loans.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticateToken, getLoans);
router.post('/lend', authenticateToken, lendTool);
router.post('/return/:id', authenticateToken, returnTool);

export default router;
