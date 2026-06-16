
import express from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import inventoryRoutes from './routes/inventory.routes';
import orderRoutes from './routes/orders.routes';
import taskRoutes from './routes/tasks.routes';
import productRoutes from './routes/products.routes';
import clientRoutes from './routes/clients.routes';
import personalRoutes from './routes/personal.routes';
import machineRoutes from './routes/machines.routes';
import dashboardRoutes from './routes/dashboard.routes';
import operationsRoutes from './routes/operations.routes';
import specialProjectsRoutes from './routes/specialProjects.routes';
import maintenanceRoutes from './routes/maintenance.routes';
import settingsRoutes from './routes/settings.routes';
import aiRoutes from './routes/ai.routes';
import toolsRoutes from './routes/tools.routes';
import loansRoutes from './routes/loans.routes';
import pedidosRoutes from './routes/pedidos.routes';
import syncRoutes from './routes/sync.routes';


dotenv.config();

if (!process.env.JWT_SECRET) {
  console.warn('⚠️ WARNING: JWT_SECRET is not defined. Using temporary fallback. PLEASE SET THIS IN RAILWAY VARIABLES.');
}
if (!process.env.DATABASE_URL) {
  console.error('❌ CRITICAL ERROR: DATABASE_URL is not defined. The app will fail to connect to the database.');
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const allowedOrigins = [
  'https://erp-produccion-dun.vercel.app',
  'http://localhost:5173',
  'http://192.168.2.26:5173',
  'capacitor://192.168.2.26:5173',
  'http://localhost'
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    // Para simplificar el despliegue en Vercel (URLs dinámicas), podemos permitir todo o chequear la lista
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production' || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// Static files for images
app.use('/images', express.static(path.join(__dirname, '../Inventario Producto_Images')));
// Serve public assets (logo, PDFs) from backend/public
app.use('/public', express.static(path.join(__dirname, '../public')));
// Static files for uploaded POs
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/products', productRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/personal', personalRoutes);
app.use('/api/machines', machineRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/operations', operationsRoutes);
app.use('/api/special-projects', specialProjectsRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/tools', toolsRoutes);
app.use('/api/loans', loansRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/sync', syncRoutes);


app.get('/', (req, res) => {
  res.send('Control MT API is running');
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  try {
    console.log('server.address():', server.address());
  } catch (err) {
    console.log('could not get server.address():', err);
  }
});

