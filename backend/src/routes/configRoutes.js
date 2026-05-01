const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');
const { verificarToken } = require('../middlewares/authMiddleware');

router.get('/', configController.obtenerConfiguracion);
router.post('/', verificarToken, configController.actualizarConfiguracion); // Asegúrate de tener esta línea

module.exports = router;