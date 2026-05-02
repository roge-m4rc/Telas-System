const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. VERIFICAR ESTADO DE LA CAJA
const estadoCaja = async (req, res) => {
    const usuario_id = req.usuario ? req.usuario.id : 1; 
    try {
        const sesion = await prisma.sesionCaja.findFirst({
            where: { usuario_id, estado: 'ABIERTA' }
        });
        res.json({ abierta: !!sesion, sesion });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. ABRIR CAJA
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
        res.status(201).json({ mensaje: 'Caja abierta con éxito', sesion: nuevaSesion });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. REGISTRAR GASTO
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
        res.status(201).json({ mensaje: '✅ Gasto registrado', gasto: nuevoGasto });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// 4. VER RESUMEN DE CIERRE (La función que causaba el error 404/Crash)
const obtenerCierreCaja = async (req, res) => {
    const usuario_id = req.usuario ? req.usuario.id : 1;
    const { id } = req.params;
    try {
        const sesion = await prisma.sesionCaja.findFirst({
            where: { 
                OR: [
                    { id: id ? Number(id) : undefined },
                    { usuario_id: Number(usuario_id), estado: 'ABIERTA' }
                ]
            },
            orderBy: { id: 'desc' }
        });

        if (!sesion) return res.status(400).json({ error: 'No se encontró la sesión.' });

        // Obtenemos todas las ventas de la sesión
        // LOG DE CONTROL: ¿Qué sesión estamos mirando?
        console.log(`Buscando ventas para Sesion ID: ${sesion.id}`);

        const ventasSesion = await prisma.venta.findMany({
            where: { 
                sesion_id: Number(sesion.id),
                estado: 'ACTIVA' 
            }
        });

        // LOG DE CONTROL: ¿Cuántas ventas encontró Prisma?
        console.log(`Ventas encontradas en DB: ${ventasSesion.length}`);
        if (ventasSesion.length > 0) {
            console.log(`Primer método de pago detectado: ${ventasSesion[0].metodo_pago}`);
        }

        const resumenPagos = {
            EFECTIVO: ventasSesion
                .filter(v => v.metodo_pago.toUpperCase() === 'EFECTIVO')
                .reduce((s, v) => s + Number(v.total), 0),
            YAPE: ventasSesion
                .filter(v => ['YAPE', 'PLIN'].includes(v.metodo_pago.toUpperCase()))
                .reduce((s, v) => s + Number(v.total), 0),
            VISA: ventasSesion
                .filter(v => ['VISA', 'TARJETA'].includes(v.metodo_pago.toUpperCase()))
                .reduce((s, v) => s + Number(v.total), 0),
        };

        const totalVentas = ventasSesion.reduce((s, v) => s + Number(v.total), 0);

        const gastos = await prisma.gasto.aggregate({
            _sum: { monto: true },
            where: { sesion_id: sesionActiva.id }
        });

        const totalGastos = gastos._sum.monto || 0;
        // El saldo físico en caja solo cuenta Efectivo + Monto Inicial - Gastos
        const saldoEnEfectivo = sesionActiva.monto_inicial + resumenPagos.EFECTIVO - totalGastos;

        res.json({
            ingresos_totales: totalVentas,
            detalle_pagos: resumenPagos,
            salidas_gastos: totalGastos,
            monto_inicial: sesionActiva.monto_inicial,
            efectivo_esperado: saldoEnEfectivo // Esto es lo que debe haber en el cajón
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 5. CERRAR CAJA DEFINITIVAMENTE
const cerrarCaja = async (req, res) => {
    console.log("📦 DATOS RECIBIDOS PARA CERRAR CAJA:", req.body);
    
    try {
        // Atrapamos el dinero físico, venga como venga del frontend (para evitar el NaN)
        const dineroFisico = req.body.monto_final_real ?? req.body.monto_final ?? 0;
        
        const usuario_id = req.usuario?.id || req.usuario || 1; 

        const sesion = await prisma.sesionCaja.findFirst({
            where: { usuario_id: parseInt(usuario_id), estado: 'ABIERTA' }
        });

        if (!sesion) return res.status(404).json({ error: "No hay sesión abierta." });

        // 📊 CALCULAMOS EL RESUMEN DEL DÍA/TURNO
        const ventas = await prisma.venta.findMany({
            where: { sesion_id: sesion.id, estado: 'ACTIVA' }
        });

        const gastos = await prisma.gasto.findMany({
            where: { sesion_id: sesion.id }
        });

        const totalEfectivo = ventas.filter(v => v.metodo_pago === 'EFECTIVO').reduce((s, v) => s + v.total, 0);
        const totalYape = ventas.filter(v => v.metodo_pago === 'YAPE').reduce((s, v) => s + v.total, 0);
        const totalVisa = ventas.filter(v => v.metodo_pago === 'VISA').reduce((s, v) => s + v.total, 0);
        const totalGastos = gastos.reduce((s, g) => s + g.monto, 0);

        const montoEsperado = sesion.monto_inicial + totalEfectivo - totalGastos;

        // 🚨 EL ARREGLO: Usamos los nombres exactos de tu tabla SesionCaja
        await prisma.sesionCaja.update({
            where: { id: sesion.id },
            data: {
                estado: 'CERRADA',
                fecha_cierre: new Date(),
                monto_final_real: parseFloat(dineroFisico),     // Lo que contó el vendedor
                monto_final_esperado: montoEsperado             // Lo que el sistema calculó
            }
        });

        // Enviamos el ticket al frontend
        res.json({
            mensaje: "Caja cerrada exitosamente",
            resumen: {
                vendedor: req.usuario?.nombre || 'Usuario',
                fecha: new Date(),
                fondoInicial: sesion.monto_inicial,
                ventasEfectivo: totalEfectivo,
                ventasYape: totalYape,
                ventasVisa: totalVisa,
                gastos: totalGastos,
                montoEsperado: montoEsperado,
                montoReal: parseFloat(dineroFisico),
                diferencia: parseFloat(dineroFisico) - montoEsperado
            }
        });

    } catch (error) {
        console.error("🚨 ERROR CRÍTICO AL CERRAR CAJA:", error);
        res.status(500).json({ error: error.message });
    }
};
const obtenerHistorialCajas = async (req, res) => {
    try {
        // CORRECCIÓN: El modelo real es sesionCaja
        const historial = await prisma.sesionCaja.findMany({
            orderBy: { fecha_apertura: 'desc' }, 
            // Si tienes relación con la tabla usuario, la incluimos
            include: { usuario: true } 
        });

        // Formateamos los datos para que coincidan con lo que espera el Frontend
        const historialFormateado = historial.map(c => ({
            id: c.id,
            fecha_apertura: c.fecha_apertura,
            fecha_cierre: c.fecha_cierre,
            monto_inicial: c.monto_inicial,
            monto_esperado: c.monto_final_esperado, // Mapeado al nombre de tu BD
            monto_final: c.monto_final_real,       // Mapeado al nombre de tu BD
            usuario: c.usuario
        }));

        res.json(historialFormateado);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener historial de cajas' });
    }
};

// 👇 EXPORTACIÓN COMPLETA REPARADA
module.exports = { 
    estadoCaja, 
    abrirCaja, 
    registrarGasto, 
    obtenerCierreCaja, 
    cerrarCaja, 
    obtenerHistorialCajas // <- ¡Faltaba agregarla aquí!
};