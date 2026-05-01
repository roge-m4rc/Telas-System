const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener Categorías
router.get('/categorias', async (req, res) => {
    const cats = await prisma.categoria.findMany();
    res.json(cats);
});

// Crear Categoría
router.post('/categorias', async (req, res) => {
    try {
        const nueva = await prisma.categoria.create({ data: { nombre: req.body.nombre } });
        res.json(nueva);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

// Obtener Colores
router.get('/colores', async (req, res) => {
    const cols = await prisma.color.findMany();
    res.json(cols);
});

// Crear Color
router.post('/colores', async (req, res) => {
    try {
        const nuevo = await prisma.color.create({ data: { nombre: req.body.nombre } });
        res.json(nuevo);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

module.exports = router;