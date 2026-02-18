-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Producto" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sku_producto" TEXT NOT NULL,
    "nombre_producto" TEXT NOT NULL,
    "descripcion" TEXT,
    "cliente" TEXT,
    "acabado" TEXT,
    "imagen_url" TEXT,
    "stock_actual" INTEGER NOT NULL DEFAULT 0,
    "ubicacion" TEXT
);
INSERT INTO "new_Producto" ("descripcion", "id", "nombre_producto", "sku_producto") SELECT "descripcion", "id", "nombre_producto", "sku_producto" FROM "Producto";
DROP TABLE "Producto";
ALTER TABLE "new_Producto" RENAME TO "Producto";
CREATE UNIQUE INDEX "Producto_sku_producto_key" ON "Producto"("sku_producto");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
