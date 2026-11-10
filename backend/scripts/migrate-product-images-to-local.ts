import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import prisma from '../src/prisma';

const productImageDirectory = path.resolve(__dirname, '../uploads/products');
const extensionByContentType: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif'
};

const run = async () => {
    await fs.promises.mkdir(productImageDirectory, { recursive: true });
    const products = await prisma.producto.findMany({
        where: { imagen_url: { contains: 'res.cloudinary.com' } },
        select: { id: true, imagen_url: true }
    });
    let migrated = 0;
    let failed = 0;

    for (const product of products) {
        let destination = '';
        try {
            const imageUrl = new URL(product.imagen_url || '');
            if (imageUrl.protocol !== 'https:' || imageUrl.hostname !== 'res.cloudinary.com') {
                throw new Error('La URL de imagen no es un recurso Cloudinary HTTPS permitido.');
            }

            const response = await axios.get<ArrayBuffer>(imageUrl.toString(), {
                responseType: 'arraybuffer',
                timeout: 30000,
                maxRedirects: 0,
                maxContentLength: 15 * 1024 * 1024
            });
            const contentType = String(response.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
            const extension = extensionByContentType[contentType];
            if (!extension) throw new Error(`Tipo de imagen no permitido: ${contentType || 'desconocido'}`);

            const filename = `product-${product.id}-${randomUUID()}${extension}`;
            destination = path.join(productImageDirectory, filename);
            await fs.promises.writeFile(destination, Buffer.from(response.data), { flag: 'wx' });
            await prisma.producto.update({
                where: { id: product.id },
                data: { imagen_url: `/uploads/products/${filename}` }
            });
            migrated += 1;
            console.log(`Producto ${product.id}: imagen migrada.`);
        } catch (error) {
            failed += 1;
            if (destination) {
                await fs.promises.unlink(destination).catch(cleanupError => {
                    if ((cleanupError as NodeJS.ErrnoException).code !== 'ENOENT') {
                        console.error(`Producto ${product.id}: no se pudo limpiar el archivo temporal.`, cleanupError);
                    }
                });
            }
            console.error(`Producto ${product.id}: falló la migración de imagen.`, error);
        }
    }

    console.log(`Migración finalizada: ${migrated} migradas, ${failed} fallidas, ${products.length} encontradas.`);
    if (failed > 0) process.exitCode = 1;
};

run()
    .catch(error => {
        console.error('No se pudo ejecutar la migración de imágenes de productos:', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
