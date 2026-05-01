const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const obtenerConfiguracion = async (req, res) => {
    try {
        let config = await prisma.configuracion.findUnique({ where: { id: 1 } });
        
        if (!config) {
            config = await prisma.configuracion.create({
                data: {
                    id: 1,
                    nombre_empresa: 'Mi Tienda de Telas',
                    ruc: '20000000000',
                    direccion: 'Dirección, Ciudad, Perú',
                    porcentaje_impuesto: 0.18
                }
            });
        }
        res.json(config);
    } catch (error) {
        console.error("Error en config:", error);
        res.status(200).json({ simbolo: 'S/', porcentaje_impuesto: 0.18, nombre_empresa: 'Error al cargar' });
    }
};

const actualizarConfiguracion = async (req, res) => {
    const { nombre_empresa, ruc, direccion, telefono, moneda, simbolo, nombre_impuesto, porcentaje_impuesto } = req.body;
    try {
        const config = await prisma.configuracion.upsert({
            where: { id: 1 },
            update: { 
                nombre_empresa, ruc, direccion, telefono, moneda, simbolo, nombre_impuesto, 
                porcentaje_impuesto: parseFloat(porcentaje_impuesto) 
            },
            create: { 
                id: 1, nombre_empresa, ruc, direccion, telefono, moneda, simbolo, nombre_impuesto, 
                porcentaje_impuesto: parseFloat(porcentaje_impuesto) 
            }
        });
        res.json({ mensaje: 'Configuración actualizada', config });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar' });
    }
};

module.exports = { obtenerConfiguracion, actualizarConfiguracion };