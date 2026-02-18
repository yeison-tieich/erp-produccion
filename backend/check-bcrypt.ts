
import bcrypt from 'bcryptjs';

async function check() {
    const pass = '123456';
    // Hashes de la base de datos (truncados en la vista anterior, pero necesito el completo)
    // Como no los tengo completos, voy a generar uno nuevo y comparar
    const hash = await bcrypt.hash(pass, 10);
    console.log('Nuevo hash para 123456:', hash);
    const match = await bcrypt.compare(pass, hash);
    console.log('¿Coincide?:', match);
}
check();
