
import { Router } from 'express';
import {
    getMaterials, createMaterial, addStock, updateMaterial,
    adjustStock, getMaterialMovements, uploadRemissionImage,
    reverseMovement, getInventoryStats
} from '../controllers/inventory.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware';
import multer from 'multer';

const storage = multer.memoryStorage();
const upload = multer({ storage });


const router = Router();

router.get('/stats', authenticateToken, getInventoryStats);
router.get('/', authenticateToken, getMaterials);
router.post('/', authenticateToken, createMaterial);
router.post('/:id/add-stock', authenticateToken, authorizeRole(['Administrador', 'Supervisor']), addStock);
router.post('/:id/adjust-stock', authenticateToken, authorizeRole(['Administrador', 'Supervisor']), adjustStock);
router.get('/:id/movements', authenticateToken, getMaterialMovements);
router.put('/:id', authenticateToken, authorizeRole(['Administrador']), updateMaterial);
router.post('/upload-remission', authenticateToken, authorizeRole(['Administrador', 'Supervisor']), upload.single('image'), uploadRemissionImage);
router.post('/movements/:id/reverse', authenticateToken, authorizeRole(['Administrador', 'Supervisor']), reverseMovement);


export default router;
