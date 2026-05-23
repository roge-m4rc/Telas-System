const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');
const reporteController = require('../controllers/reporteController');
const productoController = require('../controllers/productoController');
const dashboardController = require('../controllers/dashboardController'); // 👈 Importa TODO el controlador
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ⚠️ RUTAS ESTÁTICAS PRIMERO (antes de las que tienen :id)
router.get('/dashboard/resumen', verificarToken, reporteController.obtenerResumenGeneral);

// 👇 RUTAS PARA INACTIVOS (DEBEN IR ANTES de las rutas con :id)
router.get('/inactivos', verificarToken, verificarRol(['Administrador']), productoController.obtenerProductosInactivos);
router.patch('/:id/reactivar', verificarToken, verificarRol(['Administrador']), productoController.reactivarProducto);

// 👇 RUTA CON FILTROS (DEBE IR ANTES de la ruta /movimientos normal)
router.get('/movimientos/filtrados', verificarToken, productoController.obtenerMovimientosConFiltros);
router.get('/dashboard/top-productos', verificarToken, dashboardController.obtenerProductosMasVendidos);

// Ruta original de movimientos (sin filtros, se mantiene por compatibilidad)
router.get('/movimientos', verificarToken, async (req, res) => {
    try {
        const lista = await prisma.movimiento.findMany({
            include: { producto: true },
            orderBy: { fecha: 'desc' }
        });
        res.json(lista);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener movimientos' });
    }
});

// RUTAS GENERALES DE PRODUCTOS
router.get('/', verificarToken, productoController.obtenerProductos);
router.post('/', verificarToken, verificarRol(['Administrador']), productoController.crearProducto);
router.put('/:id', verificarToken, verificarRol(['Administrador']), productoController.actualizarProducto);
router.delete('/:id', verificarToken, verificarRol(['Administrador']), productoController.eliminarProducto);

// RUTAS CON :id AL FINAL
router.patch('/:id/stock', verificarToken, async (req, res) => {
    const { cantidad, tipo, motivo } = req.body;
    const id = parseInt(req.params.id);
    try {
        const cambio = tipo === 'entrada' ? cantidad : -cantidad;
        const resultado = await prisma.$transaction([
            prisma.producto.update({
                where: { id },
                data: { stock: { increment: cambio } }
            }),
            prisma.movimiento.create({
                data: {
                    tipo: tipo.toUpperCase(),
                    cantidad: cantidad,
                    motivo: motivo || (tipo === 'entrada' ? "Ingreso manual" : "Ajuste manual"),
                    producto_id: id
                }
            })
        ]);
        res.json(resultado[0]);
    } catch (error) {
        res.status(400).json({ error: "Error al registrar movimiento: " + error.message });
    }
});

module.exports = router;