const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 3.4 Búsqueda y Filtrado (y listado general)
const obtenerClientes = async (req, res) => {
    try {
        // Traemos solo los activos y adjuntamos su historial de ventas (Punto 3.5)
        const clientes = await prisma.cliente.findMany({
            where: { activo: true },
            include: { 
                ventas: {
                    orderBy: { fecha: 'desc' } // Historial ordenado de más nuevo a más viejo
                } 
            },
            orderBy: { nombre: 'asc' }
        });
        res.json(clientes);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener clientes' });
    }
};

// 3.1 Registro de cliente
const crearCliente = async (req, res) => {
    const { nombre, documento, email, telefono, direccion } = req.body;
    try {
        const nuevoCliente = await prisma.cliente.create({
            data: { nombre, documento, email, telefono, direccion }
        });
        res.status(201).json({ mensaje: 'Cliente registrado', cliente: nuevoCliente });
    } catch (error) {
        // Si el DNI ya existe, Prisma lanza un error P2002
        if (error.code === 'P2002') return res.status(400).json({ error: 'El documento (DNI/RUC) ya está registrado' });
        res.status(500).json({ error: 'Error al crear cliente' });
    }
};

// 3.2 Edición de datos
const actualizarCliente = async (req, res) => {
    const { id } = req.params;
    const { nombre, documento, email, telefono, direccion } = req.body;
    try {
        const clienteActualizado = await prisma.cliente.update({
            where: { id: parseInt(id) },
            data: { nombre, documento, email, telefono, direccion }
        });
        res.json({ mensaje: 'Cliente actualizado', cliente: clienteActualizado });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar cliente' });
    }
};

// 3.3 Eliminación Lógica
const eliminarCliente = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.cliente.update({
            where: { id: parseInt(id) },
            data: { activo: false } // No lo borramos, solo lo ocultamos
        });
        res.json({ mensaje: 'Cliente desactivado correctamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al desactivar cliente' });
    }
};

module.exports = { obtenerClientes, crearCliente, actualizarCliente, eliminarCliente };