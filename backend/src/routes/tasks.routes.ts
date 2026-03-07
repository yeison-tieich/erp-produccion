import { Router } from 'express';
import { getMyTasks, startTask, finishTask, assignTask, deleteTask, createTarea, updateTaskDetails, reorderTasks } from '../controllers/tasks.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticateToken, getMyTasks);
router.post('/', authenticateToken, createTarea);
router.put('/:id/assign', authenticateToken, assignTask);
router.put('/:id/update-details', authenticateToken, updateTaskDetails);
router.post('/:id/start', authenticateToken, startTask);
router.post('/:id/finish', authenticateToken, finishTask);
router.post('/order/reorder-tasks', authenticateToken, reorderTasks);
router.delete('/:id', authenticateToken, authorizeRole(['Supervisor', 'Administrador']), deleteTask);

export default router;
