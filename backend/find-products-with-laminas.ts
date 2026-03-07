import prisma from './src/prisma';

(async ()=>{
  try {
    const products = await prisma.producto.findMany({
      where: { piezas_lamina_4x8: { not: null } },
      take: 5,
      include: {listaMateriales:{include:{materiaPrima:true}}}
    });
    console.log('Products with piezas_lamina_4x8 defined:');
    products.forEach(p => {
      console.log(`\nID: ${p.id}, Name: ${p.nombre_producto}`);
      console.log(`  Piezas/Lámina: ${p.piezas_lamina_4x8}`);
      console.log(`  Materials: ${p.listaMateriales.map(m=>m.materiaPrima.nombre_mp).join(', ')}`);
    });
  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
})();
