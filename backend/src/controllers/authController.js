const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { registrarLog } = require('../services/auditoriaService');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secreto_telas_2026';

// 1. Registro de Usuarios (Corregido para leer el texto del frontend)
const registrarUsuario = async (req, res) => {
    // Aceptamos 'rol' en texto que viene desde PanelAdmin.jsx
    const { nombre, email, password, rol } = req.body;
    
    try {
        const existe = await prisma.usuario.findUnique({ where: { email } });
        if (existe) return res.status(400).json({ error: 'Ese correo ya está registrado.' });

        // Convertimos el texto a ID para la base de datos (Admin = 1, Vendedor = 2)
        let idDelRol = rol === 'Administrador' ? 1 : 2;
        
        let rolEnBD = await prisma.rol.findUnique({ where: { id: idDelRol } });
        
        if (!rolEnBD) {
            console.log(`Creando rol faltante (ID: ${idDelRol}) en la BD...`);
            rolEnBD = await prisma.rol.create({
                data: {
                    id: idDelRol,
                    nombre: idDelRol === 1 ? 'Administrador' : 'Vendedor'
                }
            });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const nuevoUsuario = await prisma.usuario.create({
            data: { 
                nombre, 
                email, 
                password: passwordHash, 
                rol_id: idDelRol
            }
        });

        res.status(201).json({ mensaje: 'Usuario registrado exitosamente', id: nuevoUsuario.id });
    } catch (error) {
        console.error("🚨 ERROR REAL AL REGISTRAR USUARIO:", error.message);
        res.status(500).json({ error: 'Error del servidor: ' + error.message });
    }
};

// 2. Login de Usuarios (Se mantiene intacto)
const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const usuario = await prisma.usuario.findUnique({
            where: { email },
            include: { rol: true } 
        });

        if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

        if (!usuario.activo) {
            return res.status(403).json({ error: 'Esta cuenta ha sido desactivada por el administrador.' });
        }

        const passwordValida = await bcrypt.compare(password, usuario.password);
        if (!passwordValida) return res.status(401).json({ error: 'Contraseña incorrecta' });

        const token = jwt.sign(
            { id: usuario.id, rol: usuario.rol.nombre }, 
            JWT_SECRET, 
            { expiresIn: '8h' }
        );

        await registrarLog(usuario.id, 'LOGIN', 'Inicio de sesión exitoso');
        res.json({ mensaje: 'Login exitoso', token, usuario: { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol.nombre } });
    } catch (error) {
        console.error("🚨 ERROR REAL DEL LOGIN:", error); 
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

// --- NUEVAS FUNCIONES PARA EL PANEL DE ADMINISTRADOR ---

// 3. Obtener lista de usuarios
const obtenerUsuarios = async (req, res) => {
    try {
        const usuarios = await prisma.usuario.findMany({
            include: { rol: true },
            orderBy: { id: 'asc' }
        });
        
        // Lo aplanamos un poco para que React lo lea sin problemas
        const usuariosMapeados = usuarios.map(u => ({
            id: u.id,
            nombre: u.nombre,
            email: u.email,
            rol: u.rol.nombre,
            activo: u.activo
        }));
        
        res.json(usuariosMapeados);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 4. Activar o dar de baja a un usuario
const cambiarEstadoUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const { activo } = req.body;
        
        const usuarioActualizado = await prisma.usuario.update({
            where: { id: parseInt(id) },
            data: { activo }
        });
        res.json(usuarioActualizado);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
const actualizarUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, email, rol, password } = req.body;
        
        let idDelRol = rol === 'Administrador' ? 1 : 2;
        let dataToUpdate = { nombre, email, rol_id: idDelRol };

        // Si el admin escribió una nueva contraseña, la encriptamos
        if (password && password.trim() !== "") {
            const salt = await bcrypt.genSalt(10);
            dataToUpdate.password = await bcrypt.hash(password, salt);
        }

        const usuarioActualizado = await prisma.usuario.update({
            where: { id: parseInt(id) },
            data: dataToUpdate
        });
        
        res.json({ mensaje: 'Usuario actualizado', usuario: usuarioActualizado });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { registrarUsuario, login, obtenerUsuarios, cambiarEstadoUsuario, actualizarUsuario };