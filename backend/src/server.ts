
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

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

// Static files for images
app.use('/images', express.static(path.join(__dirname, '../Inventario Producto_Images')));
// Serve public assets (logo, PDFs) from backend/public
app.use('/public', express.static(path.join(__dirname, '../public')));

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
