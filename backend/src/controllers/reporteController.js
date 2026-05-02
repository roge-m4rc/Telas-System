const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const obtenerResumenGeneral = async (req, res) => {
    try {
        // 1. Configuración de Zona Horaria Perú (Imprescindible para servidores en USA/Oregon)
        const hoyPeru = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Lima" }));

        const inicioDia = new Date(hoyPeru);
        inicioDia.setHours(0, 0, 0, 0);

        const inicioMes = new Date(hoyPeru.getFullYear(), hoyPeru.getMonth(), 1);
        inicioMes.setHours(0, 0, 0, 0);

        // 2. Ventas de hoy y del mes (Filtramos por estado 'ACTIVA')
        const ventasHoy = await prisma.venta.aggregate({
            _sum: { total: true },
            _count: { id: true },
            where: {
                fecha: { gte: inicioDia },
                estado: 'ACTIVA'
            }
        });

        const ventasMes = await prisma.venta.aggregate({
            _sum: { total: true },
            where: {
                fecha: { gte: inicioMes },
                estado: 'ACTIVA'
            }
        });

        // 3. Top 5 productos más vendidos
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
                return { nombre: p?.nombre || 'Producto no encontrado', totalVendido: item._sum.cantidad };
            })
        );

        // 4. Stock crítico (menos de 15 metros/unidades)
        const stockBajo = await prisma.producto.findMany({
            where: { stock: { lt: 15 } },
            select: { nombre: true, stock: true },
            orderBy: { stock: 'asc' }
        });

        // 5. Gráfico de ventas últimos 7 días (Ajustado a hoyPeru)
        const sieteDiasAtras = new Date(inicioDia);
        sieteDiasAtras.setDate(sieteDiasAtras.getDate() - 7);

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

        // 6. Ventas agrupadas por método de pago (Hoy)
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
            nombre: v.metodo_pago || 'No especificado',
            total: Number(v._sum.total) || 0,
            cantidad: v._count.id
        }));

        // 7. Respuesta final
        res.json({
            hoy: {
                total: Number(ventasHoy._sum.total) || 0,
                cantidad: ventasHoy._count.id || 0
            },
            mes: {
                total: Number(ventasMes._sum.total) || 0
            },
            topProductos: productosMasVendidos,
            alertasStock: stockBajo,
            graficoVentas,
            graficoMetodos
        });

    } catch (error) {
        console.error("Error en obtenerResumenGeneral:", error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = { obtenerResumenGeneral };