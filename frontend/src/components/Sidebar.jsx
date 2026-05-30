import { useState } from 'react';

export default function Sidebar({ usuario, setVista, vistaActual, onLogout }) {
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
        <div className="h-full flex flex-col bg-slate-900 text-white">
            {/* Logo */}
            <div className="flex-shrink-0 p-4 pt-6">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-2 rounded-xl text-xl">🚀</div>
                    {expandido && (
                        <div>
                            <h1 className="font-black text-lg">Telas System</h1>
                            <p className="text-[8px] text-slate-500 font-bold">Control y Gestión</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Menú navegación - scrollable si es necesario */}
            <div className="flex-1 overflow-y-auto px-3 space-y-1">
                {/* Items principales */}
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setVista(item.id)}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all ${
                            vistaActual === item.id 
                            ? 'bg-blue-600 text-white' 
                            : 'hover:bg-slate-800/50 text-slate-400'
                        }`}
                    >
                        <span className="text-xl">{item.icono}</span>
                        {expandido && <span className="font-bold text-sm">{item.nombre}</span>}
                    </button>
                ))}

                {/* Ajustes (solo admin) */}
                {esAdmin && (
                    <>
                        <div className="my-3 border-t border-slate-800" />
                        {expandido && (
                            <p className="px-2 pt-2 text-[9px] font-black text-slate-500 uppercase">Ajustes Avanzados</p>
                        )}
                        {ajustesItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setVista(item.id)}
                                className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all ${
                                    vistaActual === item.id 
                                    ? 'bg-blue-600 text-white' 
                                    : 'hover:bg-slate-800/50 text-slate-400'
                                }`}
                            >
                                <span className="text-xl">{item.icono}</span>
                                {expandido && <span className="font-bold text-sm">{item.nombre}</span>}
                            </button>
                        ))}
                    </>
                )}

                {/* Línea separadora antes de salir */}
                <div className="my-3 border-t border-slate-800" />

                {/* Botón SALIR - integrado como un botón más */}
                <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-red-500/10 text-red-400 transition-all"
                >
                    <span className="text-xl">🚪</span>
                    {expandido && <span className="font-bold text-sm">Salir del Sistema</span>}
                </button>
            </div>
        </div>
    );
}