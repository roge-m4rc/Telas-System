const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const obtenerLogs = async (req, res) => {
    try {
        // Traemos los últimos 50 movimientos, del más nuevo al más viejo
        const logs = await prisma.auditoria.findMany({
            orderBy: { fecha: 'desc' },
            take: 50,
            include: { 
                usuario: { select: { nombre: true, email: true, rol: true } } 
            }
        });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los registros de auditoría' });
    }
};

module.exports = { obtenerLogs };