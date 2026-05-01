const express = require('express');
const router = express.Router();

// 1. Importamos TODAS las funciones, incluyendo la nueva 'actualizarUsuario'
const { 
    registrarUsuario, 
    login, 
    obtenerUsuarios, 
    cambiarEstadoUsuario, 
    actualizarUsuario // <-- ¡Aquí está la nueva!
} = require('../controllers/authController');

const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

// --- Rutas públicas ---
router.post('/login', login);

// --- Rutas protegidas (Solo un Administrador puede gestionar esto) ---

// Crear un nuevo usuario
router.post('/registrar', verificarToken, verificarRol(['Administrador']), registrarUsuario);

// Obtener la lista de todos los usuarios para la tabla
router.get('/usuarios', verificarToken, verificarRol(['Administrador']), obtenerUsuarios);

// Cambiar el estado (Activo/Inactivo) de un usuario
router.patch('/usuarios/:id/estado', verificarToken, verificarRol(['Administrador']), cambiarEstadoUsuario);

// ✏️ EDITAR un usuario (Nombre, Email, Rol, Password)
router.put('/usuarios/:id', verificarToken, verificarRol(['Administrador']), actualizarUsuario);


module.exports = router;