const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function limpiarBaseDeDatos() {
    console.log("🧹 Iniciando limpieza de producción...");

    try {
        // 1. Borramos detalles de ventas (Nivel 3)
        if (prisma.detalleVenta) await prisma.detalleVenta.deleteMany();
        if (prisma.ventaDetalle) await prisma.ventaDetalle.deleteMany();
        if (prisma.productoVenta) await prisma.productoVenta.deleteMany();
        if (prisma.itemVenta) await prisma.itemVenta.deleteMany();

        // 2. Borramos el KARDEX / Historial de movimientos (Nivel 2)
        // (Agregamos los nombres más comunes, Prisma ignorará los que no existan)
        if (prisma.kardex) await prisma.kardex.deleteMany();
        if (prisma.movimiento) await prisma.movimiento.deleteMany();
        if (prisma.movimientoInventario) await prisma.movimientoInventario.deleteMany();
        if (prisma.historialStock) await prisma.historialStock.deleteMany();

        // 3. Borramos las tablas principales (Nivel 1)
        await prisma.venta.deleteMany();
        await prisma.gasto.deleteMany();
        await prisma.sesionCaja.deleteMany();
        
        // ¡Ahora sí dejará borrar los productos!
        await prisma.producto.deleteMany(); 
        
        await prisma.categoria.deleteMany();
        await prisma.color.deleteMany();
        await prisma.cliente.deleteMany();

        console.log("✅ ¡Base de datos limpia! Lista para producción.");
    } catch (error) {
        console.error("❌ Error al limpiar:", error.message);
        console.log("💡 TIP: Revisa tu schema.prisma. Busca qué tabla se relaciona con 'Producto' (además de los detalles de venta) y ponla arriba de 'producto.deleteMany()'.");
    } finally {
        await prisma.$disconnect();
    }
}

limpiarBaseDeDatos();