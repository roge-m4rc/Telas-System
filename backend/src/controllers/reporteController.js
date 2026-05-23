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
        
        // 2. Ventas de hoy (usando Prisma sin SQL crudo)
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

        // 5. Gráfico de ventas últimos 7 días (usando Prisma, no SQL crudo)
        const sieteDiasAtras = new Date(inicioDia);
        sieteDiasAtras.setDate(sieteDiasAtras.getDate() - 7);

        // Obtener ventas de los últimos 7 días
        const ventasSemanalesRaw = await prisma.venta.findMany({
            where: {
                fecha: { gte: sieteDiasAtras },
                estado: 'ACTIVA'
            },
            select: { fecha: true, total: true },
            orderBy: { fecha: 'asc' }
        });

        // Agrupar por fecha en el frontend (evitamos SQL complejo)
        const agrupadoPorFecha = {};
        ventasSemanalesRaw.forEach(v => {
            const fechaKey = new Date(v.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
            agrupadoPorFecha[fechaKey] = (agrupadoPorFecha[fechaKey] || 0) + Number(v.total);
        });

        const graficoVentas = Object.keys(agrupadoPorFecha).map(fecha => ({
            fecha: fecha,
            total: agrupadoPorFecha[fecha]
        }));

        // 6. Ventas agrupadas por método de pago (Hoy) - usando Prisma
        const ventasHoyRaw = await prisma.venta.findMany({
            where: {
                fecha: { gte: inicioDia },
                estado: 'ACTIVA'
            },
            select: { metodo_pago: true, total: true }
        });

        const agrupadoPorMetodo = {};
        ventasHoyRaw.forEach(v => {
            const metodo = v.metodo_pago || 'No especificado';
            agrupadoPorMetodo[metodo] = {
                total: (agrupadoPorMetodo[metodo]?.total || 0) + Number(v.total),
                cantidad: (agrupadoPorMetodo[metodo]?.cantidad || 0) + 1
            };
        });

        const graficoMetodos = Object.keys(agrupadoPorMetodo).map(metodo => ({
            nombre: metodo,
            total: agrupadoPorMetodo[metodo].total,
            cantidad: agrupadoPorMetodo[metodo].cantidad
        }));

        // 7. Top 5 productos más vendidos
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