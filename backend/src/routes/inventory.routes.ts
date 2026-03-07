
import { Router } from 'express';
import { getMaterials, createMaterial, addStock, updateMaterial, adjustStock, getMaterialMovements } from '../controllers/inventory.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticateToken, getMaterials);
router.post('/', authenticateToken, createMaterial);
router.post('/:id/add-stock', authenticateToken, authorizeRole(['Administrador', 'Supervisor']), addStock);
router.post('/:id/adjust-stock', authenticateToken, authorizeRole(['Administrador', 'Supervisor']), adjustStock);
router.get('/:id/movements', authenticateToken, getMaterialMovements);
router.put('/:id', authenticateToken, authorizeRole(['Administrador']), updateMaterial);

export default router;
