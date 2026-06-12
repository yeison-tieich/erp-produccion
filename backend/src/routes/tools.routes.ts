
import { Router } from 'express';
import { getTools, getToolById, createTool, updateTool, deleteTool } from '../controllers/tools.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticateToken, getTools);
router.get('/:id', authenticateToken, getToolById);
router.post('/', authenticateToken, authorizeRole(['Administrador']), createTool);
router.put('/:id', authenticateToken, authorizeRole(['Administrador']), updateTool);
router.delete('/:id', authenticateToken, authorizeRole(['Administrador']), deleteTool);

export default router;
