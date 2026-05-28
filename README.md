# 🧵 Telas System - Sistema de Gestión de Inventario

Sistema completo para la gestión de inventario de telas, punto de venta, control de caja y reportes. Desarrollado con React + Tailwind (frontend) y Node.js + Express + Prisma + PostgreSQL (backend).

## 📋 Tabla de Contenidos

- [Características Principales](#características-principales)
- [Tecnologías Utilizadas](#tecnologías-utilizadas)
- [Requisitos Previos](#requisitos-previos)
- [Instalación Local](#instalación-local)
- [Variables de Entorno](#variables-de-entorno)
- [Comandos Útiles](#comandos-útiles)
- [Despliegue en Render](#despliegue-en-render)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [API Endpoints](#api-endpoints)
- [Contribución](#contribución)
- [Licencia](#licencia)

## 🚀 Características Principales

### Inventario
- ✅ CRUD completo de productos (telas)
- ✅ Gestión de categorías y colores (CRUD completo)
- ✅ Eliminación lógica de productos (activo/inactivo)
- ✅ Reactivación de productos desactivados
- ✅ Control de stock con ajustes manuales
- ✅ Alerta de stock bajo (configurable)

### Punto de Venta
- ✅ Búsqueda de productos por nombre/categoría/color
- ✅ Carrito de ventas en tiempo real
- ✅ **Sistema de rebajas** (editar precio por producto)
- ✅ Múltiples métodos de pago (Efectivo, Yape/Plin, Visa)
- ✅ Registro de clientes
- ✅ Impresión de tickets/boletas

### Gestión de Caja
- ✅ Apertura y cierre de caja
- ✅ Registro de gastos diarios
- ✅ Historial de cierres de caja
- ✅ Auditoría de cajas
- ✅ PDF de cierre de turno

### Reportes y Auditoría
- ✅ Dashboard con resumen diario/mensual
- ✅ Gráfico de tendencia de ventas (7 días)
- ✅ **Cálculo de margen de ganancia** (precio_compra vs precio_venta)
- ✅ Historial de ventas con filtros por fechas, estado y búsqueda
- ✅ Anulación de ventas con motivo obligatorio
- ✅ Reimpresión de tickets
- ✅ Exportación a Excel y PDF

### Seguridad
- ✅ Autenticación JWT
- ✅ Roles de usuario (Administrador / Vendedor)
- ✅ Control de acceso por rol
- ✅ Cierre de sesión automático por token expirado

### Backup y Recuperación
- ✅ **Backup automático con fecha dinámica (Perú)**
- ✅ Exportación de datos a JSON
- ✅ Respaldo de todas las tablas (productos, ventas, clientes, etc.)

## 🛠️ Tecnologías Utilizadas

### Frontend
| Tecnología        | Versión | Uso                         |
|-------------------|---------|-----------------------------|
| React             | 18.x    | Librería principal          |
| Vite              | 4.x     | Build tool                  |
| Tailwind CSS      | 3.x     | Estilos y diseño responsivo |
| Recharts          | 2.x     | Gráficos del dashboard      |
| jsPDF + autoTable | 2.x     | Generación de PDFs          |
| SheetJS (XLSX)    | 0.18.x  | Exportación a Excel         |
| Sonner            | 1.x     | Notificaciones toast        |
| Axios             | 1.x     | Cliente HTTP                |

### Backend
| Tecnología        | Versión | Uso                         |
|-------------------|---------|-----------------------------|
| Node.js           | 22.x    | Entorno de ejecución        |
| Express           | 4.x     | Framework web               |
| Prisma            | 6.x     | ORM para PostgreSQL         |
| PostgreSQL        | 15.x    | Base de datos (Supabase)    |
| JWT (jsonwebtoken)| 9.x     | Autenticación               |
| bcryptjs          | 2.x     | Encriptación de contraseñas |
| Cors              | 2.x     | Seguridad CORS              |

## 📋 Requisitos Previos

- Node.js v22 o superior
- npm o yarn
- PostgreSQL (local) o cuenta en Supabase
- Git

## 🔧 Instalación Local

### 1. Clonar el repositorio

```bash
git clone https://github.com/roge-m4rc/telas-system.git
cd telas-system