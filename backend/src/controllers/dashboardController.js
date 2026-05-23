const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener Top 5 productos más vendidos
const obtenerProductosMasVendidos = async (req, res) => {
    try {
        // Agrupamos en DetalleVenta por producto_id sumando la cantidad
        const topVendidos = await prisma.detalleVenta.groupBy({
            by: ['producto_id'],
            _sum: {
                cantidad: true,
                subtotal: true
            },
            orderBy: {
                _sum: {
                    cantidad: 'desc'
                }
            },
            take: 5 // Solo los 5 más vendidos
        });

        // Hidratamos los datos para traer los nombres reales de los productos
        const resultadosCompletos = await Promise.all(
            topVendidos.map(async (item) => {
                const producto = await prisma.producto.findUnique({
                    where: { id: item.producto_id },
                    select: { nombre: true, precio: true, precio_compra: true }
                });
                return {
                    id: item.producto_id,
                    nombre: producto?.nombre || "Producto Eliminado",
                    metrosVendidos: Number(item._sum.cantidad) || 0,
                    totalRecaudado: Number(item._sum.subtotal) || 0,
                    precioVenta: producto?.precio || 0,
                    precioCompra: producto?.precio_compra || 0
                };
            })
        );

        res.json(resultadosCompletos);
    } catch (error) {
        console.error("Error en obtenerProductosMasVendidos:", error);
        res.status(500).json({ error: "Error al calcular el top de ventas" });
    }
};

// Obtener resumen completo del dashboard (ya existente)
const obtenerResumenDashboard = async (req, res) => {
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
            where: { 
                activo: true,
                stock: { lt: 15 }
            },
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
            graficoVentas,
            topProductos: []
        });
    } catch (e) {
        console.error("Error en obtenerResumenDashboard:", e);
        res.status(500).json({ error: e.message });
    }
};

module.exports = {
    obtenerProductosMasVendidos,
    obtenerResumenDashboard
};