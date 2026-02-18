
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Client Mapping Dictionary (Based on User providing names for IDs)
const clientRegistry = {
    "1": "Siemens",
    "2": "Mobiliario Industrial", // Guess or placeholder
    "7": "Troquelados Especiales", // Guess or placeholder
    "14": "Resistencias Térmicas", // Guess or placeholder
    "26": "Ensambles Inox", // Guess or placeholder
};

async function main() {
    const password = await bcrypt.hash('123456', 10);

    console.log('Cleaning database...');
    await prisma.tareaProduccion.deleteMany({});
    await prisma.movimientoInventarioMP.deleteMany({});
    await prisma.listaMateriales.deleteMany({});
    await prisma.rutaFabricacion.deleteMany({});
    await prisma.ordenTrabajo.deleteMany({});
    await prisma.producto.deleteMany({});
    await prisma.materiaPrima.deleteMany({});
    await prisma.cliente.deleteMany({});

    // Users
    await prisma.usuario.upsert({
        where: { email: 'admin@controlmt.com' },
        update: { password_hash: password },
        create: {
            nombre: 'Administrador General',
            email: 'admin@controlmt.com',
            password_hash: password,
            rol: 'Administrador',
        },
    });

    const rawData = `CÓDIGO	CODIGO NUEVO	CLIENTE	Imagen del producto	PRODUCTO	MATERIAL	Ubicación en almacén	MAERIA PRIMA	CALIBRE	PIEZAS POR HORA	ANCHO DE TIRA mm	MEDIDAS X PIEZA mm	ACABADO	PIEZAS LAMINA DE 4 x 8 A	PIEZAS POR LAMINA DE 4 x 8	PIEZAS POR LAMINA DE 2 x 1	EMPAQUE DE 	STOCK	VALOR UNI FAB MP
INT-01		INTERGRIFOS		Arandela cóncava	A.INOX		A.INOX 20	20		110		SIN	861	902	666			
Soporte Motor		HERMANOS MARTINEZ		Soporte Motor	LAMINA CR CALIBRE 		LAMINA CR CALIBRE  16	16		83,5					1204			
Sello metalico (Cazuela)		ECOIMPACTO		Sello metalico (Cazuela)	LAMINA CR CALIBRE 		LAMINA CR CALIBRE  24	24		97,5				408				
171786		FUNDICOM		Reten Resorte C/M Montero	LAMINA CR CALIBRE 		LAMINA CR CALIBRE  24	24				SIN						
170082		FUNDICOM		Reten Resorte Montero EMB-B2000	LAMINA CR CALIBRE 		LAMINA CR CALIBRE  24	24				SIN						
171242		FUNDICOM		Terminal DER DEP M323/R	Bronce laton		Bronce laton 20	20		51		SIN						
171243		FUNDICOM		Terminal IZQ DEP M323/R	Bronce laton		Bronce laton 20	20		51		SIN						
170334		FUNDICOM		Arandela Tapa Deposito Liq Freno	Bronce laton	Almacen	Bronce laton 0,3	0,3		46		SIN						
8021		COMERCIAL LEOSAN		Tuerca Arandela A.I 304	INOX 304		INOX 304 14	14		100		SIN		288	200			
8020		COMERCIAL LEOSAN		Tuerca Arandela Fleje Acero recocido 1070	Fleje 1070		Fleje 1070 14	14		100	100 unds x mtro2			100				
8010		COMERCIAL LEOSAN		Tuerca Arandela Fleje Acero recocido 1070	Fleje 1070		Fleje 1070 20	20		60				170				
8020-1		COMERCIAL LEOSAN		Tuerca Arandela Lamina	LAMINA CR CALIBRE 		LAMINA CR CALIBRE  14	14		100				288				
8010-1		COMERCIAL LEOSAN		Tuerca Arandela Lamina	LAMINA CR CALIBRE 		LAMINA CR CALIBRE  18	18		60	55			800				
Soporte LC televisor No 1		RC		Soporte LC televisor No 1	LAMINA CR CALIBRE 		LAMINA CR CALIBRE  14	14			182 X 563							
Soporte LC televisor No 2		RC		Soporte LC televisor No 2	LAMINA CR CALIBRE 		LAMINA CR CALIBRE  14	14			78 X 300							
Soporte LC televisor No 3		RC		Soporte LC televisor No 3	LAMINA CR CALIBRE 		LAMINA CR CALIBRE  14	14			102 X 110							
Abrazadera exhosto		RC		Abrazadera exhosto	LAMINA HR CALIBRE 		LAMINA HR CALIBRE  12	12		160		zincado blanco		112				
Eslabon cadena IQF DER / IZQ (servicio troquelado)		CORTES Y DOBLECES		Eslabon cadena IQF DER / IZQ (servicio troquelado)	A.INOX		A.INOX 16	16		73								
Puente canoa		PRODUCTOS Y PTES		Puente canoa	AD		AD 12	12		81		SIN	840	900	600			
Lengüeta 8 mm		PRODUCTOS Y PTES		Lengüeta 8 mm	LAMINA HR CALIBRE 		LAMINA HR CALIBRE  5/16"	5/16"				SIN	540	540				
Cuerpo Balancin Largo (Platina Larga Troquelada)		PRODUCTOS Y PTES		Cuerpo Balancin Largo (Platina Larga Troquelada)	LAMINA HR CALIBRE 		LAMINA HR CALIBRE  8mm	8mm		135	32 x 125,5	SIN		528	440			
Cuerpo Balancin Corto (Platina Larga Troquelada)		PRODUCTOS Y PTES		Cuerpo Balancin Corto (Platina Larga Troquelada)	LAMINA HR CALIBRE 		LAMINA HR CALIBRE  8mm	8mm		108	36 x 100,5	SIN		660	550			
Automatico (Herradura) DER/IZQ		PRODUCTOS Y PTES		Automatico (Herradura) DER/IZQ	LAMINA CR CALIBRE 		LAMINA CR CALIBRE  14	14		96		SIN		624				
Arandela dentada Der/Izq		PRODUCTOS Y PTES		Arandela dentada Der/Izq	LAMINA CR CALIBRE 		LAMINA CR CALIBRE  14	14		55		SIN	1012	1056				
Arandela ovalada 85 x 52		PRODUCTOS Y PTES		Arandela ovalada 85 x 52	LAMINA HR CALIBRE 		LAMINA HR CALIBRE  3/16"	3/16"		92	85 x 52	SIN		572				
Cuerpo balancin largo		PRODUCTOS Y PTES		Cuerpo balancin largo	LAMINA HR CALIBRE 		LAMINA HR CALIBRE  8mm	8mm		137		SIN		525				
Cuerpo balancin corto		PRODUCTOS Y PTES		Cuerpo balancin corto	LAMINA HR CALIBRE 		LAMINA HR CALIBRE  8mm	8mm		111		SIN		682				
Arandela 46 x 3/16"		PRODUCTOS Y PTES		Arandela 46 x 3/16"	LAMINA HR CALIBRE 		LAMINA HR CALIBRE  3/16"	3/16"		51		SIN		1052				
100291		PRODUCTOS Y PTES		Conjunto Arandela Lengûeta 3/16"	LAMINA HR CALIBRE 		LAMINA HR CALIBRE  3/16"	3/16"		93 y 52		SIN		520 y 956				
100290		PRODUCTOS Y PTES		Conjunto Arandela Lengûeta 3/16" Nueva	LAMINA HR CALIBRE 		LAMINA HR CALIBRE  3/16"	3/16"		89 y 56		SIN		520 Y 1000				
100511		PRODUCTOS Y PTES		Conjunto Arandela Lengüeta de 6mm	LAMINA HR CALIBRE 		LAMINA HR CALIBRE  6-3/16"	6-3/16"		99 y 65		SIN		480 y 578				
100507		PRODUCTOS Y PTES		Soporte Rombo Irregular 115 X 69 (huecos de 16 y 11) 6mm	LAMINA HR CALIBRE 		LAMINA HR CALIBRE  6mm	6mm		127		SIN		304				
100293		PRODUCTOS Y PTES		Soporte Rombo Irregular 85 X 52 ( 3 huecos de 3/16")	LAMINA HR CALIBRE 		LAMINA HR CALIBRE  3/16"	3/16"		92		SIN		572				
100287		PRODUCTOS Y PTES		Soporte Rombo 3/16"	LAMINA HR CALIBRE 		LAMINA HR CALIBRE  3/16"	3/16"		94		SIN		525				
Conjunto Arandela Lengûeta 6mm		PRODUCTOS Y PTES		Conjunto Arandela Lengûeta 6mm	LAMINA HR CALIBRE 		LAMINA HR CALIBRE  6	6		100 y 64		SIN		546 y 648				
100509-A		PRODUCTOS Y PTES		Arandela  Ø 50 x 15 x 3/16	LAMINA HR CALIBRE 		LAMINA HR CALIBRE  3/16"	3/16"		56				861				
100292-A		PRODUCTOS Y PTES		Arandela  Ø 50.8 x 15 x 3/16	LAMINA HR CALIBRE 		LAMINA HR CALIBRE  3/16"	3/16"		57				800				
100507-A		PRODUCTOS Y PTES		Arandela  Ø 60 x 15 x 3/16	LAMINA HR CALIBRE 		LAMINA HR CALIBRE  3/16"	3/16"		66				630				
100287-A		PRODUCTOS Y PTES		Arandela  Ø 43,5 x 15 x 3/16	LAMINA HR CALIBRE 		LAMINA HR CALIBRE  3/16"	3/16"		49				1150				
100295-A		PRODUCTOS Y PTES		Arandela  Ø 33 x 12 x 3/16	LAMINA HR CALIBRE 		LAMINA HR CALIBRE  3/16"	3/16"		39				1856				
100289-A		PRODUCTOS Y PTES		Arandela  Ø 40 x 15 x 3/16	LAMINA HR CALIBRE 		LAMINA HR CALIBRE  3/16"	3/16"		46				1350				
100293-A		PRODUCTOS Y PTES		Arandela  Ø 37 x 15 x 3/16	LAMINA HR CALIBRE 		LAMINA HR CALIBRE  3/16"	3/16"		43				1537				
100292		PRODUCTOS Y PTES		Arandela lengüeta	LAMINA HR CALIBRE 		LAMINA HR CALIBRE  3/16"	3/16"		107				440				
100289		PRODUCTOS Y PTES	Inventario Producto_Images/100289.Imagen del producto.184548.jpg	Soporte rombo	LAMINA HR CALIBRE 		LAMINA HR CALIBRE  3/16"	3/16"		97								
100293-B		PRODUCTOS Y PTES		Arandela 3/16" Ø 46mm	LAMINA HR CALIBRE 		LAMINA HR CALIBRE  3/16"	3/16"		143				748				
Tuerca hexagonal de 54mm entre caras		JAIRO PEREZ	Inventario Producto_Images/Tuerca hexagonal de 54mm entre caras.Imagen del producto.154603.jpg	Tuerca hexagonal de 54mm entre caras	LAMINA HR CALIBRE 		LAMINA HR CALIBRE  6	6		73	HEX 54	SIN		250				
Tuerca hexagonal de 51mm entre caras		JAIRO PEREZ	Inventario Producto_Images/Tuerca hexagonal de 54mm entre caras.Imagen del producto.154603.jpg	Tuerca hexagonal de 51mm entre caras	LAMINA HR CALIBRE 		LAMINA HR CALIBRE  6	6		71		SIN		663				
226226-226233		ANDINA TRIM		Base Inf Limpiavidrios DL Der/Izq Largos	LAMINA CR CALIBRE 		LAMINA CR CALIBRE  20	20				ZINCADO BLANCO		90				
226235-226234		ANDINA TRIM		Base Inf Limpiavidrios TR Der/Izq Cortos	LAMINA CR CALIBRE 		LAMINA CR CALIBRE  20	20				ZINCADO BLANCO		128				
HR01		LUIS CARLOS VELASQUEZ		Hebilla	LAMINA HR CALIBRE 		LAMINA HR CALIBRE  4mm	4mm		112				294				
HR02		LUIS CARLOS VELASQUEZ	Inventario Producto_Images/HR02.Imagen del producto.122049.jpg	Horquilla roscada M8	LAMINA HR CALIBRE 		LAMINA HR CALIBRE  3mm	3mm		110		SIN		1144				
1686		GAMMA		Anillo sujecion NBR-01	A.INOX		A.INOX 3/16"	3/16"		106		SIN		253				
Cazuelas		ECOIMPACTO		Cazuelas	LAMINA CR CALIBRE 		LAMINA CR CALIBRE  0,5	0,5		98								
MJ-OC-P1		7	Inventario Producto_Images/MJ-OC-P1.Imagen del producto.175055.jpg	Lateral pieza No 1 abrazadera 1 hueco	LAMINA HR CALIBRE 		LAMINA HR CALIBRE  3mm	3mm		105		PINTURA NEGRA		120	81			
MJ-OC-P2		7	Inventario Producto_Images/MJ-OC-P2.Imagen del producto.175129.jpg	Lateral pieza No 2 abrazadera 2 huecos	LAMINA HR CALIBRE 		LAMINA HR CALIBRE  3mm	3mm		105		PINTURA NEGRA		120	81			
DVA00032		Siemens	Inventario Producto_Images/DVA00032.Imagen del producto.132947.jpg	Brida Inclinada	AD		AD 12	12		188	186 x 186	SIN	78	78	50			
100110454		Siemens	Inventario Producto_Images/DVA00168.Imagen del producto.133831.jpg	Oreja de Sujeción Prensas ("U")	LAMINA CR CALIBRE 	Almacen	LAMINA CR CALIBRE  12	12		40	40 x 199,5	SIN	360	366	250	50		
100110455		Siemens	Inventario Producto_Images/100110455.Imagen del producto.172905.jpg	Oreja de Levantamiento tanque	LAMINA CR CALIBRE 	Almacen	LAMINA CR CALIBRE  12	12	Disponible	105	106 x 96	SIN	275	286	180	50		
100110459		Siemens	Inventario Producto_Images/100110459.Imagen del producto.165156.jpg	Oreja de Sujeción No. 1en ("L")	LAMINA CR CALIBRE 		LAMINA CR CALIBRE  12	12		90	90 x 35	SIN	884	924	616	50		
DVA00174		Siemens		Oreja de Sujeción No. 2 en ("L")	LAMINA CR CALIBRE 		LAMINA CR CALIBRE  12	12		106	105 x 35	SIN	748	782	504	50		
100110461	100437177	Siemens	Inventario Producto_Images/DVA00175.Imagen del producto.184250.jpg	Oreja de Sujeción No 3 ("L")	LAMINA CR CALIBRE 	Almacen	LAMINA CR CALIBRE  12	12	Disponible	82	82 x 35	SIN	960	960	672	50		
DVA00177		Siemens		Pieza Esquinera	LAMINA CR CALIBRE 		LAMINA CR CALIBRE  14	14		105	?	SIN	1012	1012	684			
DVA00277		Siemens		Soporte Placa	LAMINA CR CALIBRE 		LAMINA CR CALIBRE  14	14		85	85 x 114,5	SIN	294	294	184			
100110465		Siemens	Inventario Producto_Images/DVA00278.Imagen del producto.194834.jpg	Soporte Placa 5SCL	LAMINA CR CALIBRE 	Almacen	LAMINA CR CALIBRE  14	14	Disponible	190	190 X 15	SIN		960	667	200		
100110470		Siemens	Inventario Producto_Images/100110470.Imagen del producto.141909.jpg	Soporte poste 6 mm ***	LAMINA HR CALIBRE 		LAMINA HR CALIBRE  6 mm	6 mm		114	114 x 167	SIN	142	144	102			
DVA00280		Siemens		Soporte para colgar en poste sin H 3 mm ***	LAMINA HR CALIBRE 		LAMINA HR CALIBRE  3 mm	3 mm		76	76 x 253	SIN	135	139	91			
100278199		Siemens	Inventario Producto_Images/100278199.Imagen del producto.112946.jpg	Soporte poste Tipo A	LAMINA HR CALIBRE 	Planta	LAMINA HR CALIBRE  3mm	3mm	Disponible	76	76 x 273,5	SIN		128		10		
DVA00281		Siemens		Soporte para colgar en poste con H 3 mm ***	LAMINA HR CALIBRE 		LAMINA HR CALIBRE  3 mm	3 mm		76	76 x 270	SIN	132	140	85			
DVA00574		Siemens		Soporte poste 8 mm  ***	LAMINA HR CALIBRE 		LAMINA HR CALIBRE  8mm	8mm		114	114 x 227	SIN	100	100	64			
DVA00585		Siemens		Soporte poste 6 mm ***	LAMINA HR CALIBRE 		LAMINA HR CALIBRE  6mm	6mm		114	114x267	SIN	84	88	59			
DVA00676		Siemens		Soporte Poste 3 mm ***	LAMINA HR CALIBRE 		LAMINA HR CALIBRE  3mm	3mm		76	76x276,4	SIN	124	136	91			
100110472		Siemens		Soporte poste 6mm tecsur	LAMINA HR CALIBRE 		LAMINA HR CALIBRE  6mm	6mm		75	75 x 251	SIN		148				
DVA00384		Siemens		Soporte Placa	LAMINA CR CALIBRE 		LAMINA CR CALIBRE  14	14		85	118,5 X 85	SIN		282	184			
DVA00457		Siemens		Arandela Plana 20,6 x 7,1 x 2 mm Inoxidable	INOX		INOX 14	14		86		SIN		4892				
100090403		Siemens	Inventario Producto_Images/100090403.Imagen del producto.151301.jpg	Portaplaca L1060104-01	AD	Almacen	AD 12	12		102	97 x 132	SIN	242	242	180	50		
100090404		Siemens	Inventario Producto_Images/100090404.Imagen del producto.151418.jpg	Portaplaca L1060104-02	AD		AD 12	12		102	97 x 132	SIN	242	242	180	50		
100090405		Siemens	Inventario Producto_Images/100090405.Imagen del producto.185445.jpg	Portaplaca L1060104-03	AD		AD 12	12		102	97 x 132	SIN	242	242	180	50		
100091091		Siemens	Inventario Producto_Images/100091091.Imagen del producto.205238.jpg	Portaplaca L1060104-04	AD		AD 12	12		102	97 x 132	SIN	242	242	180	50		
15000003996		Siemens	Inventario Producto_Images/15000003996.Imagen del producto.171524.jpg	Abrazadera	LAMINA CR CALIBRE 		LAMINA CR CALIBRE  14	14		127,7	127,7 x 40	Granallado-Galvanizado-Pintura Gris RAL	630	682	406		0	
100359925		Siemens	Inventario Producto_Images/100359925.Imagen del producto.194110.jpg	Disco compensador	LAMINA CR CALIBRE 	Almacen	LAMINA CR CALIBRE  18	18		70	70 x 70	SIN		528		100		
15000004000		Siemens		Tapa Nivel de Aceite	LAMINA CR CALIBRE 		LAMINA CR CALIBRE  16	16		144	144 x 60	Pintura Gris RAL	232	232	161			
100089267		Siemens		Lamina de Aseguramiento AF 12	LAMINA CR CALIBRE 		LAMINA CR CALIBRE  20	20		76	76 x 36	SIN	950	950	700			
100089268		Siemens	Inventario Producto_Images/100089268.Imagen del producto.204104.jpg	Lamina de Aseguramiento AF 13	LAMINA CR CALIBRE 	Almacen	LAMINA CR CALIBRE  20	20	Disponible	86	86 x 36	SIN	900	900	621			
100089522		Siemens		Lamina de Aseguramiento AF03	LAMINA CR CALIBRE 		LAMINA CR CALIBRE  18	18		80	80 x 44	SIN		810				
15000004195		Siemens		Lamina de Aseguramiento AF19	LAMINA CR CALIBRE 		LAMINA CR CALIBRE  20	20		142	142 x 42	SIN		448				
15000005905		Siemens		Anillo de Fijación	LAMINA HR CALIBRE 		LAMINA HR CALIBRE  4 mm	4 mm		120	99	Pintura Gris RAL	200	200	136			
100108832		Siemens		Anillo de Fijación Pasatapa	LAMINA CR CALIBRE 		LAMINA CR CALIBRE  14	14			Ø190			72				
15000014280		Siemens		Abrazadera Pasatapas	AD		AD 12	12		170		Galvanizado		182				
100377971		Siemens		Abrazadera Pasatapas NMX	AD		AD 12	12		174				168				
15000026256		Siemens		Cuerpo Bisagra Y 1020-C222	LAMINA CR CALIBRE 		LAMINA CR CALIBRE  14	14		64	64 x 30			1520				
MB-001		MODUBEL		Herraje Asa	Ace_Inox		Ace_Inox 16	16		51	SERVICIO	SIN	1222	1222	819			
CC2189		Ensambles Industriales	Inventario Producto_Images/CC2189.Imagen del producto.142612.jpg	Herraje ensamble tapa espalda	LAMINA CR CALIBRE 		LAMINA CR CALIBRE  20	20		64	55 X 45	Cementado y Zincado Blanco	950	950	720	100		
MP2516/3305/2711		Ensambles Industriales	Inventario Producto_Images/MP2516-3305-2711.Imagen del producto.154342.jpg	Herraje espalda AVAII tapa	LAMINA CR CALIBRE 		LAMINA CR CALIBRE  14	14		47	42 x 20			2704				
MP8738		Ensambles Industriales	Inventario Producto_Images/MP8738.Imagen del producto.182938.jpg	Herraje agarre pad galaxy + plastico	LAMINA CR CALIBRE 		LAMINA CR CALIBRE  16	16		35				1734				
CC2011/CC2012		Ensambles Industriales		Ala ACA 45 (Izq.. / Der.) *** ojo dar 7mm más	LAMINA CR CALIBRE 		LAMINA CR CALIBRE  14	14		107	303 X 107	Pintura Negra Semimate	83	83	57			
MP2385-MP2386		Ensambles Industriales		Ala ACA 45 (Izq.. / Der.) *** ojo dar 7mm más	LAMINA CR CALIBRE 		LAMINA CR CALIBRE  14	14		107	303 X 107		83	83	57			
CC2439/CC2440		Ensambles Industriales		Ala ACA 10 (Izq.. / Der.) *** ojo dar 7mm más	LAMINA CR CALIBRE 		LAMINA CR CALIBRE  14	14		110	303 x 110	Pintura Negra Semimate		76	54			
MP2592/MP2593		Ensambles Industriales		Ala ACA 51 (Izq.. / Der.) *** ojo dar 7mm más	LAMINA CR CALIBRE 		LAMINA CR CALIBRE  14	14		112	178 X 112		130	136				
MP5310/MP5311		Ensambles Industriales		Ala AC 35 S (Izq.. / Der.) *** ojo dar 7mm más	LAMINA CR CALIBRE 		LAMINA CR CALIBRE  14	14		107	107X260			99				
MP5312/MP5313		Ensambles Industriales		Ala AC 35 R (Izq.. / Der.) *** ojo dar 7mm más	LAMINA CR CALIBRE 		LAMINA CR CALIBRE  14	14		112	112X260			90				
MP3542/MP3543		Ensambles Industriales		Ala AC 38 S (Izq.. / Der.) *** ojo dar 7mm más	LAMINA CR CALIBRE 		LAMINA CR CALIBRE  14	14		98	98X260			108				
CC2014		Ensambles Industriales		Arandela cuadrada con tuerca de 1/4"	LAMINA CR CALIBRE 		LAMINA CR CALIBRE  18	18		40	40 X 26	Zincado Negro	2400	2400	1650			
CC2054		Ensambles Industriales		Soporte sobre para brazo MH	LAMINA CR CALIBRE 		LAMINA CR CALIBRE  20	20		68		Pintura Negra Semimate	1700	1700	1162			
CC2190		Ensambles Industriales		Arandela Circular con Rosca	LAMINA CR CALIBRE 		LAMINA CR CALIBRE  16	16		37,2		Zincado Negro		2258	1737			
MP1832		Ensambles Industriales		Optima Herraje Embutido Espalda	LAMINA CR CALIBRE 		LAMINA CR CALIBRE  16	16		79,5	205	SIN		148	103			
MP1834		Ensambles Industriales		Optima C Doblada Spte Espalda	LAMINA HR CALIBRE 		LAMINA HR CALIBRE  3mm	3mm		45	45 x 593	SIN		102	84			
MP2097		Ensambles Industriales	Inventario Producto_Images/MP2097.Imagen del producto.121900.jpg	Calza E Cal 14	LAMINA CR CALIBRE 		LAMINA CR CALIBRE  14	14		65	25,4 x 60	Zincado Negreo		1476		1000		
MP6287-MP6288		Ensambles Industriales	Inventario Producto_Images/MP6287-MP6288.Imagen del producto.145602.jpg	Alma Rotula Delta (Bujes 2 de Øe 7/16 x13 y 1 por7.6mm)	LAMINA CR CALIBRE 		LAMINA CR CALIBRE  14	14		112		SIN		410				
MP9406		Ensambles Industriales	Inventario Producto_Images/MP9406.Imagen del producto.135558.jpg	Leva 4,5 - 21 TROQUELADA	LAMINA HR CALIBRE 	Planta	LAMINA HR CALIBRE  4,5	4,5		136		SIN		1435		1000		
391		3	Inventario Producto_Images/391.Imagen del producto.204452.jpg	Arandela Tapa	1045	Almacen	1045 1,34	1,34	Disponible			SIN	87			500		
392		3	Inventario Producto_Images/392.Imagen del producto.133706.jpg	Anillo Mecanizado	1045		1045 Ø 1 7/8"	Ø 1 7/8"	Disponible			SIN	87			500		
1607		3	Inventario Producto_Images/1607.Imagen del producto.201935.jpg	Arandela Base	LAMINA CR CALIBRE 		LAMINA CR CALIBRE  18	18		54		Zincado Irizado 8 micras		968		1000		
1608		3	Inventario Producto_Images/1608.Imagen del producto.153515.jpg	Arandela	AD		AD 3mm	3mm	Disponible	45				1647		1000		
1610		3	Inventario Producto_Images/1610.Imagen del producto.111019.jpg	Arandela	LAMINA CR CALIBRE 		LAMINA CR CALIBRE  18	18		72	34,9	Zincado Amarillo Trivalente		1800		1000		
308		3	Inventario Producto_Images/308.Imagen del producto.201751.jpg	Arandela	AD		AD 3 mm	3 mm		40	32,2	Zincado Irizado 8 micras	1980	2336	1350	1000		
309		3	Inventario Producto_Images/309.Imagen del producto.194036.jpg	Tapa	AD		AD 3mm	3mm		40	34,5	Zincado Irizado 8 micras		2108		500		
310		3	Inventario Producto_Images/310.Imagen del producto.110911.jpg	Tapa Templada	LAMINA CR CALIBRE 		LAMINA CR CALIBRE  16	16		72	34,5	Templado y pavonado		2112		1000		
318		3	Inventario Producto_Images/318.Imagen del producto.134229.jpg	Tapa	AD		AD 12	12		70	33	Zincado Irizado 8 micras	2200	2415		1000		
342		3	Inventario Producto_Images/342.Imagen del producto.134333.jpg	Tapa	LAMINA CR CALIBRE 		LAMINA CR CALIBRE  16	16		60	26,9	Zincado Amarillo Trivalente		3360		1000		
345		3	Inventario Producto_Images/345.Imagen del producto.134428.jpg	Tapa	LAMINA CR CALIBRE 		LAMINA CR CALIBRE  16	16		62	30	Zincado Amarillo Trivalente	2886	2886		1000		
383		3	Inventario Producto_Images/383.Imagen del producto.134131.jpg	Tapa	LAMINA CR CALIBRE 		LAMINA CR CALIBRE  14	14		66	29,9	Zincado Irizado 8 micras	2500	2500	1700	1000		
385		3	Inventario Producto_Images/385.Imagen del producto.201443.jpg	Tapa	AD		AD 12	12		48	41,5	Zincado Irizado 8 micras	1325	1325		500		
2635		3	Inventario Producto_Images/2635.Imagen del producto.133926.jpg	Conjunto Arandela SMI	AD - Fleje 1070		AD - Fleje 1070 3mm - 0,8	3mm - 0,8		74  - 89	35 - 29,2	Zincado Irizado 8 micras - Zincado Negro		1920		500		
BSP006N		3	Inventario Producto_Images/BSP006N.Imagen del producto.110744.jpg	Tapa Templada	LAMINA CR CALIBRE 		LAMINA CR CALIBRE  16	16		67	31,2	Zincado Blanco 8 Micras (Cementado)	1740	2625	1480	1000		
BLP067N(389)		3	Inventario Producto_Images/BLP067N(389).Imagen del producto.201656.jpg	Tapa	LAMINA CR CALIBRE 		LAMINA CR CALIBRE  16	16		62	31,24	Zincado Amarillo Trivalente	2448	3080	1680	1000		
BSP013N		3	Inventario Producto_Images/BSP013N.Imagen del producto.110659.jpg	Tapa Superior	AD		AD 3 mm	3 mm		37,2	31,6	Zincado Blanco 8 Micras	2240	2600	1552	1000		
OC-3.5-S 		7	Inventario Producto_Images/ABT350.Imagen del producto.120802.jpg	Abrazadera grande 3 1/2 sencilla	LAMINA HR CALIBRE 	Planta	LAMINA HR CALIBRE  3mm	3mm				PINTURA NEGRA				20		
OC-3.5-DC		7	Inventario Producto_Images/ABT350-D.Imagen del producto.123302.jpg	Abrazadera grande 3 1/2 doble coraza	LAMINA HR CALIBRE 	Planta	LAMINA HR CALIBRE  3mm	3mm				PINTURA NEGRA				20		
OC-4.5		7	Inventario Producto_Images/ABT450.Imagen del producto.123603.jpg	Abrazadera grande 4 1/2	LAMINA HR CALIBRE 	Planta	LAMINA HR CALIBRE  3mm	3mm				PINTURA NEGRA				20		
CA		7	Inventario Producto_Images/ABT-C.Imagen del producto.143852.jpg	Cuña para abrazadera	LAMINA HR CALIBRE 	Almacen	LAMINA HR CALIBRE  3mm	3mm	1150	137		SIN	714	714		60		
MP8500		2	Inventario Producto_Images/MP8500.Imagen del producto.153022.jpg	TOR TOPE MESA ACTIVE	TORNILLO 1/4 X 1"1/2 GRADO 8	Almacen	TORNILLO 1/4 X 1"1/2 GRADO 8 											
MP8931		2	Inventario Producto_Images/MP8931.Imagen del producto.170058.jpg	Tope fleje mesa active v2	Fleje 1070	Almacen	Fleje 1070 1.2	1.2	Disponible			Templado						
100109553		Siemens	Inventario Producto_Images/100109553.Imagen del producto.210511.jpg	LLAVE P TORNILLO PENTAGONAL ZINCADA	12L14	Almacen	12L14 		Disponible			zincado blanco						
MP4570		Ensambles Industriales	Inventario Producto_Images/MP4570.Imagen del producto.114958.jpg	Buje prolon 17mm		Almacen	 					SIN						
FE7866		Ensambles Industriales	Inventario Producto_Images/FE7866.Imagen del producto.160220.jpg	MECANIZAR EJE T5 115mm V.3	CUADRADO 17.90	PLANTA	CUADRADO 17.90 			1190	115	SIN		32				
MJ-3.5-S		Troquelados Especiales	Inventario Producto_Images/ABT350.Imagen del producto.120802.jpg	Abrazadera 3 1/2 sencilla 	LAMINA HR CALIBRE 	Planta	LAMINA HR CALIBRE  3mm	3mm				PINTURA NEGRA						
MJ-3.5-DC		Troquelados Especiales	Inventario Producto_Images/ABT350-D.Imagen del producto.123302.jpg	Abrazadera 3 1/2 doble coraza	LAMINA HR CALIBRE 	Planta	LAMINA HR CALIBRE  3mm	3mm				PINTURA NEGRA						
MJ-4.5		Troquelados Especiales	Inventario Producto_Images/ABT450.Imagen del producto.123603.jpg	Abrazadera 4 1/2	LAMINA HR CALIBRE 	Planta	LAMINA HR CALIBRE  3mm	3mm				PINTURA NEGRA						
FE8141		Ensambles Industriales	Inventario Producto_Images/FE8141.Imagen del producto.160257.jpg	MECANIZAR EJE T3 80mm V.3	CUADRADO 17.90	PLANTA	CUADRADO 17.90 			1190	80	SIN		58				
OC-P1		Troquelados Especiales	Inventario Producto_Images/MJ-P1.Imagen del producto.175614.jpg	Pieza central abrazadera 3 1/2	LAMINA HR CALIBRE 		LAMINA HR CALIBRE  3mm	3mm				PINTURA NEGRA				15		
OC-P2		Troquelados Especiales	Inventario Producto_Images/MJ-P2.Imagen del producto.175444.jpg	Pieza central abrazadera DOBLE CORAZA	LAMINA HR CALIBRE 		LAMINA HR CALIBRE  3mm	3mm				PINTURA NEGRA				15		
OC-P3		Troquelados Especiales	Inventario Producto_Images/MJ-P3.Imagen del producto.175517.jpg	Pieza central abrazadera 4 1/2"	LAMINA HR CALIBRE 		LAMINA HR CALIBRE  3mm	3mm				PINTURA NEGRA				15		
FE8025		Ensambles Industriales	Inventario Producto_Images/FE8025.Imagen del producto.160135.jpg	MECANIZAR EJE T5 100mm V.3	CUADRADO 17.90	PLANTA	CUADRADO 17.90 			1190	100	SIN		59				
MP8064		Ensambles Industriales	Inventario Producto_Images/MP8064.Imagen del producto.195054.jpg	TOPE 180 V2	POLIETILENO DE ALTA D	Almacen	POLIETILENO DE ALTA D 		5	25.4	22.5 x 15.3 x 180	SIN						
MJ-P1		Troquelados Especiales	Inventario Producto_Images/MJ-P1.Imagen del producto.202320.jpg	Pieza central abrazadera 3 1/2 PEQ	LAMINA HR CALIBRE 		LAMINA HR CALIBRE  3mm	3mm		86.3		PINTURA NEGRA		120		20	0
MJ-P2		Troquelados Especiales	Inventario Producto_Images/MJ-P2.Imagen del producto.202347.jpg	Pieza central abrazadera DOBLE CORAZA PEQ	LAMINA HR CALIBRE 		LAMINA HR CALIBRE  3mm	3mm				PINTURA NEGRA		120		20		
MJ-P3		Troquelados Especiales	Inventario Producto_Images/MJ-P3.Imagen del producto.175517.jpg	Pieza central abrazadera 4 1/2" PEQ	LAMINA HR CALIBRE 		LAMINA HR CALIBRE  3mm	3mm				PINTURA NEGRA		120		20		
101199350		Siemens	Inventario Producto_Images/100278199.Imagen del producto.112946.jpg	Soporte poste Tipo A 10308	LAMINA HR CALIBRE 	Planta	LAMINA HR CALIBRE  3mm	3mm	Disponible	76	76 x 183	SIN REBABA		72		20		
MP10194		Ensambles Industriales	Inventario Producto_Images/MP10194.Imagen del producto.152006.jpg	Soporte Asiento Flat95 Izq Troquelado V. 2	ANGULO	PLANTA	ANGULO 3/16	3/16		200	200	SIN		30		10		
MP10193		Ensambles Industriales	Inventario Producto_Images/MP10194.Imagen del producto.152006.jpg	Soporte Asiento Flat95 Der Troquelado V. 2	ANGULO	PLANTA	ANGULO 3/16	3/16		200	200	SIN		30		10		
EC1		Troquelados Especiales	Inventario Producto_Images/EC1.Imagen del producto.142436.jpg	ESLABON DE CADENA 1	HR	Almacen	HR 3/16	3/16	500	144		SIN	544					
SOPORTE		Ensambles Industriales	Inventario Producto_Images/MP10194.Imagen del producto.152006.jpg	Soporte Asiento Flat95 Izq Troquelado 	ANGULO	PLANTA	ANGULO 3/16	3/16		200	200	SIN		30		10		
EC2		Troquelados Especiales	Inventario Producto_Images/EC2.Imagen del producto.191506.jpg	ESLABON DE CADENA 2	HR	Almacen	HR 3/16	3/16	500	149.5		SIN						
MP4564 - MP4586		Ensambles Industriales	Inventario Producto_Images/MP4564 - MP4586.Imagen del producto.161839.jpg	HERRAJE BISAGRA ADA C DER - IZQ		Almacen	ANGULO 1 3/16			200	200	SIN	30			20		
SCORTESY		Ensambles Inox	Inventario Producto_Images/SCORTESY.Imagen del producto.165318.jpg	EMSAMBLE BISAGRAS INOX	P CLIENTE		P CLIENTE		60			SIN						
FJ1331B		Resistencias Térmicas	Inventario Producto_Images/FJ1331B.Imagen del producto.165417.jpg	BASE RESISTENCIA	LAMINA CR CALIBRE 18	Almacen	LAMINA CR CALIBRE 18	18	93			SIN		520				
FE3902-3608		Ensambles Industriales	Inventario Producto_Images/FE3902-3608.Imagen del producto.165053.jpg	TROQUELAR SOPORTE ESPAL STACKER DER-IZQ	P CLIENTE	Planta	P CLIENTE		900			SIN				20		
FJ131T		Resistencias Térmicas	Inventario Producto_Images/FJ131T.Imagen del producto.192458.jpg	Tapa resistencia	LAMINA CR CALIBRE 24		LAMINA CR	24		72							200	 `;

    const lines = rawData.trim().split('\n');

    // Process unique Materials
    const materialMap = new Map();
    // Process unique Clients
    const clientMap = new Map();
    const productList = [];

    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split('\t');
        if (cols.length < 5) continue;

        const sku_prod = cols[0].trim() || `PROD-${i}`;
        const cliente_raw = cols[2].trim();
        const imagen_path = cols[3].trim() || null;
        const nombre_prod = cols[4].trim();
        const categoria_mp = cols[5].trim() || 'General';
        const ubicacion = cols[6].trim() || null;
        const material_raw = cols[7].trim(); // MAERIA PRIMA
        const calibre = cols[8].trim();
        const piezas_hora = parseInt(cols[9]) || null;

        // New technical fields
        const medidas_pieza = cols[11]?.trim() || null;
        const acabado = cols[12]?.trim() || null;
        const piezas_lamina_4x8 = cols[14]?.trim() || null;
        const piezas_lamina_2x1 = cols[15]?.trim() || null;
        const empaque_de = cols[16]?.trim() || null;
        const stock_prod = parseInt(cols[17]?.replace(/[^\d]/g, '')) || 0;

        // Map client IDs to names if they are pure digits
        let cliente_nombre = cliente_raw;
        if (clientRegistry[cliente_raw]) {
            cliente_nombre = clientRegistry[cliente_raw];
        }

        if (cliente_nombre && !clientMap.has(cliente_nombre)) {
            clientMap.set(cliente_nombre, true);
        }

        if (material_raw) {
            const mp_sku = `MP-${material_raw.replace(/\s+/g, '-')}`.toUpperCase();
            if (!materialMap.has(mp_sku)) {
                materialMap.set(mp_sku, {
                    sku_mp: mp_sku,
                    nombre_mp: material_raw,
                    categoria_mp: categoria_mp,
                    unidad_medida_stock: 'Unidades',
                    stock_actual: 1000,
                    punto_reorden: 100
                });
            }

            productList.push({
                sku_producto: sku_prod,
                nombre_producto: nombre_prod,
                cliente_nombre: cliente_nombre,
                imagen_url: imagen_path ? `http://localhost:3000/images/${imagen_path.split('/').pop()}` : null,
                acabado: acabado,
                stock_actual: stock_prod,
                ubicacion: ubicacion,
                medidas_pieza,
                piezas_lamina_4x8,
                piezas_lamina_2x1,
                empaque_de,
                material_sku: mp_sku,
                piezas_hora: piezas_hora
            });
        }
    }

    console.log(`Creating ${clientMap.size} clients...`);
    for (const name of clientMap.keys()) {
        await prisma.cliente.upsert({
            where: { nombre: name },
            update: {},
            create: { nombre: name }
        });
    }

    console.log(`Creating ${materialMap.size} materials...`);
    for (const mp of materialMap.values()) {
        await prisma.materiaPrima.create({ data: mp });
    }

    console.log(`Creating ${productList.length} products...`);
    for (const p of productList) {
        const material = await prisma.materiaPrima.findUnique({ where: { sku_mp: p.material_sku } });
        const client = p.cliente_nombre ? await prisma.cliente.findUnique({ where: { nombre: p.cliente_nombre } }) : null;

        await prisma.producto.create({
            data: {
                sku_producto: p.sku_producto,
                nombre_producto: p.nombre_producto,
                cliente_id: client?.id,
                imagen_url: p.imagen_url,
                acabado: p.acabado,
                stock_actual: p.stock_actual,
                ubicacion: p.ubicacion,
                medidas_pieza: p.medidas_pieza,
                piezas_lamina_4x8: p.piezas_lamina_4x8,
                piezas_lamina_2x1: p.piezas_lamina_2x1,
                empaque_de: p.empaque_de,
                rutas: {
                    create: [
                        {
                            no_operacion: 10,
                            nombre_operacion: 'Troquelado',
                            centro_trabajo: 'Planta Principal',
                            piezas_por_hora_estimado: p.piezas_hora
                        }
                    ]
                },
                listaMateriales: {
                    create: [
                        {
                            materia_prima_id: material.id,
                            cantidad_requerida: 1
                        }
                    ]
                }
            }
        });
    }

    console.log('Seed completed successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
