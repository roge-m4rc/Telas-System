const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'super_secreto_telas_2026';

// Verifica que el usuario haya iniciado sesión (tenga un token válido)
const verificarToken = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ error: 'Acceso denegado. No hay token.' });

    try {
        const verificado = jwt.verify(token.replace('Bearer ', ''), JWT_SECRET);
        req.usuario = verificado; // Guardamos los datos del usuario en la petición
        next(); // Lo dejamos pasar
    } catch (error) {
        res.status(400).json({ error: 'Token no válido.' });
    }
};

// Verifica que el usuario tenga el rol necesario (Punto 2.5)
const verificarRol = (rolesPermitidos) => {
    return (req, res, next) => {
        if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
            return res.status(403).json({ error: 'Acceso denegado. No tienes permisos suficientes.' });
        }
        next();
    };
};

module.exports = { verificarToken, verificarRol };