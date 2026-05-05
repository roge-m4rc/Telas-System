const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const obtenerInicioDiaPeru = () => {
    const ahora = new Date();
    const fechaPeru = ahora.toLocaleString("en-US", { timeZone: "America/Lima" });
    const [datePart] = fechaPeru.split(', ');
    const [month, day, year] = datePart.split('/');
    return new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), 5, 0, 0));
};

const estadoCaja = async (req, res) => {
    try {
        const inicioDiaPeru = obtenerInicioDiaPeru();
        const cajaAbierta = await prisma.sesionCaja.findFirst({
            where: { estado: 'ABIERTA' },
            include: { usuario: true }
        });
        const ventasHoy = await prisma.venta.aggregate({
            _sum: { total: true },
            where: { 
                fecha: { gte: inicioDiaPeru },
                estado: 'ACTIVA'
            }
        });
        res.json({
            abierta: !!cajaAbierta,
            datos: cajaAbierta,
            totalVentasHoy: Number(ventasHoy._sum.total || 0)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const abrirCaja = async (req, res) => {
    const { monto_inicial } = req.body;
    const usuario_id = req.usuario ? req.usuario.id : 1;
    try {
        const existente = await prisma.sesionCaja.findFirst({
            where: { usuario_id, estado: 'ABIERTA' }
        });
        if (existente) return res.status(400).json({ error: 'Ya tienes una caja abierta.' });
        const nuevaSesion = await prisma.sesionCaja.create({
            data: { monto_inicial: parseFloat(monto_inicial) || 0, usuario_id }
        });
        res.status(201).json({ mensaje: 'Caja abierta con exito', sesion: nuevaSesion });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const registrarGasto = async (req, res) => {
    const { descripcion, monto } = req.body;
    const usuario_id = req.usuario ? req.usuario.id : 1;
    try {
        const sesionActiva = await prisma.sesionCaja.findFirst({
            where: { usuario_id, estado: 'ABIERTA' }
        });
        if (!sesionActiva) return res.status(400).json({ error: 'Debes abrir la caja primero.' });
        const nuevoGasto = await prisma.gasto.create({
            data: { 
                descripcion, 
                monto: parseFloat(monto), 
                usuario_id,
                sesion_id: sesionActiva.id 
            }
        });
        res.status(201).json({ mensaje: 'Gasto registrado', gasto: nuevoGasto });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const obtenerCierreCaja = async (req, res) => {
    const { id } = req.params;
    try {
        const sesion = await prisma.sesionCaja.findUnique({
            where: { id: Number(id) },
            include: { usuario: true }
        });
        if (!sesion) return res.status(404).json({ error: "No existe la sesion" });

        const [ventas, gastos] = await Promise.all([
            prisma.venta.findMany({ where: { sesion_id: Number(id), estado: 'ACTIVA' } }),
            prisma.gasto.findMany({ where: { sesion_id: Number(id) } })
        ]);

        const ingresosTotales = ventas.reduce((acc, v) => acc + Number(v.total), 0);
        const salidasGastos = gastos.reduce((acc, g) => acc + Number(g.monto), 0);

        const detalle = {
            EFECTIVO: ventas.filter(v => v.metodo_pago === 'EFECTIVO').reduce((acc, v) => acc + Number(v.total), 0),
            YAPE: ventas.filter(v => v.metodo_pago === 'YAPE').reduce((acc, v) => acc + Number(v.total), 0),
            VISA: ventas.filter(v => v.metodo_pago === 'VISA').reduce((acc, v) => acc + Number(v.total), 0)
        };

        res.json({
            ...sesion,
            ingresos_totales: ingresosTotales,
            salidas_gastos: salidasGastos,
            efectivo_esperado: (Number(sesion.monto_inicial) + detalle.EFECTIVO) - salidasGastos,
            efectivo_real: Number(sesion.monto_final_real || 0),
            EFECTIVO: detalle.EFECTIVO,
            YAPE: detalle.YAPE,
            VISA: detalle.VISA
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// CERRAR CAJA - VERSION CORREGIDA
const cerrarCaja = async (req, res) => {
    try {
        // 1. Extraer dinero fisico del prompt
        let dineroFisico = 0;
        if (req.body.monto_final_real !== undefined) dineroFisico = req.body.monto_final_real;
        else if (req.body.monto_final !== undefined) dineroFisico = req.body.monto_final;
        else if (req.body.efectivo_real !== undefined) dineroFisico = req.body.efectivo_real;
        
        dineroFisico = parseFloat(dineroFisico) || 0;

        // 2. Identificar usuario
        const usuario_id = req.usuario?.id || req.usuario || 1;

        // 3. Buscar sesion activa
        const sesion = await prisma.sesionCaja.findFirst({
            where: { usuario_id: parseInt(usuario_id), estado: 'ABIERTA' }
        });

        if (!sesion) {
            return res.status(404).json({ error: "No hay sesion abierta." });
        }

        // 4. Buscar VENTAS de esta sesion
        const ventas = await prisma.venta.findMany({
            where: { sesion_id: sesion.id, estado: 'ACTIVA' }
        });

        // 5. Buscar GASTOS de esta sesion
        const gastos = await prisma.gasto.findMany({
            where: { sesion_id: sesion.id }
        });

        // 6. Calcular totales por metodo
        const totalEfectivo = ventas
            .filter(v => v.metodo_pago === 'EFECTIVO')
            .reduce((s, v) => s + (Number(v.total) || 0), 0);
            
        const totalYape = ventas
            .filter(v => v.metodo_pago === 'YAPE')
            .reduce((s, v) => s + (Number(v.total) || 0), 0);
            
        const totalVisa = ventas
            .filter(v => v.metodo_pago === 'VISA')
            .reduce((s, v) => s + (Number(v.total) || 0), 0);
            
        const totalGastos = gastos.reduce((s, g) => s + (Number(g.monto) || 0), 0);

        // 7. Calcular totales finales
        const totalDigitales = totalYape + totalVisa;
        const totalVendido = totalEfectivo + totalDigitales;
        const montoEsperadoEfectivo = (Number(sesion.monto_inicial) || 0) + totalEfectivo - totalGastos;
        const diferencia = dineroFisico - montoEsperadoEfectivo;

        // 8. Guardar en BD
        await prisma.sesionCaja.update({
            where: { id: sesion.id },
            data: {
                estado: 'CERRADA',
                fecha_cierre: new Date(),
                monto_final_real: dineroFisico,
                monto_final_esperado: montoEsperadoEfectivo
            }
        });

        // 9. Responder con todo el desglose
        res.json({
            mensaje: "Caja cerrada exitosamente",
            resumen: {
                vendedor: req.usuario?.nombre || 'Usuario',
                fecha: new Date(),
                fondoInicial: Number(sesion.monto_inicial) || 0,
                ventasEfectivo: totalEfectivo,
                ventasYape: totalYape,
                ventasVisa: totalVisa,
                totalDigitales: totalDigitales,
                gastos: totalGastos,
                montoEsperado: montoEsperadoEfectivo,
                montoReal: dineroFisico,
                diferencia: diferencia,
                totalVendido: totalVendido
            }
        });

    } catch (error) {
        console.error("ERROR CRITICO AL CERRAR CAJA:", error);
        res.status(500).json({ error: error.message });
    }
};

// HISTORIAL - VERSION CORREGIDA
const obtenerHistorialCajas = async (req, res) => {
    try {
        const sesiones = await prisma.sesionCaja.findMany({
            where: { estado: 'CERRADA' },
            include: { usuario: { select: { nombre: true } } },
            orderBy: { fecha_apertura: 'desc' }
        });

        const sesionesConDetalle = await Promise.all(sesiones.map(async (s) => {
            const ventas = await prisma.venta.findMany({
                where: { sesion_id: s.id, estado: 'ACTIVA' }
            });
            
            const gastos = await prisma.gasto.aggregate({
                _sum: { monto: true },
                where: { sesion_id: s.id }
            });

            const EFECTIVO = ventas
                .filter(v => v.metodo_pago === 'EFECTIVO')
                .reduce((a, v) => a + (Number(v.total) || 0), 0);
            
            const YAPE = ventas
                .filter(v => v.metodo_pago === 'YAPE')
                .reduce((a, v) => a + (Number(v.total) || 0), 0);
            
            const VISA = ventas
                .filter(v => v.metodo_pago === 'VISA')
                .reduce((a, v) => a + (Number(v.total) || 0), 0);
            
            const ingresos_totales = EFECTIVO + YAPE + VISA;
            const salidas_gastos = Number(gastos._sum?.monto || 0);
            const efectivo_esperado = (Number(s.monto_inicial) || 0) + EFECTIVO - salidas_gastos;

            return {
                ...s,
                EFECTIVO,
                YAPE,
                VISA,
                ingresos_totales,
                salidas_gastos,
                efectivo_esperado,
                efectivo_real: Number(s.monto_final_real || 0),
                monto_esperado: efectivo_esperado
            };
        }));

        res.json(sesionesConDetalle);
    } catch (error) {
        console.error("ERROR en historial:", error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = { estadoCaja, abrirCaja, registrarGasto, obtenerCierreCaja, cerrarCaja, obtenerHistorialCajas };