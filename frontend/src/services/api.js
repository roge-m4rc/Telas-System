import axios from 'axios';

const api = axios.create({
    baseURL: 'https://telas-system.onrender.com',
});

// 1. INTERCEPTOR DE REQUEST: Añade el Token a cada petición
api.interceptors.request.use(
    (config) => {
        // Buscamos primero si el token se guardó suelto (Como lo hace tu Login)
        const token = localStorage.getItem('token');
        
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        } else {
            // Plan B: Por si acaso está guardado dentro del objeto usuario
            const usuarioString = localStorage.getItem('usuario');
            if (usuarioString) {
                try {
                    const usuario = JSON.parse(usuarioString);
                    if (usuario && usuario.token) {
                        config.headers.Authorization = `Bearer ${usuario.token}`;
                    }
                } catch (e) {
                    console.error("Error leyendo token:", e);
                }
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// 2. INTERCEPTOR DE RESPONSE: Atrapa errores 401/403 (Token vencido)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            console.warn("Sesión expirada o sin permisos. Cerrando sesión...");
            localStorage.removeItem('usuario'); // Limpiamos solo el usuario
            localStorage.removeItem('token');
            window.location.href = '/login'; // Redirigimos sin recargar toda la caché
        }
        return Promise.reject(error);
    }
);

// --- FUNCIONES DE AUTENTICACIÓN ---
export const loginUsuario = async (credenciales) => {
    try {
        const respuesta = await api.post('/auth/login', credenciales);
        return respuesta.data;
    } catch (error) {
        throw error.response?.data?.error || "Error de conexión";
    }
};

export const crearUsuario = async (datosUsuario) => {
    try {
        const respuesta = await api.post('/auth/registrar', datosUsuario);
        return respuesta.data;
    } catch (error) {
        throw error.response?.data?.error || "Error al crear usuario";
    }
};
export const actualizarUsuario = async (id, datosUsuario) => {
    // Le agregamos el /auth/ antes de usuarios
    const response = await api.put(`/auth/usuarios/${id}`, datosUsuario); 
    return response.data;
};
export const obtenerUsuarios = async () => {
    const res = await api.get('/auth/usuarios'); 
    return res.data;
};

export const cambiarEstadoUsuario = async (id, estado) => {
    const res = await api.patch(`/auth/usuarios/${id}/estado`, { activo: estado });
    return res.data;
};

// --- FUNCIONES DE PRODUCTOS ---
export const obtenerProductos = async () => {
    try { const res = await api.get('/productos'); return res.data; } 
    catch (e) { return []; }
};

export const crearProducto = async (nuevoProducto) => {
    const res = await api.post('/productos', nuevoProducto); return res.data;
};

export const actualizarProducto = async (id, datos) => {
    const res = await api.put(`/productos/${id}`, datos);
    return res.data;
};

export const eliminarProducto = async (id) => {
    const res = await api.delete(`/productos/${id}`);
    return res.data;
};

// --- FUNCIONES DE CLIENTES ---
export const obtenerClientes = async () => {
    try { const res = await api.get('/clientes'); return res.data; } 
    catch (e) { return []; }
};

export const crearCliente = async (datosCliente) => {
    const res = await api.post('/clientes', datosCliente); return res.data;
};

export const actualizarCliente = async (id, datosCliente) => {
    const res = await api.put(`/clientes/${id}`, datosCliente); return res.data;
};

export const eliminarCliente = async (id) => {
    const res = await api.delete(`/clientes/${id}`); return res.data;
};

// --- FUNCIONES DE VENTAS Y AUDITORIA ---
export const registrarVenta = async (datosVenta) => {
    try {
        const res = await api.post('/ventas', datosVenta);
        return res.data;
    } catch (error) {
        throw error.response?.data?.error || "Error al procesar la venta";
    }
};

export const obtenerHistorialVentas = async () => {
    const res = await api.get('/ventas');
    return res.data;
};

export const obtenerLogs = async () => {
    try {
        const respuesta = await api.get('/auditoria');
        return respuesta.data;
    } catch (error) {
        console.error("Error al obtener logs:", error);
        return [];
    }
};

// --- GESTIÓN DE ATRIBUTOS ---
export const obtenerCategorias = async () => {
    const res = await api.get('/opciones/categorias');
    return res.data;
};

export const crearCategoria = async (nombre) => {
    const res = await api.post('/opciones/categorias', { nombre });
    return res.data;
};

export const obtenerColores = async () => {
    const res = await api.get('/opciones/colores');
    return res.data;
};

export const crearColor = async (nombre) => {
    const res = await api.post('/opciones/colores', { nombre });
    return res.data;
};

export default api;