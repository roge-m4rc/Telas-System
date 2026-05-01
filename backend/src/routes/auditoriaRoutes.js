const express = require('express');
const router = express.Router();
const { obtenerLogs } = require('../controllers/auditoriaController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

// Solo un Administrador logueado puede ver esta ruta
router.get('/', verificarToken, verificarRol(['Administrador']), obtenerLogs);

module.exports = router;