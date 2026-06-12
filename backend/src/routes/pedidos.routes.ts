
import { Router } from 'express';
import { 
    getPedidos, 
    createPedido, 
    updatePedido, 
    deletePedido, 
    importPedidosExcel,
    syncPedidosAutomation,
    generateOTFromPedido
} from '../controllers/pedidos.controller';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', getPedidos);
router.post('/', createPedido);
router.put('/:id', updatePedido);
router.delete('/:id', deletePedido);
router.post('/import', upload.single('file'), importPedidosExcel);
router.post('/sync', syncPedidosAutomation);
router.post('/:id/generate-ot', generateOTFromPedido);

export default router;
