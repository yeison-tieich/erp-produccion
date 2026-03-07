const http = require('http');

function getProducts() {
  return new Promise((resolve, reject) => {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Miwicm9sIjoiU3VwZXJ2aXNvciIsIm5vbWJyZSI6IlN1cGVydmlzb3IgUGxhbnRhIiwiaWF0IjoxNzcxNTkzNTI0LCJleHAiOjE3NzE2Nzk5MjR9.o9vDizcSRvqQ-R8kUTKAjunJF2Cj9iROlAXPg-B7nME';
    const options = { hostname: 'localhost', port: 3000, path: '/api/products', method: 'GET', headers: { Authorization: `Bearer ${token}` } };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function createOrder(token, productId) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      tipo_orden: 'PRODUCCION_SERIE',
      producto_id: productId,
      cantidad_fabricar: 10,
      cliente: 'Test Cliente',
      fecha_entrega_req: new Date().toISOString().split('T')[0]
    });
    const options = {
      hostname: 'localhost', port: 3000, path: '/api/orders', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), 'Authorization': `Bearer ${token}` }
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.write(data); req.end();
  });
}

(async ()=>{
  try {
    const products = await getProducts();
    if (!Array.isArray(products) || products.length === 0) return console.error('No products');
    const prodId = products[0].id;
    console.log('Using product id', prodId);
    // token from previous login
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Miwicm9sIjoiU3VwZXJ2aXNvciIsIm5vbWJyZSI6IlN1cGVydmlzb3IgUGxhbnRhIiwiaWF0IjoxNzcxNTkzNTI0LCJleHAiOjE3NzE2Nzk5MjR9.o9vDizcSRvqQ-R8kUTKAjunJF2Cj9iROlAXPg-B7nME';
    const res = await createOrder(token, prodId);
    console.log('CREATE STATUS', res.status);
    console.log('CREATE BODY', res.body);
  } catch (e) { console.error(e); }
})();
