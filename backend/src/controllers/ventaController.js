const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 🛠️ FIX: Helper para obtener inicio/fin del día en Perú en UTC
const obtenerRangoDiaPeru = () => {
    const ahora = new Date();
    const fechaPeru = ahora.toLocaleString("en-US", { timeZone: "America/Lima" });
    const [datePart] = fechaPeru.split(', ');
    const [month, day, year] = datePart.split('/');
    
    // Inicio del día en Perú = 00:00:00 Lima = 05:00:00 UTC
    const inicio = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), 5, 0, 0));
    // Fin del día en Perú = 23:59:59 Lima = 04:59:59 UTC del día siguiente
    const fin = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), 5 + 23, 59, 59));
    
    return { inicio, fin };
};

const registrarVenta = async (req, res) => {
    console.log("🚨 DATOS QUE LLEGAN DEL FRONTEND:", req.body);
    const { cliente_id, productos, metodo_pago } = req.body; 
    const usuario_id = req.usuario ? req.usuario.id : 1; 

    try {
        const sesionActiva = await prisma.sesionCaja.findFirst({
            where: { usuario_id: usuario_id, estado: 'ABIERTA' }
        });

        if (!sesionActiva) {
            return res.status(400).json({ error: "¡Debes abrir tu caja antes de realizar ventas!" });
        }

        const resultadoVenta = await prisma.$transaction(async (tx) => {
            let totalVentaCalculado = 0;

            for (const item of productos) {
                const tela = await tx.producto.findUnique({ where: { id: item.id } });
                
                if (!tela || tela.stock < item.cantidad) {
                    throw new Error(`Stock insuficiente para: ${tela?.nombre || item.id}. Stock actual: ${tela?.stock}`);
                }
                
                totalVentaCalculado += item.cantidad * item.precio_unit;
            }

            const subtotalVenta = totalVentaCalculado / 1.18;
            const igvVenta = totalVentaCalculado - subtotalVenta;

            const nuevaVenta = await tx.venta.create({
                data: {
                    subtotal: subtotalVenta,
                    igv: igvVenta,
                    total: totalVentaCalculado,
                    usuario_id: usuario_id,
                    cliente_id: cliente_id || null,
                    sesion_id: sesionActiva.id, 
                    metodo_pago: metodo_pago || 'EFECTIVO', 
                    detalles: {
                        create: productos.map(item => ({
                            producto_id: item.id,
                            cantidad: item.cantidad,
                            precio_unit: item.precio_unit,
                            subtotal: item.cantidad * item.precio_unit
                        }))
                    }
                },
                include: { detalles: true, cliente: true }
            });

            for (const item of productos) {
                await tx.producto.update({
                    where: { id: item.id },
                    data: { stock: { decrement: item.cantidad } }
                });

                await tx.movimiento.create({
                    data: {
                        tipo: 'SALIDA',
                        cantidad: item.cantidad,
                        motivo: `Venta - Comprobante #${nuevaVenta.id}`,
                        producto_id: item.id
                    }
                });
            }

            return nuevaVenta;
        });

        res.status(201).json({ mensaje: '✅ Venta registrada con éxito', venta: resultadoVenta });

    } catch (error) {
        console.error("🚨 ERROR EN LA VENTA:", error.message);
        res.status(400).json({ error: error.message });
    }
};

const obtenerVentas = async (req, res) => {
    try {
        const ventas = await prisma.venta.findMany({
            include: { cliente: true, usuario: true },
            orderBy: { fecha: 'desc' }
        });
        res.json(ventas);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener historial de ventas' });
    }
};

// 🛠️ FIX: Usar rango de Perú en UTC
const obtenerResumenHoy = async (req, res) => {
    try {
        const { inicio, fin } = obtenerRangoDiaPeru();

        const resultado = await prisma.venta.aggregate({
            where: {
                fecha: { gte: inicio, lte: fin },
                estado: 'ACTIVA'
            },
            _sum: { total: true },
            _count: { id: true }
        });

        res.json({
            totalSoles: resultado._sum.total || 0,
            cantidadVentas: resultado._count.id || 0
        });
    } catch (error) {
        res.status(500).json({ error: "Error al calcular métricas" });
    }
};

const anularVenta = async (req, res) => {
    const { id } = req.params;

    try {
        const resultado = await prisma.$transaction(async (tx) => {
            const venta = await tx.venta.findUnique({
                where: { id: parseInt(id) },
                include: { detalles: true }
            });

            if (!venta || venta.estado === 'ANULADA') {
                throw new Error("La venta no existe o ya fue anulada.");
            }

            const ventaAnulada = await tx.venta.update({
                where: { id: parseInt(id) },
                data: { estado: 'ANULADA' }
            });

            for (const item of venta.detalles) {
                await tx.producto.update({
                    where: { id: item.producto_id },
                    data: { stock: { increment: item.cantidad } }
                });

                await tx.movimiento.create({
                    data: {
                        tipo: 'ENTRADA',
                        cantidad: item.cantidad,
                        motivo: `Devolución por Anulación de Boleta #${venta.id}`,
                        producto_id: item.producto_id
                    }
                });
            }
            return ventaAnulada;
        });

        res.json({ mensaje: '🚫 Venta anulada y stock devuelto con éxito', venta: resultado });
    } catch (error) {
        console.error("Error al anular:", error);
        res.status(400).json({ error: error.message });
    }
};

const obtenerReporteDetallado = async (req, res) => {
    const { inicio, fin } = req.query;

    try {
        const fechaInicio = new Date(`${inicio}T00:00:00-05:00`);
        const fechaFin = new Date(`${fin}T23:59:59-05:00`);

        const ventas = await prisma.venta.findMany({
            where: {
                fecha: {
                    gte: fechaInicio,
                    lte: fechaFin,
                },
                estado: 'ACTIVA',
            },
            include: { cliente: true },
            orderBy: { fecha: 'desc' },
        });

        const totalVendido = ventas.reduce((s, v) => s + Number(v.total), 0);
        
        const metodos = ventas.reduce((acc, v) => {
            const m = v.metodo_pago || 'OTROS';
            acc[m] = (acc[m] || 0) + Number(v.total);
            return acc;
        }, {});

        res.json({
            ventas,
            resumen: {
                totalVendido,
                metodos
            }
        });
    } catch (error) {
        console.error("Error en reporte detallado:", error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = { registrarVenta, obtenerVentas, obtenerResumenHoy, anularVenta, obtenerReporteDetallado };