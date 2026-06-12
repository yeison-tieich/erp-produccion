
import { Router } from 'express';
import { getPersonal, createPersonal, updatePersonal, deletePersonal, getPersonalDetails, addTimeLog, updateTimeLog, addDotacion, toggleTimeLogPayment, bulkAddOvertime } from '../controllers/personal.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticateToken, getPersonal);
router.get('/:id', authenticateToken, getPersonalDetails);
router.post('/bulk-overtime', authenticateToken, authorizeRole(['Administrador', 'Supervisor']), bulkAddOvertime);
router.post('/', authenticateToken, authorizeRole(['Administrador']), createPersonal);
router.put('/:id', authenticateToken, authorizeRole(['Administrador']), updatePersonal);
router.delete('/:id', authenticateToken, authorizeRole(['Administrador']), deletePersonal);
router.post('/:id/time-log', authenticateToken, authorizeRole(['Administrador', 'Supervisor']), addTimeLog);
router.put('/time-log/:logId', authenticateToken, authorizeRole(['Administrador', 'Supervisor']), updateTimeLog);
router.post('/:id/dotacion', authenticateToken, authorizeRole(['Administrador', 'Supervisor']), addDotacion);
router.patch('/time-log/:logId/toggle-payment', authenticateToken, authorizeRole(['Administrador']), toggleTimeLogPayment);

export default router;
