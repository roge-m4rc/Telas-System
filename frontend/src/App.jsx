import { useEffect, useState } from 'react'
import { Toaster, toast } from 'sonner'
import { obtenerProductos } from './services/api'
import Login from './components/Login'
import Sidebar from './components/Sidebar'
import Dashboard from './views/Dashboard'
import PuntoVenta from './views/PuntoVenta'
import InventarioTotal from './views/InventarioTotal'
import HistorialVentas from './views/HistorialVentas'
import DirectorioClientes from './components/DirectorioClientes'
import PanelAdmin from './components/PanelAdmin'
import Kardex from './views/Kardex'
import Configuracion from './views/Configuracion'
import Reportes from './views/Reportes'
import GuardiaInactividad from './components/GuardiaInactividad'

function App() {
  const [usuario, setUsuario] = useState(null)
  const [vistaActual, setVistaActual] = useState('dashboard')
  const [productos, setProductos] = useState([])
  const [sidebarAbierto, setSidebarAbierto] = useState(false);

  useEffect(() => {
    const usuarioGuardado = localStorage.getItem('usuario')
    if (usuarioGuardado) {
      setUsuario(JSON.parse(usuarioGuardado))
      cargarDatos()
    }
  }, [])

  const cargarDatos = async () => {
    try {
      const data = await obtenerProductos()
      setProductos(data || [])
    } catch (error) {
      console.error("Error al sincronizar inventario:", error)
      toast.error("Error de conexión con el servidor")
    }
  }

  const manejarLogin = (datosUsuario) => {
    setUsuario(datosUsuario)
    cargarDatos()
    toast.success(`¡Bienvenido de nuevo, ${datosUsuario.nombre}!`)
  }

  const cerrarSesion = () => {
    localStorage.clear()
    setUsuario(null)
    window.location.reload()
  }

  if (!usuario) return (
    <>
      <Toaster richColors position="top-right" /> 
      <Login onLoginExitoso={manejarLogin} />
    </>
  )

  const esAdmin = usuario.rol === 'Administrador'
  const denegado = <div className="p-10 text-center font-bold text-red-500">🚫 Acceso denegado</div>

  return (
    <div className="flex h-screen bg-slate-50 w-full overflow-hidden">
      <GuardiaInactividad />
      <Toaster richColors position="top-right" />
      
      {/* 🛠️ FIX: h-full overflow-y-auto para scroll interno del sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 transform ${sidebarAbierto ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out flex-shrink-0 h-full overflow-y-auto`}>
        <Sidebar 
          usuario={usuario} 
          setVista={(v) => { setVistaActual(v); setSidebarAbierto(false); }} 
          vistaActual={vistaActual} 
          onLogout={cerrarSesion} 
        />
      </div>

      {sidebarAbierto && (
        <div onClick={() => setSidebarAbierto(false)} className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden" />
      )}

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-[#f1f5f9]">
        
        <header className="flex justify-between items-center m-4 p-4 rounded-2xl shadow-sm border border-slate-200 bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarAbierto(true)} className="lg:hidden p-2 hover:bg-slate-100 rounded-lg text-xl">
              ☰
            </button>
            <h2 className="text-lg lg:text-xl font-black text-slate-700 capitalize tracking-tight">
              {vistaActual.replace('-', ' ')}
            </h2>
          </div>
          
          <div className="text-right hidden sm:block">
            <p className="text-sm font-black text-blue-600 leading-none">{usuario.nombre}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{usuario.rol}</p>
          </div>
        </header>

        <div className="animate-fadeIn flex-1 overflow-y-auto p-2 sm:p-4">
          {vistaActual === 'dashboard'     && <Dashboard productos={productos} />}
          {vistaActual === 'punto-venta'   && <PuntoVenta productos={productos} onVenta={cargarDatos} />}
          {vistaActual === 'inventario'    && <InventarioTotal productos={productos} onUpdate={cargarDatos} />}
          {vistaActual === 'clientes'      && <DirectorioClientes />}
          {vistaActual === 'reportes'      && (esAdmin ? <Reportes />       : denegado)}
          {vistaActual === 'ventas'        && (esAdmin ? <HistorialVentas /> : denegado)}
          {vistaActual === 'kardex'        && (esAdmin ? <Kardex />         : denegado)}
          {vistaActual === 'admin'         && (esAdmin ? <PanelAdmin />     : denegado)}
          {vistaActual === 'configuracion' && (esAdmin ? <Configuracion />  : denegado)}
        </div>
      </main>
    </div>
  )
}

export default App