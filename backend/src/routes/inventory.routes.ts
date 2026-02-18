
import { Router } from 'express';
import { getMaterials, createMaterial, addStock, updateMaterial } from '../controllers/inventory.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticateToken, getMaterials);
router.post('/', authenticateToken, authorizeRole(['Administrador']), createMaterial);
router.post('/:id/add-stock', authenticateToken, authorizeRole(['Administrador', 'Supervisor']), addStock);
router.put('/:id', authenticateToken, authorizeRole(['Administrador']), updateMaterial);

export default router;
