const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const obtenerCategorias = async (req, res) => {
    try {
        const categorias = await prisma.categoria.findMany();
        res.json(categorias);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener categorías' });
    }
};

const obtenerColores = async (req, res) => {
    try {
        const colores = await prisma.color.findMany();
        res.json(colores);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener colores' });
    }
};

module.exports = { obtenerCategorias, obtenerColores };