import { useEffect, useState } from 'react'
import { Toaster, toast } from 'sonner' // 🔔 1. IMPORTAMOS SONNER
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

// 🛡️ IMPORTAMOS EL GUARDIÁN DE SEGURIDAD
import GuardiaInactividad from './components/GuardiaInactividad'

function App() {
  const [usuario, setUsuario] = useState(null)
  const [vistaActual, setVistaActual] = useState('dashboard')
  const [productos, setProductos] = useState([])

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
      toast.error("Error de conexión con el servidor") // 🔔 2. EJEMPLO DE USO EN ERROR
    }
  }

  const manejarLogin = (datosUsuario) => {
    setUsuario(datosUsuario)
    cargarDatos()
    toast.success(`¡Bienvenido de nuevo, ${datosUsuario.nombre}!`) // 🔔 3. MENSAJE DE BIENVENIDA
  }

  const cerrarSesion = () => {
    localStorage.clear()
    setUsuario(null)
    window.location.reload()
  }

  // 🔔 4. Aseguramos que el Toaster exista incluso en el Login
  if (!usuario) return (
    <>
      <Toaster richColors position="top-right" /> 
      <Login onLoginExitoso={manejarLogin} />
    </>
  )

  const esAdmin = usuario.rol === 'Administrador'
  const denegado = <div className="p-10 text-center font-bold text-red-500">🚫 Acceso denegado</div>

  return (
    <div className="flex min-h-screen bg-gray-100">
      
      {/* 🛡️ EL GUARDIÁN INVISIBLE (Solo vigila si hay un usuario logueado) */}
      <GuardiaInactividad />

      {/* 🔔 5. EL EMISOR GLOBAL PARA EL RESTO DEL SISTEMA */}
      <Toaster richColors position="top-right" />
      
      <Sidebar usuario={usuario} setVista={setVistaActual} vistaActual={vistaActual} onLogout={cerrarSesion} />

      <main className="flex-1 p-8 ml-64 min-h-screen" style={{ backgroundColor: '#f1f5f9' }}>
        <header className="flex justify-between items-center mb-8 p-4 rounded-xl shadow-sm border border-slate-200 bg-white">
          <h2 className="text-xl font-bold text-slate-700 capitalize">{vistaActual.replace('-', ' ')}</h2>
          <div className="text-right">
            <p className="text-sm font-black text-blue-600">{usuario.nombre}</p>
            <p className="text-xs text-slate-500 font-medium">{usuario.rol}</p>
          </div>
        </header>

        <div className="animate-fadeIn">
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