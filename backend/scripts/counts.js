const { PrismaClient } = require('@prisma/client');
(async () => {
  const p = new PrismaClient();
  try {
    console.log('Producto count:', await p.producto.count());
    console.log('Orden count:', await p.ordenTrabajo.count());
    console.log('Clientes count:', await p.cliente.count());
    console.log('Materias count:', await p.materiaPrima.count());
  } catch (e) {
    console.error(e);
  } finally {
    await p.$disconnect();
  }
})();