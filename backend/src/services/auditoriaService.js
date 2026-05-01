const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const registrarLog = async (usuario_id, accion, detalles = "") => {
    try {
        await prisma.auditoria.create({
            data: {
                usuario_id,
                accion,
                detalles
            }
        });
    } catch (error) {
        console.error("Error registrando auditoría:", error);
    }
};

module.exports = { registrarLog };