const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const obtenerPeriodosPeru = (ahora) => {
    const partes = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(ahora);
    const valor = (tipo) => Number(partes.find(parte => parte.type === tipo).value);
    const anio = valor('year');
    const mes = valor('month') - 1;
    const dia = valor('day');

    // Medianoche del calendario Perú (UTC-05:00) equivale a las 05:00 UTC.
    // Date.UTC normaliza los cambios de mes/año sin usar la zona del servidor.
    return {
        inicioDia: new Date(Date.UTC(anio, mes, dia, 5)),
        siguienteDia: new Date(Date.UTC(anio, mes, dia + 1, 5)),
        inicioMes: new Date(Date.UTC(anio, mes, 1, 5)),
        siguienteMes: new Date(Date.UTC(anio, mes + 1, 1, 5)),
        inicioTendencia: new Date(Date.UTC(anio, mes, dia - 6, 5))
    };
};

const obtenerResumenGeneral = async (req, res) => {
    try {
        // 1. Límites semiabiertos del calendario de America/Lima.
        const { inicioDia, siguienteDia, inicioMes, siguienteMes, inicioTendencia } =
            obtenerPeriodosPeru(new Date());
        
        // 2. Ventas de hoy (usando Prisma sin SQL crudo)
        const ventasHoy = await prisma.venta.aggregate({
            _sum: { total: true },
            _count: { id: true },
            where: { 
                fecha: { gte: inicioDia, lt: siguienteDia },
                estado: 'ACTIVA' 
            }
        });

        // 3. Ventas del Mes
        const ventasMes = await prisma.venta.aggregate({
            _sum: { total: true },
            where: {
                fecha: { gte: inicioMes, lt: siguienteMes },
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
        // Hoy y los seis días anteriores, hasta la próxima medianoche Perú.
        const ventasSemanalesRaw = await prisma.venta.findMany({
            where: {
                fecha: { gte: inicioTendencia, lt: siguienteDia },
                estado: 'ACTIVA'
            },
            select: { fecha: true, total: true },
            orderBy: { fecha: 'asc' }
        });

        // Agrupar por día calendario Perú, manteniendo las etiquetas del gráfico.
        const agrupadoPorFecha = {};
        ventasSemanalesRaw.forEach(v => {
            const fechaKey = new Date(v.fecha).toLocaleDateString('es-PE', {
                timeZone: 'America/Lima', day: '2-digit', month: 'short'
            });
            agrupadoPorFecha[fechaKey] = (agrupadoPorFecha[fechaKey] || 0) + Number(v.total);
        });

        const graficoVentas = Object.keys(agrupadoPorFecha).map(fecha => ({
            fecha: fecha,
            total: agrupadoPorFecha[fecha]
        }));

        // 6. Ventas agrupadas por método de pago (Hoy) - usando Prisma
        const ventasHoyRaw = await prisma.venta.findMany({
            where: {
                fecha: { gte: inicioDia, lt: siguienteDia },
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
