const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const registrarVenta = async (req, res) => {
    console.log("🚨 DATOS QUE LLEGAN DEL FRONTEND:", req.body);
    // 1. AÑADIMOS metodo_pago AQUÍ 👇
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
                    // 2. LO GUARDAMOS EN LA BASE DE DATOS AQUÍ 👇
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

const obtenerResumenHoy = async (req, res) => {
    try {
        const inicioDia = new Date();
        inicioDia.setHours(0, 0, 0, 0);

        const finDia = new Date();
        finDia.setHours(23, 59, 59, 999);

        const resultado = await prisma.venta.aggregate({
            where: {
                fecha: { gte: inicioDia, lte: finDia }
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
    try {
        const { inicio, fin } = req.query;

        // 🚨 EL ARREGLO ESTÁ AQUÍ: Le agregamos la hora exacta para forzar la zona horaria local
        const fechaInicio = inicio ? new Date(inicio + "T00:00:00") : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const fechaFin = fin ? new Date(fin + "T23:59:59") : new Date();

        const ventas = await prisma.venta.findMany({
            where: {
                fecha: { gte: fechaInicio, lte: fechaFin },
                estado: 'ACTIVA'
            },
            include: {
                cliente: { select: { nombre: true, documento: true } },
                detalles: { include: { producto: true } }
            },
            orderBy: { fecha: 'desc' }
        });

        const resumen = ventas.reduce((acc, v) => {
            acc.totalVendido += v.total;
            acc.metodos[v.metodo_pago] = (acc.metodos[v.metodo_pago] || 0) + v.total;
            return acc;
        }, { totalVendido: 0, metodos: {} });

        res.json({ resumen, ventas });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 👇 ¡ESTA ES LA LÍNEA CLAVE QUE SUELE FALTAR!
module.exports = { registrarVenta, obtenerVentas, obtenerResumenHoy, anularVenta, obtenerReporteDetallado };