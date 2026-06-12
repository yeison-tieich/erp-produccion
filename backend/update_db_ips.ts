import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const oldIp = '192.168.2.18';
  const newIp = '192.168.2.26';

  console.log(`Updating IP from ${oldIp} to ${newIp} in database...`);

  // Producto
  await prisma.$executeRawUnsafe(`UPDATE Producto SET imagen_url = REPLACE(imagen_url, '${oldIp}', '${newIp}') WHERE imagen_url LIKE '%${oldIp}%'`);
  await prisma.$executeRawUnsafe(`UPDATE Producto SET plano_pdf_url = REPLACE(plano_pdf_url, '${oldIp}', '${newIp}') WHERE plano_pdf_url LIKE '%${oldIp}%'`);
  console.log('Updated Producto');

  // OrdenTrabajo
  await prisma.$executeRawUnsafe(`UPDATE OrdenTrabajo SET imagen_url = REPLACE(imagen_url, '${oldIp}', '${newIp}') WHERE imagen_url LIKE '%${oldIp}%'`);
  await prisma.$executeRawUnsafe(`UPDATE OrdenTrabajo SET po_pdf_url = REPLACE(po_pdf_url, '${oldIp}', '${newIp}') WHERE po_pdf_url LIKE '%${oldIp}%'`);
  console.log('Updated OrdenTrabajo');

  // Maquina
  await prisma.$executeRawUnsafe(`UPDATE Maquina SET hoja_vida_url = REPLACE(hoja_vida_url, '${oldIp}', '${newIp}') WHERE hoja_vida_url LIKE '%${oldIp}%'`);
  await prisma.$executeRawUnsafe(`UPDATE Maquina SET foto_url = REPLACE(foto_url, '${oldIp}', '${newIp}') WHERE foto_url LIKE '%${oldIp}%'`);
  console.log('Updated Maquina');

  // MantenimientoPreventivo
  await prisma.$executeRawUnsafe(`UPDATE MantenimientoPreventivo SET foto_url = REPLACE(foto_url, '${oldIp}', '${newIp}') WHERE foto_url LIKE '%${oldIp}%'`);

  // FotoMantenimiento
  await prisma.$executeRawUnsafe(`UPDATE FotoMantenimiento SET url = REPLACE(url, '${oldIp}', '${newIp}') WHERE url LIKE '%${oldIp}%'`);

  // MovimientoInventarioMP
  await prisma.$executeRawUnsafe(`UPDATE MovimientoInventarioMP SET imagen_remision_url = REPLACE(imagen_remision_url, '${oldIp}', '${newIp}') WHERE imagen_remision_url LIKE '%${oldIp}%'`);

  // ProyectoEspecial
  await prisma.$executeRawUnsafe(`UPDATE ProyectoEspecial SET foto_referencia_url = REPLACE(foto_referencia_url, '${oldIp}', '${newIp}') WHERE foto_referencia_url LIKE '%${oldIp}%'`);
  await prisma.$executeRawUnsafe(`UPDATE ProyectoEspecial SET plano_pdf_url = REPLACE(plano_pdf_url, '${oldIp}', '${newIp}') WHERE plano_pdf_url LIKE '%${oldIp}%'`);

  // PiezaProyecto
  await prisma.$executeRawUnsafe(`UPDATE PiezaProyecto SET plano_url_1 = REPLACE(plano_url_1, '${oldIp}', '${newIp}') WHERE plano_url_1 LIKE '%${oldIp}%'`);
  await prisma.$executeRawUnsafe(`UPDATE PiezaProyecto SET plano_url_2 = REPLACE(plano_url_2, '${oldIp}', '${newIp}') WHERE plano_url_2 LIKE '%${oldIp}%'`);

  // ArchivoAdjunto
  await prisma.$executeRawUnsafe(`UPDATE ArchivoAdjunto SET url_archivo = REPLACE(url_archivo, '${oldIp}', '${newIp}') WHERE url_archivo LIKE '%${oldIp}%'`);

  console.log('Database IP replacement complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
