import sqlite3
import os

db_paths = ["gestor_pocho.db", os.path.join("backend", "gestor_pocho.db")]

print("=======================================================")
print("   HERRAMIENTA DE REINICIO DE HISTORIAL Y STOCK A CERO")
print("=======================================================\n")

found_any = False
for path in db_paths:
    if os.path.exists(path):
        found_any = True
        print(f"-> Procesando base de datos: {path}")
        conn = sqlite3.connect(path)
        cursor = conn.cursor()
        
        # 1. Asegurar columnas de migración si faltan
        cols = [r[1] for r in cursor.execute("PRAGMA table_info(cashmovement)").fetchall()]
        if cols:
            if "quantity" not in cols:
                cursor.execute("ALTER TABLE cashmovement ADD COLUMN quantity INTEGER")
                print("   [+] Añadida columna quantity a cashmovement")
            if "unit_cost" not in cols:
                cursor.execute("ALTER TABLE cashmovement ADD COLUMN unit_cost NUMERIC")
                print("   [+] Añadida columna unit_cost a cashmovement")

        # 2. Vaciar movimientos de caja e historial
        cursor.execute("DELETE FROM cashmovement")
        print("   [OK] Historial de caja vaciado.")
        
        # 3. Vaciar ventas y pagos
        cursor.execute("DELETE FROM saleitem")
        cursor.execute("DELETE FROM salepayment")
        cursor.execute("DELETE FROM sale")
        print("   [OK] Ventas, cobros y pagos vaciados.")
        
        # 4. Poner stock en 0 para todos los productos
        cursor.execute("UPDATE product SET stock = 0")
        affected = cursor.rowcount
        print(f"   [OK] Stock de {affected} productos establecido en 0.")
        
        conn.commit()
        conn.close()
        print(f"-> {path} quedó listo y sincronizado al 100%.\n")

if not found_any:
    print("No se encontraron archivos de base de datos gestor_pocho.db.")
else:
    print("=======================================================")
    print("   REINICIO COMPLETADO CON ÉXITO")
    print("   Tus productos, precios, fotos, clientes y categorías")
    print("   se mantuvieron intactos con stock en 0.")
    print("=======================================================")
