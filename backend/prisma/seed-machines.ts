
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const machines = [
    { codigo: 'M01', descripcion: 'TROQUELADORA NIAGARA 100 TON', adquirida_en: '1997', estado: 'ACTIVA', motor_hp: '7,5', horas_maquina_mes: '192', foto_url: 'LISTADO DE MAQUINAS_Images/M01.FOTO.134743.jpg' },
    { codigo: 'M07', descripcion: 'TROQUELADORA KINGS 25 TON', estado: 'ACTIVA', motor_hp: '1,5', horas_maquina_mes: '192', foto_url: 'LISTADO DE MAQUINAS_Images/M07TROQUELADORA KINGS 25 TON.FOTO.161118.jpg' },
    { codigo: 'M09', descripcion: 'TROQUELADORA BENCHMASTER 10 TON', estado: 'ACTIVA', motor_hp: '1' },
    { codigo: 'M10', descripcion: 'TROQUELADORA AMBROGIO 45 TON', estado: 'ACTIVA', motor_hp: '2' },
    { codigo: 'M11', descripcion: 'TROQUELADORA ARISA 60 TON', estado: 'ACTIVA', motor_hp: '3' },
    { codigo: 'M12', descripcion: 'TROQUELADORA PBM 10 TON', estado: 'ACTIVA', motor_hp: '1' },
    { codigo: 'M13', descripcion: 'SEGUETA MECÁNICA', estado: 'ACTIVA', motor_hp: '1' },
    { codigo: 'M15', descripcion: 'CIZALLA HIDRAULICA CNC', estado: 'ACTIVA', motor_hp: '5' },
    { codigo: 'M16', descripcion: 'RECTIFICADORA TANGENCIAL PLANA 10" x 15"', estado: 'ACTIVA', motor_hp: '1' },
    { codigo: 'M17', descripcion: 'RECTIFICADORA TANGENCIAL PLANA 400 x 1600 mm', estado: 'ACTIVA', motor_hp: '1-5-0,5' },
    { codigo: 'M19', descripcion: 'TORNO PARALELO 0,9 m', estado: 'ACTIVO', motor_hp: '1' },
    { codigo: 'M20', descripcion: 'TORNO CNC SL-30T', estado: 'ACTIVO' },
    { codigo: 'M21', descripcion: 'TORNO CNC SL-10T', estado: 'ACTIVO' },
    { codigo: 'M22', descripcion: 'CENTRO DE MECANIZADO LEDWELL MCV-1500i', estado: 'ACTIVO' },
    { codigo: 'M23', descripcion: 'CENTRO DE MECANIZADO LEDWELL V40', estado: 'VENDIDO' },
    { codigo: 'M24', descripcion: 'CENTRO DE MECANIZADO HAAS', estado: 'ACTIVO' },
    { codigo: 'M25', descripcion: 'ELECTROEROSIONADORA DE HILO CNC', estado: 'ACTIVO' },
    { codigo: 'M26', descripcion: 'TALADRO DE ARBOL REXON', estado: 'ACTIVO', motor_hp: '3' },
    { codigo: 'M35', descripcion: 'EQUIPO SOLDADURA ESAB 475', estado: 'ACTIVO' },
    { codigo: 'M39', descripcion: 'ESMERIL DE BANCO (NARANJA)', estado: 'ACTIVO', motor_hp: '1' },
    { codigo: 'M40', descripcion: 'ESMERIL DE BANCO (AMARILLO)', estado: 'ACTIVO', motor_hp: '1' },
    { codigo: 'M42', descripcion: 'PRENSA ELECTROHIDRAULICA 30 TON', estado: 'ACTIVA', motor_hp: '2' },
    { codigo: 'M44', descripcion: 'COMPRESOR MFG', estado: 'ACTIVO', motor_hp: '2' },
    { codigo: 'M45', descripcion: 'COMPRESOR TA-80', estado: 'ACTIVO', motor_hp: '2' },
    { codigo: 'M46', descripcion: 'COMPRESOR AMF', estado: 'ACTIVO', motor_hp: '2' },
    { codigo: 'M47', descripcion: 'COMPRESOR KAESER', estado: 'ACTIVO', motor_hp: '3' },
    { codigo: 'M50', descripcion: 'PISTOLA NEUMÁTICA', estado: 'ACTIVA' },
    { codigo: 'M02', descripcion: 'TROQUELADORA CLUANA GRIS 80T', adquirida_en: '1958', estado: 'ACTIVA', motor_hp: '8', horas_maquina_mes: '192', foto_url: 'LISTADO DE MAQUINAS_Images/M02.FOTO.134827.jpg' },
    { codigo: 'M04', descripcion: 'TROQUELADORA NIAGARA 45 TON', estado: 'ACTIVO', motor_hp: '5', horas_maquina_mes: '192', foto_url: 'LISTADO DE MAQUINAS_Images/M04.FOTO.135052.jpg' },
    { codigo: 'M05', descripcion: 'TROQUELADORA JOFE 20 TON', estado: 'ACTIVO', motor_hp: '3', horas_maquina_mes: '192', foto_url: 'LISTADO DE MAQUINAS_Images/M05.FOTO.113917.jpg' },
    { codigo: 'M48', descripcion: 'TORNO LEADWELL T- 6I', estado: 'ACTIVA' },
    { codigo: 'M49', descripcion: 'TROQUELADORA ARISA GRIS 60T', estado: 'ACTIVA', motor_hp: '3', horas_maquina_mes: '192', foto_url: 'LISTADO DE MAQUINAS_Images/M49.FOTO.152655.jpg' },
    { codigo: 'M03', descripcion: 'TROQUELADORA AMBOLD', estado: 'ACTIVA', motor_hp: '2' },
    { codigo: 'M33', descripcion: 'EQUIPO DE SOLDADURA DE PUNTO MANFER', estado: 'ACTIVA', horas_maquina_mes: '192', foto_url: 'LISTADO DE MAQUINAS_Images/M33.FOTO.155623.jpg' },
    { codigo: 'IST', descripcion: 'BODEGA - INSTALACIONES', estado: 'ACTIVA' },
    { codigo: 'M51', descripcion: 'ELECTROEROSIONADORA DE HILO CNC REBOFIL', adquirida_en: '2023', estado: 'ACTIVO' },
    { codigo: 'M52', descripcion: 'CENTRO DE MECANIZADO HARTFORT S10', adquirida_en: '2025', estado: 'ACTIVO' },
    { codigo: 'M53', descripcion: 'EQUIPO DE SOLDADURA DE PUNTO', estado: 'ACTIVO' },
    { codigo: 'M54', descripcion: 'EQUIPO DE SOLDADURA DE PUNTO', estado: 'ACTIVO' },
    { codigo: 'M55', descripcion: 'EQUIPO DE SOLDADURA MIG ESSAB', estado: 'ACTIVO' },
    { codigo: 'M56', descripcion: 'EQUIPO DE SOLDADURA MIG LINCOLN', estado: 'ACTIVO' },
    { codigo: 'M57', descripcion: 'EQUIPO DE SOLDADURA TIG MILLER', estado: 'ACTIVO' },
];

async function main() {
    console.log('Seeding machines...');
    for (const machine of machines) {
        await prisma.maquina.upsert({
            where: { codigo: machine.codigo },
            update: machine,
            create: machine,
        });
    }
    console.log('Machines seeded successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
