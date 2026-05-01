const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function poblarCatalogos() {
    try {
        console.log("⏳ Inyectando catálogo base...");

        // Inyectamos categorías base
        await prisma.categoria.createMany({
            data: [
                { nombre: 'Algodón' },
                { nombre: 'Seda' },
                { nombre: 'Lino' },
                { nombre: 'Poliéster' },
                { nombre: 'Denim / Jean' }
            ]
        });

        // Inyectamos colores base
        await prisma.color.createMany({
            data: [
                { nombre: 'Blanco' },
                { nombre: 'Negro' },
                { nombre: 'Azul Marino' },
                { nombre: 'Rojo Carmesí' },
                { nombre: 'Beige' }
            ]
        });

        console.log("✅ ¡Categorías y Colores inyectados con éxito!");
    } catch (error) {
        console.error("❌ Error (probablemente ya existían):", error.message);
    } finally {
        await prisma.$disconnect();
    }
}

poblarCatalogos();