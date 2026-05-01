export default function Sidebar({ usuario, setVista, vistaActual, onLogout }) {
  const menuItems = [
    { id: 'dashboard', label: 'Inicio', icon: '🏠' },
    { id: 'punto-venta', label: 'Caja y Ventas', icon: '🛒' },
    { id: 'inventario', label: 'Inventario', icon: '📦' },
    { id: 'ventas', label: 'Historial', icon: '📄' },
    { id: 'clientes', label: 'Clientes', icon: '👥' },
    { id: 'reportes', label: 'Reportes', icon: '📊' },
  ];

  const adminItems = [
    { id: 'kardex',        label: 'Movimientos Kardex', icon: '📊', color: 'indigo' },
    { id: 'admin',         label: 'Panel de Usuarios',  icon: '👤', color: 'purple' },
    { id: 'configuracion', label: 'Configuración',       icon: '⚙️', color: 'slate'  },
  ];

  const colorActivo = {
    indigo: 'bg-indigo-600 text-white font-bold shadow-md',
    purple: 'bg-purple-600 text-white font-bold shadow-md',
    slate:  'bg-slate-600 text-white font-bold shadow-md',
  };

  const estiloSidebar = {
    backgroundColor: '#1e293b',
    color: '#cbd5e1',
    width: '16rem',
    position: 'fixed',
    height: '100vh',
    borderRight: '1px solid #334155'
  };

  return (
    <aside style={estiloSidebar} className="flex flex-col shadow-lg">

      {/* LOGO */}
      <div style={{ backgroundColor: '#0f172a' }} className="p-6 border-b border-slate-700 text-center">
        <h1 className="text-3xl font-black text-blue-400 tracking-tight">Sistema</h1>
        <p className="text-sm text-slate-400 mt-1 font-medium">Control y Gestión</p>
      </div>

      {/* NAVEGACIÓN PRINCIPAL */}
      <nav className="flex-1 mt-6 px-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setVista(item.id)}
            className={`w-full flex items-center px-4 py-3 rounded-xl transition-all text-left ${
              vistaActual === item.id
                ? 'bg-blue-600 text-white font-bold shadow-md'
                : 'hover:bg-slate-700 text-slate-300 font-medium'
            }`}
          >
            <span className="mr-3 text-xl">{item.icon}</span>
            <span className="text-[15px]">{item.label}</span>
          </button>
        ))}

        {/* SECCIÓN SOLO ADMINISTRADORES */}
        {usuario.rol === 'Administrador' && (
          <div className="pt-4 mt-4 border-t border-slate-700 space-y-2">
            <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
              Ajustes Avanzados
            </p>
            {adminItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setVista(item.id)}
                className={`w-full flex items-center px-4 py-3 rounded-xl transition-all text-left ${
                  vistaActual === item.id
                    ? colorActivo[item.color]
                    : 'hover:bg-slate-700 text-slate-300 font-medium'
                }`}
              >
                <span className="mr-3 text-xl">{item.icon}</span>
                <span className="text-[15px]">{item.label}</span>
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* BOTÓN SALIR */}
      <div style={{ backgroundColor: '#0f172a' }} className="p-4 border-t border-slate-700">
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center px-4 py-3 bg-red-500 bg-opacity-10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl font-bold transition-colors"
        >
          <span className="mr-2">🚪</span> Salir del Sistema
        </button>
      </div>

    </aside>
  );
}