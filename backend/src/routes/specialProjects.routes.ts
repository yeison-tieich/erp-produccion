import { Router } from 'express';
import {
  getProyectos,
  getProyecto,
  createProyecto,
  updateProyecto,
  deleteProyecto,
} from '../controllers/specialProjects.controller';

const router = Router();

router.get('/special-projects', getProyectos);
router.get('/special-projects/:id', getProyecto);
router.post('/special-projects', createProyecto);
router.put('/special-projects/:id', updateProyecto);
router.delete('/special-projects/:id', deleteProyecto);

export default router;
