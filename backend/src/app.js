const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') }); 

// 1. IMPORTACIONES (Todas agrupadas y sin repetir)
const authRoutes = require('./routes/authRoutes');
const opcionesRoutes = require('./routes/opcionesRoutes');
const configRoutes = require('./routes/configRoutes');
const auditoriaRoutes = require('./routes/auditoriaRoutes');
const clienteRoutes = require('./routes/clienteRoutes');
const productoRoutes = require('./routes/productoRoutes');
const ventaRoutes = require('./routes/ventaRoutes'); 

const app = express();

// 2. MIDDLEWARES GLOBALES
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// 3. RUTA BASE
app.get('/', (req, res) => {
    res.send('API del Sistema de Inventario de Telas funcionando 🚀');
});

// 4. REGISTRO DE RUTAS DE LA API (Todas juntas para mantener el orden)
app.use('/api/auth', authRoutes);
app.use('/api/opciones', opcionesRoutes);
app.use('/api/configuracion', configRoutes);
app.use('/api/auditoria', auditoriaRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/ventas', ventaRoutes);

// 5. ENCENDIDO DEL SERVIDOR (¡Siempre debe ser lo último del archivo!)
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});