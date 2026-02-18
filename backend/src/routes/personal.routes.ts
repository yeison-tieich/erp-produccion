
import { Router } from 'express';
import { getPersonal, createPersonal, updatePersonal, deletePersonal, getPersonalDetails, addTimeLog, addDotacion } from '../controllers/personal.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticateToken, getPersonal);
router.get('/:id', authenticateToken, getPersonalDetails);
router.post('/', authenticateToken, authorizeRole(['Administrador']), createPersonal);
router.put('/:id', authenticateToken, authorizeRole(['Administrador']), updatePersonal);
router.delete('/:id', authenticateToken, authorizeRole(['Administrador']), deletePersonal);
router.post('/:id/time-log', authenticateToken, authorizeRole(['Administrador', 'Supervisor']), addTimeLog);
router.post('/:id/dotacion', authenticateToken, authorizeRole(['Administrador', 'Supervisor']), addDotacion);

export default router;
