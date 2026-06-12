import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

const DB_NAME = 'mt_erp_db';
const DB_VERSION = 1;

class DatabaseService {
    private sqlite: SQLiteConnection;
    private db: SQLiteDBConnection | null = null;
    private isReady: boolean = false;
    private isNative: boolean;

    constructor() {
        this.sqlite = new SQLiteConnection(CapacitorSQLite);
        this.isNative = Capacitor.isNativePlatform();
    }

    /**
     * Inicializa la conexión a la base de datos y crea las tablas base.
     * Si está en el entorno web, se omite para evitar errores.
     */
    async initDB(): Promise<void> {
        if (!this.isNative) {
            console.warn('[DatabaseService] Entorno web detectado. SQLite local deshabilitado para evitar conflictos. Usando APIs REST estándar.');
            this.isReady = true;
            return;
        }

        try {
            console.log('[DatabaseService] Inicializando SQLite en entorno nativo...');
            
            // Check connections consistency
            const hasConnection = await this.sqlite.checkConnectionsConsistency();
            const isConn = (await this.sqlite.isConnection(DB_NAME, false)).result;

            if (hasConnection.result && isConn) {
                this.db = await this.sqlite.retrieveConnection(DB_NAME, false);
            } else {
                this.db = await this.sqlite.createConnection(DB_NAME, false, 'no-encryption', DB_VERSION, false);
            }

            if (this.db) {
                await this.db.open();
                console.log('[DatabaseService] Conexión abierta exitosamente.');
                await this.createTables();
                await this.seedDatabaseIfEmpty();
                this.isReady = true;
            } else {
                throw new Error('No se pudo crear o recuperar la conexión a la base de datos.');
            }
        } catch (error) {
            console.error('[DatabaseService] Error al inicializar la base de datos:', error);
            throw error;
        }
    }

    /**
     * Crea las tablas base de la aplicación con soporte offline-first.
     */
    private async createTables(): Promise<void> {
        if (!this.isNative || !this.db) return;

        try {
            const schema = `
                -- Tabla de Materia Prima (Copia local)
                CREATE TABLE IF NOT EXISTS MateriaPrima (
                    id_local TEXT PRIMARY KEY NOT NULL,
                    id_server INTEGER,
                    sku_mp TEXT UNIQUE NOT NULL,
                    nombre_mp TEXT NOT NULL,
                    categoria_mp TEXT,
                    unidad_medida_stock TEXT,
                    stock_actual REAL DEFAULT 0,
                    stock_reservado REAL DEFAULT 0,
                    devoluciones REAL DEFAULT 0,
                    punto_reorden REAL DEFAULT 0,
                    espesor REAL,
                    ancho REAL,
                    largo REAL,
                    densidad REAL,
                    peso_unitario REAL,
                    costo_unitario REAL,
                    -- Metadatos Offline
                    sync_status TEXT NOT NULL,
                    updated_at INTEGER NOT NULL,
                    deleted INTEGER DEFAULT 0,
                    version INTEGER DEFAULT 1
                );

                -- Tabla de Órdenes de Trabajo (Copia local)
                CREATE TABLE IF NOT EXISTS OrdenTrabajo (
                    id_local TEXT PRIMARY KEY NOT NULL,
                    id_server INTEGER,
                    numero_ot TEXT NOT NULL,
                    tipo_orden TEXT DEFAULT 'PRODUCCION_SERIE',
                    producto_id INTEGER,
                    cantidad_pedido INTEGER DEFAULT 0,
                    cantidad_fabricar INTEGER DEFAULT 0,
                    descripcion_proyecto TEXT,
                    cliente TEXT,
                    orden_compra_cliente TEXT,
                    prioridad TEXT DEFAULT 'ESTANDAR',
                    estado_ot TEXT DEFAULT 'Pendiente',
                    fecha_entrega_req TEXT,
                    -- Metadatos Offline
                    sync_status TEXT NOT NULL,          -- 'synced', 'pending_insert', 'pending_update', 'pending_delete'
                    updated_at INTEGER NOT NULL,        -- Timestamp Unix
                    deleted INTEGER DEFAULT 0,          -- Booleano (0/1) para Soft Delete
                    version INTEGER DEFAULT 1
                );

                -- Tabla de Movimientos de Inventario (Copia local)
                CREATE TABLE IF NOT EXISTS MovimientoInventarioMP (
                    id_local TEXT PRIMARY KEY NOT NULL,
                    id_server INTEGER,
                    materia_prima_id INTEGER NOT NULL,
                    cantidad REAL NOT NULL,
                    tipo_movimiento TEXT NOT NULL,
                    fecha_hora TEXT NOT NULL,
                    referencia_id TEXT,
                    orden_trabajo_id INTEGER,
                    -- Metadatos Offline
                    sync_status TEXT NOT NULL,
                    updated_at INTEGER NOT NULL,
                    deleted INTEGER DEFAULT 0,
                    version INTEGER DEFAULT 1
                );

                -- Cola de Sincronización (Para acciones atómicas y ordenadas)
                CREATE TABLE IF NOT EXISTS SyncQueue (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    table_name TEXT NOT NULL,
                    record_id_local TEXT NOT NULL,      -- ID local del registro afectado
                    action TEXT NOT NULL,               -- 'INSERT', 'UPDATE', 'DELETE'
                    payload TEXT NOT NULL,              -- JSON string con los datos a enviar
                    attempts INTEGER DEFAULT 0,
                    last_error TEXT,
                    created_at INTEGER NOT NULL         -- Timestamp Unix
                );

                -- Tabla de Productos (Copia local)
                CREATE TABLE IF NOT EXISTS Producto (
                    id_local TEXT PRIMARY KEY NOT NULL,
                    id_server INTEGER,
                    sku_producto TEXT UNIQUE NOT NULL,
                    nombre_producto TEXT NOT NULL,
                    descripcion TEXT,
                    cliente_id INTEGER,
                    cliente_nombre TEXT,
                    acabado TEXT,
                    imagen_url TEXT,
                    stock_actual REAL DEFAULT 0,
                    ancho_tira REAL,
                    medidas_pieza TEXT,
                    piezas_lamina_4x8 TEXT,
                    piezas_lamina_2x1 TEXT,
                    empaque_de TEXT,
                    ubicacion TEXT,
                    plano_pdf_url TEXT,
                    activo INTEGER DEFAULT 1,
                    precio_venta REAL DEFAULT 0,
                    -- Metadatos Offline
                    sync_status TEXT NOT NULL,
                    updated_at INTEGER NOT NULL,
                    deleted INTEGER DEFAULT 0,
                    version INTEGER DEFAULT 1
                );

                -- Tabla de Tareas de Producción (Copia local)
                CREATE TABLE IF NOT EXISTS TareaProduccion (
                    id_local TEXT PRIMARY KEY NOT NULL,
                    id_server INTEGER,
                    orden_trabajo_id INTEGER,
                    ruta_fabricacion_id INTEGER,
                    personal_id INTEGER,
                    maquina_id INTEGER,
                    estado_tarea TEXT DEFAULT 'Pendiente',
                    fecha_hora_inicio TEXT,
                    fecha_hora_fin TEXT,
                    cantidad_buena INTEGER DEFAULT 0,
                    cantidad_mala INTEGER DEFAULT 0,
                    tiempo_parada_min INTEGER DEFAULT 0,
                    duracion_real_min INTEGER,
                    -- Metadatos Offline
                    sync_status TEXT NOT NULL,
                    updated_at INTEGER NOT NULL,
                    deleted INTEGER DEFAULT 0,
                    version INTEGER DEFAULT 1
                );
            `;

            await this.db.execute(schema);
            console.log('[DatabaseService] Esquema offline-first inicializado correctamente.');
        } catch (error) {
            console.error('[DatabaseService] Error al crear el esquema:', error);
            throw error;
        }
    }

    /**
     * Revisa si la base de datos está vacía y, si es así, carga los datos iniciales desde seed.json
     */
    private async seedDatabaseIfEmpty(): Promise<void> {
        if (!this.db) return;

        try {
            const result = await this.db.query('SELECT COUNT(*) as count FROM MateriaPrima');
            const count = result.values?.[0]?.count || 0;

            if (count === 0) {
                console.log('[DatabaseService] Base de datos vacía detectada. Iniciando proceso de seeding offline...');
                
                // Carga el archivo seed.json desde los assets locales (public/seed.json)
                let response = await fetch('seed.json').catch(() => null);
                if (!response || !response.ok) {
                    response = await fetch('/seed.json').catch(() => null);
                }

                if (!response || !response.ok) {
                    console.warn('[DatabaseService] No se encontró seed.json o hubo un error HTTP.');
                    return;
                }
                
                const seedData = await response.json();

                await this.db.beginTransaction();

                if (seedData.materiaPrima && seedData.materiaPrima.length > 0) {
                    console.log(`[DatabaseService] Insertando ${seedData.materiaPrima.length} Materias Primas...`);
                    for (const mp of seedData.materiaPrima) {
                        const keys = Object.keys(mp).join(', ');
                        const placeholders = Object.keys(mp).map(() => '?').join(', ');
                        const values = Object.values(mp);
                        await this.db.run(`INSERT INTO MateriaPrima (${keys}) VALUES (${placeholders})`, values);
                    }
                }

                if (seedData.ordenTrabajo && seedData.ordenTrabajo.length > 0) {
                    console.log(`[DatabaseService] Insertando ${seedData.ordenTrabajo.length} Órdenes de Trabajo...`);
                    for (const ot of seedData.ordenTrabajo) {
                        const keys = Object.keys(ot).join(', ');
                        const placeholders = Object.keys(ot).map(() => '?').join(', ');
                        const values = Object.values(ot);
                        await this.db.run(`INSERT INTO OrdenTrabajo (${keys}) VALUES (${placeholders})`, values);
                    }
                }

                if (seedData.producto && seedData.producto.length > 0) {
                    console.log(`[DatabaseService] Insertando ${seedData.producto.length} Productos...`);
                    for (const p of seedData.producto) {
                        const keys = Object.keys(p).join(', ');
                        const placeholders = Object.keys(p).map(() => '?').join(', ');
                        const values = Object.values(p);
                        await this.db.run(`INSERT INTO Producto (${keys}) VALUES (${placeholders})`, values);
                    }
                }

                await this.db.commitTransaction();
                console.log('[DatabaseService] Seeding offline completado exitosamente.');
            } else {
                console.log(`[DatabaseService] Base de datos contiene ${count} registros. Se omite seeding offline.`);
            }
        } catch (error) {
            console.error('[DatabaseService] Error durante el seeding offline:', error);
            if (this.db) {
                await this.db.rollbackTransaction().catch(e => console.error('Error rolling back:', e));
            }
        }
    }

    /**
     * Método genérico para ejecutar sentencias SQL.
     * Maneja el entorno web devolviendo un arreglo vacío o un log.
     * 
     * @param statement Sentencia SQL
     * @param values Valores para los parámetros de la sentencia
     */
    async executeQuery(statement: string, values: any[] = []): Promise<any> {
        if (!this.isNative) {
            console.log(`[DatabaseService - MOCK] Ejecutando: ${statement} con valores:`, values);
            // Retorna algo que no rompa la aplicación
            return { changes: { changes: 0, lastId: 0, values: [] } };
        }

        if (!this.isReady || !this.db) {
            throw new Error('La base de datos no está inicializada o lista.');
        }

        try {
            if (statement.trim().toUpperCase().startsWith('SELECT')) {
                const res = await this.db.query(statement, values);
                return res;
            } else {
                const res = await this.db.run(statement, values);
                return res;
            }
        } catch (error) {
            console.error(`[DatabaseService] Error al ejecutar la consulta: ${statement}`, error);
            throw error;
        }
    }

    /**
     * Obtiene el estado del servicio
     */
    getIsReady(): boolean {
        return this.isReady;
    }
}

// Exportamos una instancia Singleton
export const databaseService = new DatabaseService();
