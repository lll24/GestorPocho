# 📦 Gestor Pocho

> **Sistema integral de gestión de ventas, inventario, costos y facturación bimonetaria (USD / VES) diseñado para emprendimientos y comercios.**

---

## 🎯 ¿De qué trata el proyecto?

**Gestor Pocho** nace para solucionar la realidad operativa de los pequeños y medianos negocios en mercados con dinámicas multimoneda (como Venezuela). Permite llevar el control financiero total sin depender de hojas de cálculo propensas a errores o sistemas contables excesivamente complejos.

### Principales Funcionalidades:
- **💱 Bimonetario en Tiempo Real**: Configuración de tasa de cambio del dólar (Bs./$), mostrando precios, totales y facturas en ambas monedas de forma simultánea.
- **📱 Experiencia 100% Responsiva para Móviles**: Diseñado y optimizado para cobrar y gestionar desde teléfonos o tablets con barra flotante de cobro rápido, catálogo en 2 columnas y menú adaptativo.
- **📦 Control Real de Costos e Inventario**: Desglose de costo base + IVA (%) + flete de importación/envío para fijar márgenes de ganancia reales.
- **🔄 Anulación de Ventas y Reintegros**: Cancelación controlada de ventas con motivo registrado, reposición automática de stock y ajuste del arqueo de caja.
- **⚡ Alta Concurrencia (Modo SQLite WAL)**: Lectura y escritura simultánea rápida y sin bloqueos de base de datos entre la computadora principal y los teléfonos conectados por red local.
- **🖼️ Almacenamiento Eficiente de Imágenes**: Compresión automática a formato WebP guardado en disco (`uploads/`), manteniendo la base de datos ligera y ágil.
- **🧾 Facturación y Comprobantes en PDF**: Generación instantánea de facturas con el logo del negocio y la captura del comprobante de pago (Pago Móvil, Binance, Transferencia) adjunta en el mismo documento.
- **🔒 Inmutabilidad Histórica**: Cada venta congela la tasa de cambio, el costo unitario y el precio de venta de ese momento exacto, protegiendo las estadísticas históricas de fluctuaciones futuras.
- **🎨 Marca Blanca**: Personalización del nombre comercial, logo, colores de interfaz mediante variables CSS y alternancia entre modo Claro y Oscuro.
- **💾 Copias de Seguridad y Mantenimiento**: Respaldo y restauración de la base de datos SQLite con un solo clic, y opción para reiniciar historial de prueba.

---

## 🛠️ Stack Tecnológico

- **Backend**: Python 3.12, FastAPI, SQLModel (SQLAlchemy), SQLite (WAL Mode), FPDF2 (PDFs), Pillow (compresión WebP), Uvicorn.
- **Frontend**: React 19, Vite, Lucide React (iconos), Sistema de Toast Notifications nativo, Vanilla CSS responsivo.
- **Despliegue / Producción**: Docker (multi-stage build), Scripts de arranque local.

---

## 🚀 Cómo Probarlo en Local (Levantando ambos servicios por separado)

Para desarrollar o probar cambios en caliente (con recarga automática o *Hot Reload*), ejecutamos el **Backend** y el **Frontend** en dos terminales independientes.

### Requisitos Previos:
- **Python 3.10 o superior**: [python.org](https://www.python.org/) (asegúrate de marcar *"Add python.exe to PATH"* durante la instalación).
- **Node.js 18 o superior**: [nodejs.org](https://nodejs.org/).

---

### Paso 1: Levantar el Backend (FastAPI)

Abre tu primera terminal (PowerShell o CMD) en la raíz del proyecto:

```bash
# 1. Entrar a la carpeta del backend
cd backend

# 2. Crear el entorno virtual (solo la primera vez si no existe)
python -m venv venv

# 3. Activar el entorno virtual en Windows
.\venv\Scripts\activate

# 4. Instalar las dependencias de Python
pip install -r requirements.txt

# 5. Iniciar el servidor FastAPI con recarga automática
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

> **Verificación del Backend:**
> - Servidor API: [http://localhost:8000](http://localhost:8000)
> - Documentación interactiva (Swagger UI): [http://localhost:8000/docs](http://localhost:8000/docs)
> - Base de datos: Se creará automáticamente el archivo `gestor_pocho.db` dentro de la carpeta `backend/`.

---

### Paso 2: Levantar el Frontend (React + Vite)

Abre una **segunda terminal** en la raíz del proyecto:

```bash
# 1. Entrar a la carpeta del frontend
cd frontend

# 2. Instalar las dependencias de Node.js (solo la primera vez)
npm install

# 3. Iniciar el servidor de desarrollo de Vite (accesible en red local)
npm run dev -- --host
```

> **Acceso al Frontend:**
> - Abre tu navegador en: **[http://localhost:5173](http://localhost:5173)**
> 
> *Nota: El frontend detecta automáticamente que estás en el puerto `5173` y redirige todas las peticiones a la API en el puerto `8000`.*

---

## 📱 Probar desde un Teléfono o Tablet en la misma Red Wi-Fi

FastAPI y Vite permiten que otros dispositivos de tu casa o local se conecten al sistema (útil para cobrar desde el mostrador con el teléfono):

1. En tu PC, abre una terminal y escribe `ipconfig` para conocer tu **Dirección IPv4** local (por ejemplo: `192.168.1.15`).
2. Desde tu teléfono (conectado a la misma red Wi-Fi), abre el navegador e ingresa a:
   `http://192.168.1.15:5173`

---

## 📦 Otras Formas de Ejecución

### Opción A: Modo Producción Local Rápido (`start.bat`)
Si no quieres tener dos terminales abiertas y prefieres levantar todo con un solo clic:
1. Asegúrate de compilar el frontend una vez:
   ```bash
   cd frontend && npm run build && cd ..
   ```
2. Haz doble clic en **`start.bat`**.
3. Levantará el servidor en el puerto `8000` y abrirá automáticamente tu navegador en [http://localhost:8000](http://localhost:8000), sirviendo el frontend compilado y la API juntos.

### Opción B: Ejecutable Portable (.exe) para Pruebas Rápidas
Si quieres que otra persona o cliente pruebe el sistema en Windows sin instalar Node ni Python:
1. Puedes compilar el ejecutable ejecutando el script:
   ```bash
   package.bat
   ```
2. Esto creará **`GestorPocho.exe`**, que integra FastAPI, SQLite y la aplicación compilada de React en un solo ejecutable ligero.
3. Para compartirlo, basta con enviar el archivo ejecutable (junto con la carpeta `uploads/` si ya existen fotos cargadas).

### Opción C: Contenedor Docker
```bash
# Construir la imagen
docker build -t gestor-pocho .

# Correr el contenedor
docker run -d -p 8000:8000 -v $(pwd)/backend:/app/backend --name gestor-pocho gestor-pocho
```

---

## 📁 Estructura del Repositorio

```text
GestorPocho/
├── backend/
│   ├── routers/          # Rutas modulares (products, sales, cash, customers, stats, etc.)
│   ├── utils/            # Generación de facturas PDF (fpdf2) y compresión WebP
│   ├── database.py       # Conexión SQLite con modo WAL y SQLModel
│   ├── models.py         # Modelos de base de datos relacional
│   ├── schemas.py        # Validaciones de entrada/salida (Pydantic)
│   ├── main.py           # Servidor FastAPI principal y montaje de archivos
│   └── requirements.txt  # Dependencias de Python
├── frontend/
│   ├── src/
│   │   ├── components/   # Modales (ProductModal, VoidSaleModal, etc.) y Layout
│   │   ├── context/      # Estados globales (AppContext, ToastContext)
│   │   ├── views/        # Pantallas (POS, Inventario, Historial, Clientes, Dashboard, Config)
│   │   ├── index.css     # Tokens de diseño, temas claro/oscuro y reglas responsive
│   │   └── App.jsx       # Enrutador y vista principal
│   ├── package.json      # Dependencias de React y Vite
│   └── vite.config.js    # Configuración de proxy y build de Vite
├── uploads/              # Carpeta en disco para imágenes y comprobantes (WebP)
├── package.bat           # Script automático para compilar a .exe portable
├── start.bat             # Script de arranque rápido con un solo clic
└── README.md             # Documentación del proyecto
```
