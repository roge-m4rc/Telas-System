import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { obtenerClientes, crearCliente, actualizarCliente, eliminarCliente } from '../services/api';

export default function DirectorioClientes() {
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  
  // Estados para los modales (ventanas emergentes)
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [clienteEditando, setClienteEditando] = useState(null);
  
  // Estado para el formulario
  const [formulario, setFormulario] = useState({ nombre: '', documento: '', email: '', telefono: '', direccion: '' });

  // 1️⃣ ESTADOS DE LA PAGINACIÓN
  const [paginaActual, setPaginaActual] = useState(1);
  const filasPorPagina = 10;

  useEffect(() => {
    cargarClientes();
  }, []);

  // Si el usuario escribe en el buscador, regresamos a la página 1
  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda]);

  const cargarClientes = async () => {
    const data = await obtenerClientes();
    setClientes(data || []);
  };

  // Filtramos los clientes en tiempo real
  const clientesFiltrados = clientes.filter(c => 
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
    (c.documento && c.documento.includes(busqueda))
  );

  // 2️⃣ LA MATEMÁTICA PARA CORTAR LA LISTA (Usando los filtrados)
  const indiceUltimoItem = paginaActual * filasPorPagina;
  const indicePrimerItem = indiceUltimoItem - filasPorPagina;
  const itemsActuales = clientesFiltrados.slice(indicePrimerItem, indiceUltimoItem);
  const totalPaginas = Math.ceil(clientesFiltrados.length / filasPorPagina);

  const abrirNuevo = () => {
    setClienteEditando(null);
    setFormulario({ nombre: '', documento: '', email: '', telefono: '', direccion: '' });
    setMostrarFormulario(true);
  };

  const abrirEditar = (cliente) => {
    setClienteEditando(cliente.id);
    setFormulario({ nombre: cliente.nombre, documento: cliente.documento || '', email: cliente.email || '', telefono: cliente.telefono || '', direccion: cliente.direccion || '' });
    setMostrarFormulario(true);
  };

  const guardarCliente = async (e) => {
    e.preventDefault();
    try {
      if (clienteEditando) {
        await actualizarCliente(clienteEditando, formulario);
        toast.success("✅ Cliente actualizado");
      } else {
        await crearCliente(formulario);
        toast.success("✅ Cliente registrado");
      }
      setMostrarFormulario(false);
      cargarClientes();
    } catch (error) {
      toast.error("Error: Revisa que el DNI no esté duplicado.");
    }
  };

  const borrarCliente = async (id, nombre) => {
    if (window.confirm(`¿Estás seguro de eliminar a ${nombre}?`)) {
      try {
        await eliminarCliente(id);
        cargarClientes();
      } catch (error) {
        toast.warning("Error al eliminar");
      }
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      {/* CABECERA Y BUSCADOR */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-800">👥 Directorio de Clientes</h2>
        
        <div className="flex gap-2 w-full md:w-auto">
          <input 
            type="text" 
            placeholder="🔍 Buscar por nombre o DNI..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg w-full md:w-64 focus:border-blue-500"
          />
          <button onClick={abrirNuevo} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 whitespace-nowrap">
            + Nuevo Cliente
          </button>
        </div>
      </div>

      {/* TABLA DE CLIENTES */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="py-3 px-4 text-left font-bold text-sm">Nombre</th>
              <th className="py-3 px-4 text-left font-bold text-sm">DNI/RUC</th>
              <th className="py-3 px-4 text-left font-bold text-sm">Contacto</th>
              <th className="py-3 px-4 text-center font-bold text-sm">Historial Ventas</th>
              <th className="py-3 px-4 text-center font-bold text-sm">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {/* 3️⃣ MAPEAR LOS ITEMS ACTUALES */}
            {itemsActuales.map((cliente) => (
              <tr key={cliente.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4 font-semibold text-gray-800">{cliente.nombre}</td>
                <td className="py-3 px-4 text-gray-600">{cliente.documento || '-'}</td>
                <td className="py-3 px-4 text-sm">
                  <div className="text-gray-700">📞 {cliente.telefono || '-'}</div>
                  <div className="text-gray-500">✉️ {cliente.email || '-'}</div>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">
                    {cliente.ventas?.length || 0} compras
                  </span>
                </td>
                <td className="py-3 px-4 text-center space-x-3">
                  <button onClick={() => abrirEditar(cliente)} className="text-blue-600 hover:text-blue-800 font-bold text-sm">Editar</button>
                  <button onClick={() => borrarCliente(cliente.id, cliente.nombre)} className="text-red-600 hover:text-red-800 font-bold text-sm">Borrar</button>
                </td>
              </tr>
            ))}
            {clientesFiltrados.length === 0 && (
              <tr><td colSpan="5" className="text-center py-8 text-gray-500 font-bold">No se encontraron clientes.</td></tr>
            )}
          </tbody>
        </table>

        {/* 4️⃣ LOS BOTONES DE NAVEGACIÓN */}
        {clientesFiltrados.length > 0 && (
          <div className="flex justify-between items-center p-4 bg-gray-50 border-t border-gray-200">
            <button 
              onClick={() => setPaginaActual(paginaActual - 1)} 
              disabled={paginaActual === 1}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-600 disabled:opacity-40 hover:bg-gray-100 transition-all shadow-sm"
            >
              ⬅️ Anterior
            </button>
            
            <span className="text-sm font-bold text-gray-500">
              Página <span className="text-blue-600">{paginaActual}</span> de {totalPaginas || 1}
            </span>
            
            <button 
              onClick={() => setPaginaActual(paginaActual + 1)} 
              disabled={paginaActual >= totalPaginas}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-600 disabled:opacity-40 hover:bg-gray-100 transition-all shadow-sm"
            >
              Siguiente ➡️
            </button>
          </div>
        )}
      </div>

      {/* FORMULARIO MODAL (Crear / Editar) */}
      {mostrarFormulario && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-gray-800">{clienteEditando ? '✏️ Editar Cliente' : '➕ Nuevo Cliente'}</h3>
            <form onSubmit={guardarCliente} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">Nombre Completo *</label>
                <input type="text" required value={formulario.nombre} onChange={e => setFormulario({...formulario, nombre: e.target.value})} className="w-full border-2 border-gray-200 p-2 rounded-lg focus:border-blue-500 outline-none" />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">DNI / RUC</label>
                <input type="text" value={formulario.documento} onChange={e => setFormulario({...formulario, documento: e.target.value})} className="w-full border-2 border-gray-200 p-2 rounded-lg focus:border-blue-500 outline-none" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Teléfono</label>
                  <input type="text" value={formulario.telefono} onChange={e => setFormulario({...formulario, telefono: e.target.value})} className="w-full border-2 border-gray-200 p-2 rounded-lg focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Email</label>
                  <input type="email" value={formulario.email} onChange={e => setFormulario({...formulario, email: e.target.value})} className="w-full border-2 border-gray-200 p-2 rounded-lg focus:border-blue-500 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">Dirección</label>
                <input type="text" value={formulario.direccion} onChange={e => setFormulario({...formulario, direccion: e.target.value})} className="w-full border-2 border-gray-200 p-2 rounded-lg focus:border-blue-500 outline-none" />
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setMostrarFormulario(false)} className="px-5 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold hover:bg-gray-200 transition-colors">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md transition-colors">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}