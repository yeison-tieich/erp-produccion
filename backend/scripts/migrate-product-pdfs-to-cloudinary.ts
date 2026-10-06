import fs from 'fs';
import path from 'path';
import prisma from '../src/prisma';
import { uploadToCloudinary } from '../src/utils/cloudinary';

const backendRoot = path.resolve(__dirname, '..');
const applyChanges = process.argv.includes('--apply');

const resolveLocalPdf = (url: string) => {
    if (url.startsWith('/images/')) {
        return path.join(backendRoot, 'public', url.slice('/images/'.length));
    }
    if (url.startsWith('/uploads/products/')) {
        return path.join(backendRoot, 'uploads', 'products', url.slice('/uploads/products/'.length));
    }
    return null;
};

async function main() {
    const products = await prisma.producto.findMany({
        where: { plano_pdf_url: { not: null } },
        select: { id: true, sku_producto: true, plano_pdf_url: true }
    });

    let migrated = 0;
    let missing = 0;

    for (const product of products) {
        const url = product.plano_pdf_url;
        if (!url || /^https?:\/\//i.test(url)) continue;

        const localPath = resolveLocalPdf(url);
        if (!localPath || !fs.existsSync(localPath)) {
            missing++;
            console.warn(`[MISSING] ${product.id} ${product.sku_producto}: ${url}`);
            continue;
        }

        if (!applyChanges) {
            console.log(`[DRY RUN] ${product.id} ${product.sku_producto}: ${url}`);
            continue;
        }

        const result = await uploadToCloudinary(fs.readFileSync(localPath), 'products');
        await prisma.producto.update({
            where: { id: product.id },
            data: { plano_pdf_url: result.secure_url }
        });
        migrated++;
        console.log(`[MIGRATED] ${product.id} ${product.sku_producto}: ${result.secure_url}`);
    }

    console.log(JSON.stringify({ applyChanges, migrated, missing }, null, 2));
}

main()
    .catch((error) => {
        console.error('Product PDF migration failed:', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });