
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getMachines, createMachine, updateMachine, deleteMachine, getMachineLoad, uploadMachineImage } from '../controllers/machines.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

// Configure Multer for machine images
const storage = multer.memoryStorage();

const upload = multer({ storage });

router.get('/load', authenticateToken, getMachineLoad);
router.get('/', authenticateToken, getMachines);
router.post('/', authenticateToken, authorizeRole(['Administrador']), createMachine);
router.put('/:id', authenticateToken, authorizeRole(['Administrador']), updateMachine);
router.delete('/:id', authenticateToken, authorizeRole(['Administrador']), deleteMachine);
router.post('/:id/image', authenticateToken, upload.single('image'), uploadMachineImage);

export default router;
