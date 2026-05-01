const express = require('express');
const router = express.Router();
const { obtenerClientes, crearCliente, actualizarCliente, eliminarCliente } = require('../controllers/clienteController');
const { verificarToken } = require('../middlewares/authMiddleware');

// Protegemos todas las rutas con verificarToken (Vendedores y Admin pueden usarlo)
router.get('/', verificarToken, obtenerClientes);
router.post('/', verificarToken, crearCliente);
router.put('/:id', verificarToken, actualizarCliente);
router.delete('/:id', verificarToken, eliminarCliente);

module.exports = router;