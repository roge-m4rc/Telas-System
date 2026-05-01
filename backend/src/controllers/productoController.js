const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. OBTENER PRODUCTOS ACTIVOS
const obtenerProductos = async (req, res) => {
    try {
        const productos = await prisma.producto.findMany({
            where: { activo: true },
            orderBy: { nombre: 'asc' },
            // ✨ AQUÍ ESTÁ LA MAGIA: Le decimos a Prisma que incluya los datos de las tablas relacionadas
            include: {
                categoria: true,
                color: true
            }
        });
        res.json(productos);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener productos' });
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
        await prisma.producto.update({
            where: { id: parseInt(id) },
            data: { activo: false }
        });
        res.json({ mensaje: 'Producto eliminado' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar producto' });
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
                activo: true,       // 👻 ¡El escudo anti-fantasmas!
                stock: { lt: 15 }   // Avisa si baja de 15 metros
            },
            orderBy: {
                stock: 'asc'        // Ordena para que los más vacíos salgan primero
            },
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
        console.error(e);
        res.status(500).json({ error: e.message });
    }
};

module.exports = {
    obtenerProductos,
    crearProducto,
    actualizarProducto,
    eliminarProducto,
    obtenerResumenDashboard
};