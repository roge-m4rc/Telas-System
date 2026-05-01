const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const obtenerResumenGeneral = async (req, res) => {
    try {
        const hoy = new Date();
        const inicioDia = new Date(hoy.setHours(0, 0, 0, 0));
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

        // Ventas de hoy y del mes
        const ventasHoy = await prisma.venta.aggregate({
            _sum: { total: true },
            _count: { id: true },
            where: { fecha: { gte: inicioDia } }
        });

        const ventasMes = await prisma.venta.aggregate({
            _sum: { total: true },
            where: { fecha: { gte: inicioMes } }
        });

        // Top 5 productos más vendidos
        const topDetalles = await prisma.detalleVenta.groupBy({
            by: ['producto_id'],
            _sum: { cantidad: true },
            orderBy: { _sum: { cantidad: 'desc' } },
            take: 5
        });

        const productosMasVendidos = await Promise.all(
            topDetalles.map(async (item) => {
                const p = await prisma.producto.findUnique({
                    where: { id: item.producto_id },
                    select: { nombre: true }
                });
                return { nombre: p?.nombre, totalVendido: item._sum.cantidad };
            })
        );

        // Stock crítico (menos de 15 metros)
        const stockBajo = await prisma.producto.findMany({
            where: { stock: { lt: 15 } },
            select: { nombre: true, stock: true },
            orderBy: { stock: 'asc' }
        });

        // --- NUEVO: Gráfico de ventas últimos 7 días ---
        const sieteDiasAtras = new Date();
        sieteDiasAtras.setDate(sieteDiasAtras.getDate() - 7);
        sieteDiasAtras.setHours(0, 0, 0, 0);

        const ventasSemanales = await prisma.venta.groupBy({
            by: ['fecha'],
            _sum: { total: true },
            where: {
                fecha: { gte: sieteDiasAtras },
                estado: 'ACTIVA'
            },
            orderBy: { fecha: 'asc' }
        });

        const graficoVentas = ventasSemanales.map(v => ({
            fecha: new Date(v.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }),
            total: Number(v._sum.total) || 0
        }));
        // -------------------------------------------------

                // Ventas agrupadas por método de pago (hoy)
        const ventasPorMetodo = await prisma.venta.groupBy({
            by: ['metodo_pago'],
            _sum: { total: true },
            _count: { id: true },
            where: {
                fecha: { gte: inicioDia },
                estado: 'ACTIVA'
            }
        });

        const graficoMetodos = ventasPorMetodo.map(v => ({
            nombre: v.metodo_pago,
            total: Number(v._sum.total) || 0,
            cantidad: v._count.id
        }));

        res.json({
            hoy: {
                total: ventasHoy._sum.total || 0,
                cantidad: ventasHoy._count.id
            },
            mes: {
                total: ventasMes._sum.total || 0
            },
            topProductos: productosMasVendidos,
            alertasStock: stockBajo,
            graficoVentas,// <-- aquí estaba el problema, faltaba esto
            graficoMetodos  // <-- nuevo
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
    
};

module.exports = { obtenerResumenGeneral };