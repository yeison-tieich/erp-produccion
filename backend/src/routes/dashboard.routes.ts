
import { Router } from 'express';
import { getDashboardStats, getMonthlyReport } from '../controllers/dashboard.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.get('/stats', authenticateToken, getDashboardStats);
router.get('/monthly-report', authenticateToken, getMonthlyReport);

export default router;
