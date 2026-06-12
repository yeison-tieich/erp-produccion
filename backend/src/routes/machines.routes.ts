
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getMachines, createMachine, updateMachine, deleteMachine, getMachineLoad, uploadMachineImage } from '../controllers/machines.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

// Configure Multer for machine images
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../public/images');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, 'machine-' + uniqueSuffix + path.extname(file.originalname));
    },
});

const upload = multer({ storage });

router.get('/load', authenticateToken, getMachineLoad);
router.get('/', authenticateToken, getMachines);
router.post('/', authenticateToken, authorizeRole(['Administrador']), createMachine);
router.put('/:id', authenticateToken, authorizeRole(['Administrador']), updateMachine);
router.delete('/:id', authenticateToken, authorizeRole(['Administrador']), deleteMachine);
router.post('/:id/image', authenticateToken, upload.single('image'), uploadMachineImage);

export default router;
