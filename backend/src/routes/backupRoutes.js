const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');
const { exportarCopiaSeguridad } = require('../controllers/backupController');

// Solo administradores pueden generar backup
router.get('/exportar', verificarToken, verificarRol(['Administrador']), exportarCopiaSeguridad);

module.exports = router;