import { useState } from 'react';

export default function Sidebar({ usuario, setVista, vistaActual, onLogout }) {
    // 1. Estado local para saber si el menú está ancho o delgado
    const [expandido, setExpandido] = useState(true);

    const menuItems = [
        { id: 'dashboard', nombre: 'Inicio', icono: '🏠' },
        { id: 'punto-venta', nombre: 'Caja y Ventas', icono: '🛒' },
        { id: 'inventario', nombre: 'Inventario', icono: '📦' },
        { id: 'ventas', nombre: 'Historial', icono: '📄' },
        { id: 'clientes', nombre: 'Clientes', icono: '👥' },
        { id: 'reportes', nombre: 'Reportes', icono: '📊' },
    ];

    const ajustesItems = [
        { id: 'kardex', nombre: 'Movimientos Kardex', icono: '📈' },
        { id: 'admin', nombre: 'Panel de Usuarios', icono: '👤' },
        { id: 'configuracion', nombre: 'Configuración', icono: '⚙️' },
    ];

    const esAdmin = usuario?.rol === 'Administrador';

    return (
        <aside className={`relative bg-slate-900 text-white min-h-screen transition-all duration-300 flex flex-col ${expandido ? 'w-64' : 'w-20'}`}>
            
            {/* BOTÓN PARA COLAPSAR (Solo visible en Desktop) */}
            <button 
                onClick={() => setExpandido(!expandido)}
                className="hidden lg:flex absolute -right-3 top-12 bg-blue-600 rounded-full w-6 h-6 items-center justify-center border-2 border-slate-900 text-[10px] z-50 hover:scale-110 transition-transform"
            >
                {expandido ? '◀' : '▶'}
            </button>

            {/* LOGO / TÍTULO */}
            <div className="p-6 mb-4">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-2 rounded-xl text-xl">🚀</div>
                    {expandido && (
                        <div>
                            <h1 className="font-black text-xl tracking-tighter leading-none">Sistema</h1>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Gestión Textil</p>
                        </div>
                    )}
                </div>
            </div>

            {/* NAVEGACIÓN PRINCIPAL */}
            <nav className="flex-1 px-3 space-y-1">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setVista(item.id)}
                        className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all ${
                            vistaActual === item.id 
                            ? 'bg-blue-600 shadow-lg shadow-blue-900/40 text-white' 
                            : 'hover:bg-slate-800/50 text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <span className="text-xl">{item.icono}</span>
                        {expandido && <span className="font-bold text-sm whitespace-nowrap">{item.nombre}</span>}
                    </button>
                ))}

                {/* SECCIÓN ADMIN (Si colapsa, solo mostramos una línea divisoria) */}
                {esAdmin && (
                    <>
                        <div className="my-4 border-t border-slate-800 mx-2" />
                        {expandido && <p className="px-4 mb-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Ajustes Avanzados</p>}
                        
                        {ajustesItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setVista(item.id)}
                                className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all ${
                                    vistaActual === item.id 
                                    ? 'bg-blue-600 text-white' 
                                    : 'hover:bg-slate-800/50 text-slate-400'
                                }`}
                            >
                                <span className="text-xl">{item.icono}</span>
                                {expandido && <span className="font-bold text-sm whitespace-nowrap">{item.nombre}</span>}
                            </button>
                        ))}
                    </>
                )}
            </nav>

            {/* BOTÓN SALIR */}
            <div className="p-4 border-t border-slate-800">
                <button 
                    onClick={onLogout}
                    className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-red-500/10 text-red-400 transition-all group"
                >
                    <span className="text-xl group-hover:scale-110 transition-transform">🚪</span>
                    {expandido && <span className="font-bold text-sm">Salir del Sistema</span>}
                </button>
            </div>
        </aside>
    );
}