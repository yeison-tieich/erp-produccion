import prisma from './src/prisma';

(async () => {
  try {
    // Find material for product 27
    const p27 = await prisma.producto.findUnique({
      where: { id: 27 },
      include: { listaMateriales: { include: { materiaPrima: true } } }
    });
    if (p27?.listaMateriales.length) {
      const mp = p27.listaMateriales[0].materiaPrima;
      console.log(`Material for product 27: ID=${mp.id}, name=${mp.nombre_mp}`);
      
      const updated = await prisma.materiaPrima.update({
        where: { id: mp.id },
        data: { stock_actual: 100 }
      });
      console.log(`Updated: stock = ${updated.stock_actual}`);
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
})();
