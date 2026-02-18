import { Router } from 'express';
import { getMyTasks, startTask, finishTask, assignTask, deleteTask, createTarea } from '../controllers/tasks.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticateToken, getMyTasks);
router.post('/', authenticateToken, createTarea);
router.put('/:id/assign', authenticateToken, assignTask);
router.post('/:id/start', authenticateToken, startTask);
router.post('/:id/finish', authenticateToken, finishTask);
router.delete('/:id', authenticateToken, deleteTask);

export default router;
