const express = require('express');
const router = express.Router();
const ventaController = require('../controllers/ventaController');
const cajaController = require('../controllers/cajaController');
const { verificarToken } = require('../middlewares/authMiddleware'); 

// --- 1. RUTAS ESPECÍFICAS (Reportes) ---
// ⚠️ IMPORTANTE: Esta siempre debe ir arriba para que Express no se confunda
router.get('/reporte/detallado', verificarToken, ventaController.obtenerReporteDetallado);

// --- 2. RUTAS DE VENTAS ---
router.get('/resumen/hoy', verificarToken, ventaController.obtenerResumenHoy); 
router.post('/', verificarToken, ventaController.registrarVenta); 
router.get('/', verificarToken, ventaController.obtenerVentas);
router.put('/:id/anular', verificarToken, ventaController.anularVenta);

// --- 3. RUTAS DE CAJA Y GASTOS ---
router.get('/caja/estado', verificarToken, cajaController.estadoCaja);
router.post('/caja/abrir', verificarToken, cajaController.abrirCaja);
router.post('/gastos', verificarToken, cajaController.registrarGasto);
router.get('/cierre-caja', verificarToken, cajaController.obtenerCierreCaja); 
router.post('/caja/cerrar', verificarToken, cajaController.cerrarCaja);
router.get('/cajas/historial', cajaController.obtenerHistorialCajas);

module.exports = router;