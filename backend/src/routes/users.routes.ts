import { Router } from 'express';
import { getCurrentUser, getUsers, createUser, updateUser, deleteUser, getRoles } from '../controllers/users.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/roles', authenticateToken, getRoles);
router.get('/me', authenticateToken, getCurrentUser);
router.get('/', authenticateToken, authorizeRole(['Administrador']), getUsers);
router.post('/', authenticateToken, authorizeRole(['Administrador']), createUser);
router.put('/:id', authenticateToken, authorizeRole(['Administrador']), updateUser);
router.delete('/:id', authenticateToken, authorizeRole(['Administrador']), deleteUser);

export default router;
