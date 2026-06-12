import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
    getMaquinas,
    updateMaquina,
    getMachineDetail,
    createMaintenancePlan,
    scheduleMaintenance,
    completeMaintenance,
    getAllMaintenance,
    getReportesFallas,
    createReporteFalla,
    getOrdenesMantenimiento,
    createOrdenMantenimiento,
    closeOrdenMantenimiento,
    getMaintenanceKPIs,
    uploadMaintenanceImages
} from '../controllers/maintenance.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

// Configure Multer for maintenance photos
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
        cb(null, 'mtto-' + uniqueSuffix + path.extname(file.originalname));
    },
});

const upload = multer({ storage });

// Maestro de Maquinaria
router.get('/maquinas', authenticateToken, getMaquinas);
router.put('/maquinas/:id', authenticateToken, authorizeRole(['Administrador', 'Supervisor']), updateMaquina);
router.get('/machine/:id', authenticateToken, getMachineDetail);

// Preventivo
router.get('/all', authenticateToken, getAllMaintenance);
router.post('/plans', authenticateToken, authorizeRole(['Administrador', 'Supervisor']), createMaintenancePlan);
router.post('/schedule', authenticateToken, authorizeRole(['Administrador', 'Supervisor']), scheduleMaintenance);
router.put('/complete/:id', authenticateToken, authorizeRole(['Administrador', 'Supervisor']), completeMaintenance);
router.post('/complete/:id/photos', authenticateToken, authorizeRole(['Administrador', 'Supervisor']), upload.array('photos', 5), uploadMaintenanceImages);

// Correctivo (Fallas y OM)
router.get('/reportes-fallas', authenticateToken, getReportesFallas);
router.post('/reportes-fallas', authenticateToken, createReporteFalla);
router.get('/ordenes-mantenimiento', authenticateToken, getOrdenesMantenimiento);
router.post('/ordenes-mantenimiento', authenticateToken, createOrdenMantenimiento);
router.put('/ordenes-mantenimiento/:id/close', authenticateToken, authorizeRole(['Administrador', 'Supervisor']), closeOrdenMantenimiento);

// Indicadores
router.get('/kpis', authenticateToken, getMaintenanceKPIs);

export default router;
