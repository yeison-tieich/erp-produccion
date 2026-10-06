
import { Router } from 'express';
import {
    getMaterials, createMaterial, addStock, updateMaterial,
    adjustStock, getMaterialMovements, uploadRemissionImage,
    reverseMovement, getInventoryStats,
    // New endpoints
    getAllMovements, getDashboardStock, getInventoryConsistency,
    getCompletedOTsAudit, reconcileOrder, cleanStrandedReservations,
    getActiveReservations
} from '../controllers/inventory.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware';
import multer from 'multer';

const storage = multer.memoryStorage();
const upload = multer({ storage });

const router = Router();

// ─── Static / aggregate routes FIRST (before parameterized) ──
router.get('/stats', authenticateToken, getInventoryStats);
router.get('/all-movements', authenticateToken, getAllMovements);
router.get('/dashboard-stock', authenticateToken, getDashboardStock);
router.get('/consistency', authenticateToken, getInventoryConsistency);
router.get('/audit-completed-ots', authenticateToken, authorizeRole(['Administrador', 'Supervisor']), getCompletedOTsAudit);
router.get('/reservations', authenticateToken, getActiveReservations);
router.post('/upload-remission', authenticateToken, authorizeRole(['Administrador', 'Supervisor']), upload.single('image'), uploadRemissionImage);
router.post('/clean-stranded-reservations', authenticateToken, authorizeRole(['Administrador', 'Supervisor']), cleanStrandedReservations);

// ─── Collection routes ────────────────────────────────────────
router.get('/', authenticateToken, getMaterials);
router.post('/', authenticateToken, createMaterial);

// ─── Parameterized routes ─────────────────────────────────────
router.post('/:id/add-stock', authenticateToken, authorizeRole(['Administrador', 'Supervisor']), addStock);
router.post('/:id/adjust-stock', authenticateToken, authorizeRole(['Administrador', 'Supervisor']), adjustStock);
router.get('/:id/movements', authenticateToken, getMaterialMovements);
router.put('/:id', authenticateToken, authorizeRole(['Administrador']), updateMaterial);
router.post('/movements/:id/reverse', authenticateToken, authorizeRole(['Administrador', 'Supervisor']), reverseMovement);
router.post('/reconcile-ot/:id', authenticateToken, authorizeRole(['Administrador']), reconcileOrder);

export default router;
