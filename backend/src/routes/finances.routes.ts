import { Router } from 'express';
import { getFinancialSummary, getOrderCosts, getMachineCosts, getPersonalCosts } from '../controllers/finances.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

// Only Administrador can access Finanzas
router.get('/summary', authenticateToken, authorizeRole(['Administrador']), getFinancialSummary);
router.get('/orders', authenticateToken, authorizeRole(['Administrador']), getOrderCosts);
router.get('/machines', authenticateToken, authorizeRole(['Administrador']), getMachineCosts);
router.get('/personal', authenticateToken, authorizeRole(['Administrador']), getPersonalCosts);

export default router;
