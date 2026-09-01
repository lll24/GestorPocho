# 📦 Gestor Pocho

> **Sistema integral de gestión de ventas, inventario, costos y facturación bimonetaria (USD / VES) diseñado para emprendimientos y comercios.**

---

## 🎯 ¿De qué trata el proyecto?

**Gestor Pocho** nace para solucionar la realidad operativa de los pequeños y medianos negocios en mercados con dinámicas multimoneda (como Venezuela). Permite llevar el control financiero total sin depender de hojas de cálculo propensas a errores o sistemas contables excesivamente complejos.

### Principales Funcionalidades:
- **💱 Bimonetario en Tiempo Real**: Configuración de tasa de cambio del dólar (Bs./$), mostrando precios, totales y facturas en ambas monedas de forma simultánea.
- **📦 Control Real de Costos e Inventario**: Desglose de costo base + IVA (%) + flete de importación/envío para fijar márgenes de ganancia reales.
- **🧾 Facturación y Comprobantes en PDF**: Generación instantánea de facturas con el logo del negocio y la captura del comprobante de pago (Pago Móvil, Binance, Transferencia) adjunta en el mismo documento.
- **🔒 Inmutabilidad Histórica**: Cada venta congela la tasa de cambio, el costo unitario y el precio de venta de ese momento exacto, protegiendo las estadísticas históricas de fluctuaciones futuras.
- **🎨 Marca Blanca**: Personalización del nombre comercial, logo, colores de interfaz mediante variables CSS y alternancia entre modo Claro y Oscuro.
- **💾 Copias de Seguridad**: Respaldo y restauración de la base de datos SQLite con un solo clic.

---

## 🛠️ Stack Tecnológico

- **Backend**: Python 3.12, FastAPI, SQLModel (SQLAlchemy), SQLite, FPDF2 (PDFs), Pillow (compresión de imágenes), Uvicorn.
- **Frontend**: React 19, Vite, Lucide React (iconos), Vanilla CSS responsivo.
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

### Opción B: Contenedor Docker
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
│   ├── database.py       # Configuración de SQLite y motor SQLModel (persistente)
│   ├── models.py         # Tablas de DB (BusinessConfig, Product, Sale, SaleItem)
│   ├── main.py           # Endpoints de API, facturación PDF, KPIs y servidor estático
│   ├── requirements.txt  # Librerías de Python requeridas
│   └── gestor_pocho.db   # Base de datos SQLite local
├── frontend/
│   ├── src/
│   │   ├── App.jsx       # Componente principal de la aplicación
│   │   ├── index.css     # Sistema de diseño y variables temáticas
│   │   └── main.jsx      # Punto de entrada de React
│   ├── package.json      # Dependencias de npm
│   └── vite.config.js    # Configuración de Vite
├── Dockerfile            # Construcción multi-stage para producción
├── start.bat             # Script de arranque rápido para Windows
└── README.md             # Documentación general del proyecto
```
