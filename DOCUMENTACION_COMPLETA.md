# 🧵 TELAS SYSTEM - DOCUMENTACIÓN COMPLETA

**Versión:** 2.0.0  
**Fecha:** Enero 2025  
**Autor:** Rogelio M4rc-

---

## 📋 ÍNDICE

1. [INTRODUCCIÓN](#1-introducción)
2. [CARACTERÍSTICAS PRINCIPALES](#2-características-principales)
3. [TECNOLOGÍAS UTILIZADAS](#3-tecnologías-utilizadas)
4. [REQUISITOS DEL SISTEMA](#4-requisitos-del-sistema)
5. [INSTALACIÓN LOCAL](#5-instalación-local)
6. [VARIABLES DE ENTORNO](#6-variables-de-entorno)
7. [DESPLIEGUE EN RENDER](#7-despliegue-en-render)
8. [MANUAL DE USUARIO](#8-manual-de-usuario)
9. [MANUAL TÉCNICO](#9-manual-técnico)
10. [API ENDPOINTS](#10-api-endpoints)
11. [FUNCIONALIDADES DETALLADAS](#11-funcionalidades-detalladas)
12. [SOLUCIÓN DE PROBLEMAS](#12-solución-de-problemas)
13. [CHANGELOG](#13-changelog)

---

## 1. INTRODUCCIÓN

**Telas System** es un sistema integral para la gestión de inventario de telas, punto de venta, control de caja y generación de reportes. Desarrollado con tecnologías modernas (React, Node.js, PostgreSQL), ofrece una experiencia fluida tanto en computadoras de escritorio como en tablets.

### Roles de usuario

| Rol | Permisos |
|-----|----------|
| **Administrador** | Acceso total: inventario, ventas, caja, reportes, usuarios, backup |
| **Vendedor** | Acceso limitado: ventas, consultar inventario, ver reportes |

---

## 2. CARACTERÍSTICAS PRINCIPALES

### 📦 Inventario
- CRUD completo de productos (telas)
- Gestión de categorías y colores (CRUD completo)
- Eliminación lógica de productos (activo/inactivo)
- Reactivación de productos desactivados
- Control de stock con ajustes manuales
- Alerta de stock bajo (configurable: 15m por defecto)

### 💰 Punto de Venta
- Búsqueda de productos por nombre/categoría/color
- Carrito de ventas en tiempo real
- **Sistema de rebajas** (editar precio por producto en el carrito)
- Múltiples métodos de pago (Efectivo, Yape/Plin, Visa)
- Registro de clientes
- Impresión de tickets/boletas (80mm)
- Reimpresión de tickets desde historial

### 🏦 Gestión de Caja
- Apertura y cierre de caja con monto inicial/final
- Registro de gastos diarios
- Historial de cierres de caja con auditoría
- PDF de cierre de turno

### 📊 Reportes y Auditoría
- Dashboard con resumen diario/mensual
- Gráfico de tendencia de ventas (7 días)
- **Top 5 productos más vendidos**
- **Cálculo de margen de ganancia** (precio_compra vs precio_venta)
- Historial de ventas con filtros por fechas, estado y búsqueda
- Anulación de ventas con motivo obligatorio y devolución de stock
- Reimpresión de tickets
- Exportación a Excel y PDF
- Kardex con historial completo de movimientos

### 🔐 Seguridad
- Autenticación JWT (8 horas de expiración)
- Roles de usuario (Administrador / Vendedor)
- Gestión de usuarios (CRUD completo)
- Cierre de sesión automático por token expirado

### 💾 Backup
- Exportación manual (solo Administradores)
- Nombre dinámico: `BACKUP_SISTEMA_YYYY-MM-DD.json`
- Incluye: productos, ventas, clientes, usuarios, gastos, movimientos

---

## 3. TECNOLOGÍAS UTILIZADAS

### Frontend
| Tecnología | Versión | Uso |
|------------|---------|-----|
| React | 18.x | Librería principal |
| Vite | 4.x | Build tool |
| Tailwind CSS | 3.x | Estilos responsivos |
| Recharts | 2.x | Gráficos del dashboard |
| jsPDF + autoTable | 2.x | Generación de PDFs |
| SheetJS (XLSX) | 0.18.x | Exportación a Excel |
| Sonner | 1.x | Notificaciones toast |
| Axios | 1.x | Cliente HTTP |

### Backend
| Tecnología | Versión | Uso |
|------------|---------|-----|
| Node.js | 22.x | Entorno de ejecución |
| Express | 4.x | Framework web |
| Prisma | 6.x | ORM para PostgreSQL |
| PostgreSQL | 15.x | Base de datos (Supabase) |
| JWT (jsonwebtoken) | 9.x | Autenticación |
| bcryptjs | 2.x | Encriptación de contraseñas |

---

## 4. REQUISITOS DEL SISTEMA

| Requisito | Versión mínima |
|-----------|---------------|
| Node.js | 22.x |
| npm | 10.x |
| Git | 2.x |
| PostgreSQL | 15.x (o cuenta en Supabase) |

---

## 5. INSTALACIÓN LOCAL

### 5.1 Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/telas-system.git
cd telas-system