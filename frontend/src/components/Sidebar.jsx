import { useState } from 'react';

export default function Sidebar({ usuario, setVista, vistaActual, onLogout }) {
    const [expandido, setExpandido] = useState(true); // Controla el ancho

    const menuItems = [
        { id: 'dashboard', nombre: 'Inicio', icono: '🏠' },
        { id: 'punto-venta', nombre: 'Caja y Ventas', icono: '🛒' },
        { id: 'inventario', nombre: 'Inventario', icono: '📦' },
        { id: 'ventas', nombre: 'Historial', icono: '📄' },
        { id: 'clientes', nombre: 'Clientes', icono: '👥' },
        { id: 'reportes', nombre: 'Reportes', icono: '📊' },
    ];

    return (
        <aside className={`bg-slate-900 text-white min-h-screen transition-all duration-300 flex flex-col ${expandido ? 'w-64' : 'w-20'}`}>
            {/* BOTÓN PARA COLAPSAR */}
            <button 
                onClick={() => setExpandido(!expandido)}
                className="absolute -right-3 top-10 bg-blue-600 rounded-full w-6 h-6 flex items-center justify-center border-2 border-white text-[10px] z-50 shadow-lg"
            >
                {expandido ? '◀' : '▶'}
            </button>

            <div className="p-6">
                <h1 className={`font-black tracking-tighter text-blue-400 transition-all ${expandido ? 'text-2xl' : 'text-center text-sm'}`}>
                    {expandido ? 'Sistema' : 'S'}
                </h1>
                {expandido && <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Telas & Gestión</p>}
            </div>

            <nav className="flex-1 px-3 space-y-2">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setVista(item.id)}
                        className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all ${
                            vistaActual === item.id ? 'bg-blue-600 shadow-lg shadow-blue-900/50' : 'hover:bg-slate-800 text-slate-400'
                        }`}
                    >
                        <span className="text-xl">{item.icono}</span>
                        {expandido && <span className="font-bold text-sm">{item.nombre}</span>}
                    </button>
                ))}
            </nav>

            <div className="p-4 border-t border-slate-800">
                <button onClick={onLogout} className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-red-500/10 text-red-400 transition-all">
                    <span>🚪</span>
                    {expandido && <span className="font-bold text-sm">Salir</span>}
                </button>
            </div>
        </aside>
    );
}