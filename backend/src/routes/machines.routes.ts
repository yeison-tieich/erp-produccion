
import { Router } from 'express';
import multer from 'multer';
import { 
    getMachines, createMachine, updateMachine, deleteMachine, 
    getMachineLoad, uploadMachineImage, getMachineWorkHistory, 
    getMachineProductProcesses, addMachineProductProcess, 
    deleteMachineProductProcess, suggestMachineForProduct 
} from '../controllers/machines.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.get('/load', authenticateToken, getMachineLoad);
router.get('/suggest-product/:producto_id', authenticateToken, suggestMachineForProduct);
router.get('/', authenticateToken, getMachines);
router.post('/', authenticateToken, authorizeRole(['Administrador']), createMachine);
router.put('/:id', authenticateToken, authorizeRole(['Administrador']), updateMachine);
router.delete('/:id', authenticateToken, authorizeRole(['Administrador']), deleteMachine);
router.post('/:id/image', authenticateToken, upload.single('image'), uploadMachineImage);

// Historial y Procesos
router.get('/:id/work-history', authenticateToken, getMachineWorkHistory);
router.get('/:id/product-processes', authenticateToken, getMachineProductProcesses);
router.post('/:id/product-processes', authenticateToken, addMachineProductProcess);
router.delete('/product-processes/:processId', authenticateToken, deleteMachineProductProcess);

export default router;

