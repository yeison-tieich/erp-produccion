import prisma from './src/prisma';

(async ()=>{
  try {
    const p = await prisma.producto.findUnique({
      where: {id: 27},
      include: {listaMateriales:{include:{materiaPrima:true}}}
    });
    console.log('Product:', p?.nombre_producto);
    console.log('Piezas/Lámina:', p?.piezas_lamina_4x8);
    console.log('Materiales:', p?.listaMateriales.map(m=>({name:m.materiaPrima.nombre_mp, stock_actual: m.materiaPrima.stock_actual, stock_reservado: m.materiaPrima.stock_reservado})));
  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
})();
