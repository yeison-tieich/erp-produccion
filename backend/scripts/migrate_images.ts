import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { uploadToCloudinary } from '../src/utils/cloudinary';

const prisma = new PrismaClient();
const imagesDir = path.join(__dirname, '../Inventario Producto_Images');

async function main() {
  const products = await prisma.producto.findMany({
    where: {
      imagen_url: {
        contains: '192.168.2.26:3000',
      },
    },
  });

  console.log(`Starting migration for ${products.length} products...`);
  
  let successCount = 0;
  let failCount = 0;

  for (const product of products) {
    if (!product.imagen_url) continue;

    try {
      const decodedUrl = decodeURIComponent(product.imagen_url);
      const urlParts = decodedUrl.split('/');
      const filename = urlParts[urlParts.length - 1];

      const filePath = path.join(imagesDir, filename);

      if (fs.existsSync(filePath)) {
        console.log(`Uploading ${filename} for Product ${product.sku_producto}...`);
        
        const fileBuffer = fs.readFileSync(filePath);
        const result = await uploadToCloudinary(fileBuffer, 'products');

        await prisma.producto.update({
          where: { id: product.id },
          data: { imagen_url: result.secure_url },
        });

        console.log(`Successfully migrated Product ${product.sku_producto} -> ${result.secure_url}`);
        successCount++;
      } else {
        console.warn(`File not found locally: ${filePath}`);
        failCount++;
      }
    } catch (error) {
      console.error(`Error processing product ${product.sku_producto}:`, error);
      failCount++;
    }
  }

  // Also do OTs
  const ots = await prisma.ordenTrabajo.findMany({
    where: {
      imagen_url: {
        contains: '192.168.2.26:3000',
      },
    },
  });

  console.log(`Starting migration for ${ots.length} OTs...`);
  for (const ot of ots) {
    if (!ot.imagen_url) continue;

    try {
      const decodedUrl = decodeURIComponent(ot.imagen_url);
      const urlParts = decodedUrl.split('/');
      const filename = urlParts[urlParts.length - 1];

      const filePath = path.join(imagesDir, filename);

      if (fs.existsSync(filePath)) {
        console.log(`Uploading ${filename} for OT ${ot.numero_ot}...`);
        
        const fileBuffer = fs.readFileSync(filePath);
        const result = await uploadToCloudinary(fileBuffer, 'products'); // using products folder

        await prisma.ordenTrabajo.update({
          where: { id: ot.id },
          data: { imagen_url: result.secure_url },
        });

        console.log(`Successfully migrated OT ${ot.numero_ot} -> ${result.secure_url}`);
        successCount++;
      } else {
        console.warn(`File not found locally: ${filePath}`);
        failCount++;
      }
    } catch (error) {
      console.error(`Error processing OT ${ot.numero_ot}:`, error);
      failCount++;
    }
  }

  console.log(`Migration completed! Success: ${successCount}, Failed: ${failCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
