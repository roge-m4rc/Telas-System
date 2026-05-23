const express = require('express');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');
const {
    obtenerCategorias,
    crearCategoria,
    actualizarCategoria,
    eliminarCategoria,
    obtenerColores,
    crearColor,
    actualizarColor,
    eliminarColor
} = require('../controllers/atributoController');

const router = express.Router();

// ==================== RUTAS DE CATEGORÍAS ====================
router.get('/categorias', verificarToken, obtenerCategorias);
router.post('/categorias', verificarToken, verificarRol(['Administrador']), crearCategoria);
router.put('/categorias/:id', verificarToken, verificarRol(['Administrador']), actualizarCategoria);
router.delete('/categorias/:id', verificarToken, verificarRol(['Administrador']), eliminarCategoria);

// ==================== RUTAS DE COLORES ====================
router.get('/colores', verificarToken, obtenerColores);
router.post('/colores', verificarToken, verificarRol(['Administrador']), crearColor);
router.put('/colores/:id', verificarToken, verificarRol(['Administrador']), actualizarColor);
router.delete('/colores/:id', verificarToken, verificarRol(['Administrador']), eliminarColor);

module.exports = router;