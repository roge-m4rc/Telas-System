import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import api, { crearProducto, actualizarProducto, obtenerCategorias, obtenerColores } from '../services/api';

export default function FormularioProducto({ onProductoCreado, productoEdicion, limpiarEdicion, productosActuales = [], onClose }) {
  const [categorias, setCategorias] = useState([]);
  const [colores, setColores] = useState([]);
  
  const [formulario, setFormulario] = useState({
    nombre: '', precio: '', stock: '', categoria_id: '', color_id: ''      
  });

  const cargarOpciones = async () => {
    setCategorias(await obtenerCategorias());
    setColores(await obtenerColores());
  };

  useEffect(() => { cargarOpciones(); }, []);

  useEffect(() => {
    if (productoEdicion) {
      setFormulario({
        nombre: productoEdicion.nombre,
        precio: productoEdicion.precio,
        stock: productoEdicion.stock,
        categoria_id: productoEdicion.categoria_id || '',
        color_id: productoEdicion.color_id || ''
      });
    } else {
      setFormulario({ nombre: '', precio: '', stock: '', categoria_id: '', color_id: '' });
    }
  }, [productoEdicion]);

  const manejarCambio = (e) => {
    setFormulario({ ...formulario, [e.target.name]: e.target.value });
  };

  // 🚀 FUNCIONES DE CREACIÓN RÁPIDA
  const crearCategoriaRapida = async () => {
    const nueva = window.prompt("🏷️ Ingresa el nombre de la NUEVA CATEGORÍA:");
    if (!nueva || nueva.trim() === '') return;
    try {
        const res = await api.post('/categorias', { nombre: nueva.trim() });
        await cargarOpciones(); // Recargamos la lista
        setFormulario(prev => ({ ...prev, categoria_id: res.data.id })); // La autoseleccionamos
        toast.success("Categoría creada al instante.");
    } catch (error) { toast.error("Error al crear categoría."); }
  };

  const crearColorRapido = async () => {
    const nuevo = window.prompt("🎨 Ingresa el nombre del NUEVO COLOR:");
    if (!nuevo || nuevo.trim() === '') return;
    try {
        const res = await api.post('/colores', { nombre: nuevo.trim() });
        await cargarOpciones();
        setFormulario(prev => ({ ...prev, color_id: res.data.id }));
        toast.success("Color creado al instante.");
    } catch (error) { toast.error("Error al crear color."); }
  };

  const guardarTela = async (e) => {
    e.preventDefault();
    if (!formulario.categoria_id || !formulario.color_id) {
        return toast.warning("Por favor, selecciona una categoría y un color.");
    }

    const esDuplicado = productosActuales.some(p => {
        const mismoNombre = p.nombre.trim().toLowerCase() === formulario.nombre.trim().toLowerCase();
        const mismaCategoria = p.categoria_id === parseInt(formulario.categoria_id);
        const mismoColor = p.color_id === parseInt(formulario.color_id);
        if (productoEdicion && p.id === productoEdicion.id) return false;
        return mismoNombre && mismaCategoria && mismoColor;
    });

    if (esDuplicado) {
        return toast.error("⚠️ Esta tela exacta ya existe. Edita su stock desde el inventario.");
    }

    const datosAEnviar = {
      ...formulario,
      precio: parseFloat(formulario.precio),
      stock: parseInt(formulario.stock),
      categoria_id: parseInt(formulario.categoria_id),
      color_id: parseInt(formulario.color_id)
    };

    try {
      if (productoEdicion) {
        await actualizarProducto(productoEdicion.id, datosAEnviar);
        toast.success("✅ Tela actualizada");
      } else {
        await crearProducto(datosAEnviar);
        toast.success("✅ Tela registrada");
      }
      onProductoCreado(); 
      onClose(); // Cerramos el modal flotante al terminar
    } catch (error) {
        toast.error("Hubo un error al guardar la tela.");
    }
  };

  return (
    <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-2xl relative border-t-8 border-t-blue-600 animate-fadeIn">
      {/* BOTÓN CERRAR (X) */}
      <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-all">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="mb-6">
        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
          {productoEdicion ? '✏️ Editar Tela' : '➕ Registrar Nueva Tela'}
        </h2>
        <p className="text-slate-500 text-sm mt-1">Completa los datos para el catálogo general.</p>
      </div>
      
      <form onSubmit={guardarTela} className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre Comercial</label>
          <input type="text" name="nombre" required value={formulario.nombre} onChange={manejarCambio} placeholder="Ej. Polima Texturizada..." className="w-full border-2 border-slate-100 p-3 rounded-xl focus:border-blue-500 outline-none font-bold text-slate-700" />
        </div>

        {/* CAMPO CATEGORÍA CON BOTÓN RÁPIDO */}
        <div>
          <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold text-slate-500 uppercase">Categoría</label>
              <button type="button" onClick={crearCategoriaRapida} className="text-[10px] font-black text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md transition-colors">+ NUEVA</button>
          </div>
          <select name="categoria_id" required value={formulario.categoria_id} onChange={manejarCambio} className="w-full border-2 border-slate-100 p-3 rounded-xl focus:border-blue-500 outline-none bg-white font-bold text-slate-700">
            <option value="">-- Seleccionar --</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>

        {/* CAMPO COLOR CON BOTÓN RÁPIDO */}
        <div>
          <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold text-slate-500 uppercase">Color</label>
              <button type="button" onClick={crearColorRapido} className="text-[10px] font-black text-purple-600 hover:text-purple-800 bg-purple-50 px-2 py-0.5 rounded-md transition-colors">+ NUEVO</button>
          </div>
          <select name="color_id" required value={formulario.color_id} onChange={manejarCambio} className="w-full border-2 border-slate-100 p-3 rounded-xl focus:border-blue-500 outline-none bg-white font-bold text-slate-700">
            <option value="">-- Seleccionar --</option>
            {colores.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Precio por Metro (S/)</label>
          <input type="number" step="0.10" name="precio" required value={formulario.precio} onChange={manejarCambio} className="w-full border-2 border-slate-100 p-3 rounded-xl focus:border-blue-500 outline-none font-bold text-slate-700 font-mono" />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Stock (Mts)</label>
          <input type="number" step="0.1" name="stock" required value={formulario.stock} onChange={manejarCambio} className="w-full border-2 border-slate-100 p-3 rounded-xl focus:border-blue-500 outline-none font-bold text-slate-700 font-mono" />
        </div>

        <div className="md:col-span-2 flex justify-end mt-4 pt-4 border-t border-slate-100 gap-3">
          <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">
            Cancelar
          </button>
          <button type="submit" className="px-8 py-3 rounded-xl text-white font-black shadow-lg bg-blue-600 hover:bg-blue-700 shadow-blue-200 transition-all active:scale-95">
            {productoEdicion ? '💾 Guardar Cambios' : '➕ Crear Tela'}
          </button>
        </div>
      </form>
    </div>
  );
}