
import { Router } from 'express';
import { getMachines, createMachine, updateMachine, deleteMachine, getMachineLoad } from '../controllers/machines.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/load', authenticateToken, getMachineLoad);
router.get('/', authenticateToken, getMachines);
router.post('/', authenticateToken, authorizeRole(['Administrador']), createMachine);
router.put('/:id', authenticateToken, authorizeRole(['Administrador']), updateMachine);
router.delete('/:id', authenticateToken, authorizeRole(['Administrador']), deleteMachine);

export default router;
