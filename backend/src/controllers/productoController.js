const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. OBTENER PRODUCTOS ACTIVOS
const obtenerProductos = async (req, res) => {
    try {
        const productos = await prisma.producto.findMany({
            where: { 
                activo: true   // 👈 FILTRO CLAVE: solo productos activos
            },
            orderBy: { nombre: 'asc' },
            include: {
                categoria: true,
                color: true
            }
        });
        res.json(productos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener productos' });
    }
};
// OBTENER PRODUCTOS INACTIVOS (dados de baja)
const obtenerProductosInactivos = async (req, res) => {
    try {
        const productos = await prisma.producto.findMany({
            where: { 
                activo: false
            },
            orderBy: { nombre: 'asc' },
            include: {
                categoria: true,
                color: true
            }
        });
        res.json(productos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener productos inactivos' });
    }
};

// REACTIVAR PRODUCTO (volver a poner activo: true)
const reactivarProducto = async (req, res) => {
    const { id } = req.params;
    
    try {
        const producto = await prisma.producto.update({
            where: { id: parseInt(id) },
            data: { activo: true }
        });
        res.json({ message: "Producto reactivado correctamente", producto });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al reactivar producto" });
    }
};

// 2. CREAR PRODUCTO
const crearProducto = async (req, res) => {
    console.log("📦 DATOS RECIBIDOS DEL FORMULARIO:", req.body);

    const { nombre, precio, stock, categoria_id, color_id } = req.body;
    
    try {
        const nuevoProducto = await prisma.producto.create({
            data: { 
                nombre, 
                precio: parseFloat(precio), 
                stock: parseInt(stock, 10),
                categoria_id: parseInt(categoria_id, 10),
                color_id: color_id ? parseInt(color_id, 10) : null 
            }
        });
        
        res.status(201).json(nuevoProducto);
        
    } catch (error) {
        console.error("🚨 ERROR CRÍTICO EN PRISMA:", error);
        res.status(500).json({ error: error.message || 'Error al crear producto' });
    }
};

// 3. ACTUALIZAR PRODUCTO (Reparado para que guarde categoría y color)
const actualizarProducto = async (req, res) => {
    const { id } = req.params;
    // Extraemos TODA la info, no solo nombre, precio y stock
    const { nombre, precio, stock, categoria_id, color_id } = req.body; 
    
    try {
        const productoActualizado = await prisma.producto.update({
            where: { id: parseInt(id) },
            data: {
                nombre,
                precio: parseFloat(precio),
                stock: parseFloat(stock),
                categoria_id: categoria_id ? parseInt(categoria_id, 10) : null,
                color_id: color_id ? parseInt(color_id, 10) : null
            }
        });
        res.json({ mensaje: 'Producto actualizado', producto: productoActualizado });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar producto' });
    }
};

// 4. ELIMINACIÓN LÓGICA
const eliminarProducto = async (req, res) => {
    const { id } = req.params;

    try {
        // 1. Verificar si el producto tiene movimientos en el Kardex
        const cantidadMovimientos = await prisma.movimiento.count({
            where: { producto_id: parseInt(id) }
        });

        // 2. Verificar si el producto tiene ventas registradas (detalles)
        const cantidadVentas = await prisma.detalleVenta.count({
            where: { producto_id: parseInt(id) }
        });

        // 3. Decisión: si tiene historial, solo dar de baja; si no, eliminar físicamente
        if (cantidadMovimientos > 0 || cantidadVentas > 0) {
            // 🔄 BAJA LÓGICA: Conservar historial
            const productoActualizado = await prisma.producto.update({
                where: { id: parseInt(id) },
                data: { activo: false }
            });
            
            console.log(`📦 Producto #${id} dado de baja (tenía ${cantidadMovimientos} movimientos y ${cantidadVentas} ventas)`);
            
            return res.json({ 
                message: "Producto dado de baja. Se conservó su historial en el sistema.",
                producto: productoActualizado,
                bajaLogica: true
            });
        } else {
            // 🗑️ ELIMINACIÓN FÍSICA: Producto nuevo sin historial
            const productoEliminado = await prisma.producto.delete({
                where: { id: parseInt(id) }
            });
            
            console.log(`🗑️ Producto #${id} eliminado físicamente (no tenía historial)`);
            
            return res.json({ 
                message: "Producto eliminado por completo del inventario.",
                producto: productoEliminado,
                bajaLogica: false
            });
        }
    } catch (error) {
        console.error("Error al eliminar producto:", error);
        res.status(500).json({ error: "Error al procesar la eliminación del producto" });
    }
};

// 5. RESUMEN DASHBOARD INTELIGENTE
const obtenerResumenDashboard = async (req, res) => {
    try {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

        // Ventas de Hoy
        const ventasHoy = await prisma.venta.aggregate({
            where: { fecha: { gte: hoy }, estado: 'ACTIVA' },
            _sum: { total: true },
            _count: { id: true }
        });

        // Ventas del Mes
        const ventasMes = await prisma.venta.aggregate({
            where: { fecha: { gte: primerDiaMes }, estado: 'ACTIVA' },
            _sum: { total: true }
        });

        // Stock Crítico
        const alertasStock = await prisma.producto.findMany({
            where: { 
                activo: true,
                stock: { lt: 15 }
            },
            orderBy: { stock: 'asc' },
            select: { nombre: true, stock: true }
        });

        // Gráfico 7 días
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

const obtenerMovimientosConFiltros = async (req, res) => {
    const { fechaInicio, fechaFin, tipo, busqueda } = req.query;
    
    try {
        // Construir el filtro dinámicamente
        let whereClause = {};
        
        // Filtro por fechas
        if (fechaInicio && fechaFin) {
            const inicio = new Date(`${fechaInicio}T00:00:00-05:00`);
            const fin = new Date(`${fechaFin}T23:59:59-05:00`);
            whereClause.fecha = { gte: inicio, lte: fin };
        }
        
        // Filtro por tipo
        if (tipo && tipo !== 'TODOS') {
            whereClause.tipo = tipo;
        }
        
        // Filtro por búsqueda (producto o motivo)
        if (busqueda) {
            whereClause.OR = [
                { motivo: { contains: busqueda, mode: 'insensitive' } },
                { producto: { nombre: { contains: busqueda, mode: 'insensitive' } } }
            ];
        }
        
        const movimientos = await prisma.movimiento.findMany({
            where: whereClause,
            include: { producto: { include: { categoria: true } } },
            orderBy: { fecha: 'desc' }
        });
        
        console.log(`📊 Movimientos consultados: ${movimientos.length} registros`);
        res.json(movimientos);
    } catch (error) {
        console.error("Error en obtenerMovimientosConFiltros:", error);
        res.status(500).json({ error: 'Error al obtener movimientos' });
    }
};
module.exports = {
    obtenerProductos,
    obtenerProductosInactivos,      // 
    reactivarProducto,              // 
    obtenerMovimientosConFiltros,   // 
    crearProducto,
    actualizarProducto,
    eliminarProducto,
    obtenerResumenDashboard
};