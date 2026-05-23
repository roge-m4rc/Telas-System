const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Exportar copia de seguridad con fecha dinámica (Perú)
const exportarCopiaSeguridad = async (req, res) => {
    try {
        // Obtener fecha local de Perú en formato YYYY-MM-DD
        const opciones = { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' };
        const fechaPeru = new Intl.DateTimeFormat('fr-CA', opciones).format(new Date());

        // Obtener datos de todas las tablas importantes
        const [productos, ventas, clientes, usuarios, gastos, sesiones, movimientos] = await Promise.all([
            prisma.producto.findMany(),
            prisma.venta.findMany({ include: { detalles: true } }),
            prisma.cliente.findMany(),
            prisma.usuario.findMany({ select: { id: true, nombre: true, email: true, rol_id: true, activo: true } }),
            prisma.gasto.findMany(),
            prisma.sesionCaja.findMany(),
            prisma.movimiento.findMany()
        ]);

        const backupData = {
            generado: new Date().toISOString(),
            fechaBackup: fechaPeru,
            tablas: {
                productos,
                ventas,
                clientes,
                usuarios,
                gastos,
                sesiones,
                movimientos
            }
        };

        // Forzar descarga con nombre dinámico
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=BACKUP_SISTEMA_${fechaPeru}.json`);
        
        res.send(JSON.stringify(backupData, null, 2));
        
        console.log(`📦 Backup generado: BACKUP_SISTEMA_${fechaPeru}.json`);
    } catch (error) {
        console.error("Error en exportarCopiaSeguridad:", error);
        res.status(500).json({ error: "No se pudo compilar la copia de seguridad" });
    }
};

module.exports = { exportarCopiaSeguridad };