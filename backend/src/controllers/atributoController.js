const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ==================== CATEGORÍAS ====================

// Obtener todas las categorías
const obtenerCategorias = async (req, res) => {
    try {
        const categorias = await prisma.categoria.findMany({
            orderBy: { nombre: 'asc' }
        });
        res.json(categorias);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener categorías' });
    }
};

// Crear nueva categoría
const crearCategoria = async (req, res) => {
    const { nombre } = req.body;
    
    if (!nombre || nombre.trim() === "") {
        return res.status(400).json({ error: "El nombre de la categoría es obligatorio" });
    }
    
    try {
        const categoria = await prisma.categoria.create({
            data: { nombre: nombre.trim() }
        });
        res.status(201).json({ message: "Categoría creada", categoria });
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: "Ya existe una categoría con ese nombre" });
        }
        res.status(500).json({ error: "Error al crear categoría" });
    }
};

// Actualizar categoría
const actualizarCategoria = async (req, res) => {
    const { id } = req.params;
    const { nombre } = req.body;
    
    if (!nombre || nombre.trim() === "") {
        return res.status(400).json({ error: "El nombre de la categoría es obligatorio" });
    }
    
    try {
        const categoriaActualizada = await prisma.categoria.update({
            where: { id: parseInt(id) },
            data: { nombre: nombre.trim() }
        });
        res.json({ message: "Categoría actualizada con éxito", categoria: categoriaActualizada });
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: "Ya existe una categoría con ese nombre" });
        }
        res.status(500).json({ error: "Error al actualizar la categoría" });
    }
};

// Eliminar categoría (con validación de uso)
const eliminarCategoria = async (req, res) => {
    const { id } = req.params;
    
    try {
        const enUso = await prisma.producto.count({
            where: { categoria_id: parseInt(id) }
        });

        if (enUso > 0) {
            return res.status(400).json({ 
                error: `No se puede eliminar. Hay ${enUso} producto(s) registrados bajo esta categoría.` 
            });
        }

        await prisma.categoria.delete({ where: { id: parseInt(id) } });
        res.json({ message: "Categoría eliminada del sistema." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al eliminar la categoría" });
    }
};

// ==================== COLORES ====================

// Obtener todos los colores
const obtenerColores = async (req, res) => {
    try {
        const colores = await prisma.color.findMany({
            orderBy: { nombre: 'asc' }
        });
        res.json(colores);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener colores' });
    }
};

// Crear nuevo color
const crearColor = async (req, res) => {
    const { nombre } = req.body;
    
    if (!nombre || nombre.trim() === "") {
        return res.status(400).json({ error: "El nombre del color es obligatorio" });
    }
    
    try {
        const color = await prisma.color.create({
            data: { nombre: nombre.trim() }
        });
        res.status(201).json({ message: "Color creado", color });
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: "Ya existe un color con ese nombre" });
        }
        res.status(500).json({ error: "Error al crear color" });
    }
};

// Actualizar color
const actualizarColor = async (req, res) => {
    const { id } = req.params;
    const { nombre } = req.body;
    
    if (!nombre || nombre.trim() === "") {
        return res.status(400).json({ error: "El nombre del color es obligatorio" });
    }
    
    try {
        const colorActualizado = await prisma.color.update({
            where: { id: parseInt(id) },
            data: { nombre: nombre.trim() }
        });
        res.json({ message: "Color actualizado con éxito", color: colorActualizado });
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: "Ya existe un color con ese nombre" });
        }
        res.status(500).json({ error: "Error al actualizar el color" });
    }
};

// Eliminar color (con validación de uso)
const eliminarColor = async (req, res) => {
    const { id } = req.params;
    
    try {
        const enUso = await prisma.producto.count({
            where: { color_id: parseInt(id) }
        });

        if (enUso > 0) {
            return res.status(400).json({ 
                error: `No se puede eliminar. Hay ${enUso} producto(s) registrados con este color.` 
            });
        }

        await prisma.color.delete({ where: { id: parseInt(id) } });
        res.json({ message: "Color eliminado del sistema." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al eliminar el color" });
    }
};

module.exports = {
    obtenerCategorias,
    crearCategoria,
    actualizarCategoria,
    eliminarCategoria,
    obtenerColores,
    crearColor,
    actualizarColor,
    eliminarColor
};