const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const obtenerResumenGeneral = async (req, res) => {
    try {
        // 1. Configuración de Zona Horaria Perú (UTC-5)
        const ahora = new Date();
        
        // Calcular inicio del día en Perú (00:00:00 UTC-5)
        const inicioDia = new Date(ahora);
        inicioDia.setHours(ahora.getHours() - 5, 0, 0, 0);
        
        // Calcular inicio del mes
        const inicioMes = new Date(inicioDia);
        inicioMes.setDate(1);
        inicioMes.setHours(0, 0, 0, 0);
        
        // 2. Ventas de hoy (filtramos por estado 'ACTIVA')
        const ventasHoy = await prisma.venta.aggregate({
            _sum: { total: true },
            _count: { id: true },
            where: { 
                fecha: { gte: inicioDia },
                estado: 'ACTIVA' 
            }
        });

        // 3. Ventas del Mes
        const ventasMes = await prisma.venta.aggregate({
            _sum: { total: true },
            where: {
                fecha: { gte: inicioMes },
                estado: 'ACTIVA'
            }
        });

        // 4. Stock crítico (menos de 15 metros/unidades) - solo activos
        const stockBajo = await prisma.producto.findMany({
            where: { 
                activo: true,
                stock: { lt: 15 } 
            },
            select: { nombre: true, stock: true },
            orderBy: { stock: 'asc' }
        });

        // 5. Gráfico de ventas últimos 7 días
        const sieteDiasAtras = new Date(inicioDia);
        sieteDiasAtras.setDate(sieteDiasAtras.getDate() - 7);

        const ventasSemanales = await prisma.$queryRaw`
            SELECT 
                DATE(fecha) as fecha,
                SUM(total) as total
            FROM Ventas
            WHERE fecha >= ${sieteDiasAtras}
                AND estado = 'ACTIVA'
            GROUP BY DATE(fecha)
            ORDER BY fecha ASC
        `;

        const graficoVentas = Array.isArray(ventasSemanales) ? ventasSemanales.map(v => ({
            fecha: new Date(v.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }),
            total: Number(v.total) || 0
        })) : [];

        // 6. Ventas agrupadas por método de pago (Hoy)
        const ventasPorMetodo = await prisma.$queryRaw`
            SELECT 
                metodo_pago,
                SUM(total) as total,
                COUNT(id) as cantidad
            FROM Ventas
            WHERE fecha >= ${inicioDia}
                AND estado = 'ACTIVA'
            GROUP BY metodo_pago
        `;

        const graficoMetodos = Array.isArray(ventasPorMetodo) ? ventasPorMetodo.map(v => ({
            nombre: v.metodo_pago || 'No especificado',
            total: Number(v.total) || 0,
            cantidad: Number(v.cantidad) || 0
        })) : [];

        // 7. Top 5 productos más vendidos (usando Prisma directamente)
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
                return { 
                    nombre: p?.nombre || 'Producto eliminado', 
                    totalVendido: Number(item._sum.cantidad) || 0 
                };
            })
        );

        // 8. Respuesta final
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