const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const obtenerResumenGeneral = async (req, res) => {
    try {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

        const ventasHoy = await prisma.venta.aggregate({
            where: { fecha: { gte: hoy }, estado: 'ACTIVA' },
            _sum: { total: true },
            _count: { id: true }
        });

        const ventasMes = await prisma.venta.aggregate({
            where: { fecha: { gte: primerDiaMes }, estado: 'ACTIVA' },
            _sum: { total: true }
        });

        const alertasStock = await prisma.producto.findMany({
            where: { activo: true, stock: { lt: 15 } },
            orderBy: { stock: 'asc' },
            select: { nombre: true, stock: true }
        });

        const sieteDiasAtras = new Date();
        sieteDiasAtras.setDate(sieteDiasAtras.getDate() - 7);

        const ventasRaw = await prisma.venta.findMany({
            where: { fecha: { gte: sieteDiasAtras }, estado: 'ACTIVA' },
            select: { fecha: true, total: true }
        });

        const agrupado = ventasRaw.reduce((acc, v) => {
            const fecha = new Date(v.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
            acc[fecha] = (acc[fecha] || 0) + v.total;
            return acc;
        }, {});

        const graficoVentas = Object.keys(agrupado).map(f => ({ fecha: f, total: agrupado[f] }));

        res.json({
            hoy: { total: ventasHoy._sum.total || 0, cantidad: ventasHoy._count.id },
            mes: { total: ventasMes._sum.total || 0 },
            alertasStock,
            graficoVentas
        });
    } catch (error) {
        console.error("Error en obtenerResumenGeneral:", error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = { obtenerResumenGeneral };