import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import api, { crearProducto, actualizarProducto, obtenerCategorias, obtenerColores } from '../services/api';

export default function FormularioProducto({ onProductoCreado, productoEdicion, limpiarEdicion, productosActuales = [], onClose }) {
  const [categorias, setCategorias] = useState([]);
  const [colores, setColores] = useState([]);
  
  const [formulario, setFormulario] = useState({
    nombre: '', precio: '', precio_compra: '', stock: '', categoria_id: '', color_id: ''      
  });

  // Función para calcular el margen de ganancia
  const calcularMargen = () => {
    const precioVenta = parseFloat(formulario.precio);
    const precioCompra = parseFloat(formulario.precio_compra);
    
    if (!precioVenta || precioVenta <= 0 || !precioCompra || precioCompra <= 0) {
      return 0;
    }
    
    const ganancia = precioVenta - precioCompra;
    const porcentaje = (ganancia / precioVenta) * 100;
    return porcentaje.toFixed(1);
  };

  const cargarOpciones = async () => {
    setCategorias(await obtenerCategorias());
    setColores(await obtenerColores());
  };

  useEffect(() => { cargarOpciones(); }, []);

  useEffect(() => {
    if (productoEdicion) {
      setFormulario({
        nombre: productoEdicion.nombre || '',
        precio: productoEdicion.precio || '',
        precio_compra: productoEdicion.precio_compra || '',
        stock: productoEdicion.stock || '',
        categoria_id: productoEdicion.categoria_id || '',
        color_id: productoEdicion.color_id || ''
      });
    } else {
      setFormulario({ nombre: '', precio: '', precio_compra: '', stock: '', categoria_id: '', color_id: '' });
    }
  }, [productoEdicion]);

  const manejarCambio = (e) => {
    setFormulario({ ...formulario, [e.target.name]: e.target.value });
  };

  const crearCategoriaRapida = async () => {
    const nueva = window.prompt("🏷️ Ingresa el nombre de la NUEVA CATEGORÍA:");
    if (!nueva || nueva.trim() === '') return;
    try {
        const res = await api.post('/opciones/categorias', { nombre: nueva.trim() });
        await cargarOpciones();
        setFormulario(prev => ({ ...prev, categoria_id: res.data.id }));
        toast.success("Categoría creada al instante.");
    } catch (error) { toast.error("Error al crear categoría."); }
  };

  const crearColorRapido = async () => {
    const nuevo = window.prompt("🎨 Ingresa el nombre del NUEVO COLOR:");
    if (!nuevo || nuevo.trim() === '') return;
    try {
        const res = await api.post('/opciones/colores', { nombre: nuevo.trim() });
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
      nombre: formulario.nombre,
      precio: parseFloat(formulario.precio),
      precio_compra: parseFloat(formulario.precio_compra) || 0,
      stock: parseFloat(formulario.stock),
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
      onClose();
    } catch (error) {
        console.error(error);
        toast.error("Hubo un error al guardar la tela.");
    }
  };

  const margen = calcularMargen();
  const margenColor = margen >= 30 ? 'text-green-600' : margen >= 20 ? 'text-emerald-500' : margen >= 10 ? 'text-amber-500' : 'text-red-500';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative border-t-8 border-t-blue-600">
        
        {/* Header fijo */}
        <div className="sticky top-0 bg-white z-10 px-6 pt-6 pb-4 border-b border-slate-100">
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 className="text-2xl font-black text-slate-800 pr-8">
            {productoEdicion ? '✏️ Editar Tela' : '➕ Registrar Nueva Tela'}
          </h2>
          <p className="text-slate-500 text-sm mt-1">Completa los datos para el catálogo general.</p>
        </div>

        {/* Formulario con scroll interno */}
        <form onSubmit={guardarTela} className="p-6">
          <div className="space-y-5">
            {/* Nombre - ocupa todo el ancho */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre Comercial</label>
              <input 
                type="text" 
                name="nombre" 
                required 
                value={formulario.nombre} 
                onChange={manejarCambio} 
                placeholder="Ej. Polima Texturizada..." 
                className="w-full border-2 border-slate-100 p-3 rounded-xl focus:border-blue-500 outline-none font-bold text-slate-700" 
              />
            </div>

            {/* Categoría y Color - en grid responsivo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase">Categoría</label>
                  <button type="button" onClick={crearCategoriaRapida} className="text-[10px] font-black text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md transition-colors">
                    + NUEVA
                  </button>
                </div>
                <select 
                  name="categoria_id" 
                  required 
                  value={formulario.categoria_id} 
                  onChange={manejarCambio} 
                  className="w-full border-2 border-slate-100 p-3 rounded-xl focus:border-blue-500 outline-none bg-white font-bold text-slate-700"
                >
                  <option value="">-- Seleccionar --</option>
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase">Color</label>
                  <button type="button" onClick={crearColorRapido} className="text-[10px] font-black text-purple-600 hover:text-purple-800 bg-purple-50 px-2 py-0.5 rounded-md transition-colors">
                    + NUEVO
                  </button>
                </div>
                <select 
                  name="color_id" 
                  required 
                  value={formulario.color_id} 
                  onChange={manejarCambio} 
                  className="w-full border-2 border-slate-100 p-3 rounded-xl focus:border-blue-500 outline-none bg-white font-bold text-slate-700"
                >
                  <option value="">-- Seleccionar --</option>
                  {colores.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
            </div>

            {/* Precios y Stock - en grid responsivo */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Precio Compra (S/)</label>
                <input 
                  type="number" 
                  step="0.10" 
                  name="precio_compra" 
                  required 
                  value={formulario.precio_compra} 
                  onChange={manejarCambio} 
                  className="w-full border-2 border-slate-100 p-3 rounded-xl focus:border-blue-500 outline-none font-bold text-slate-700 font-mono" 
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Precio Venta (S/)</label>
                <input 
                  type="number" 
                  step="0.10" 
                  name="precio" 
                  required 
                  value={formulario.precio} 
                  onChange={manejarCambio} 
                  className="w-full border-2 border-slate-100 p-3 rounded-xl focus:border-blue-500 outline-none font-bold text-slate-700 font-mono" 
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Stock (Mts)</label>
                <input 
                  type="number" 
                  step="0.1" 
                  name="stock" 
                  required 
                  value={formulario.stock} 
                  onChange={manejarCambio} 
                  className="w-full border-2 border-slate-100 p-3 rounded-xl focus:border-blue-500 outline-none font-bold text-slate-700 font-mono" 
                />
              </div>
            </div>

            {/* Margen de ganancia */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-slate-600">📊 Margen de Ganancia:</span>
                <span className={`text-2xl font-black ${margenColor}`}>
                  {margen}%
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    margen >= 30 ? 'bg-green-600' : margen >= 20 ? 'bg-emerald-500' : margen >= 10 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(margen, 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-2 text-center">
                {margen >= 30 ? '✅ Excelente margen' : margen >= 20 ? '👍 Buen margen' : margen >= 10 ? '⚠️ Margen ajustado' : '🔴 Margen bajo - Revisa precios'}
              </p>
            </div>

            {/* Botones - fijos en la parte inferior del modal */}
            <div className="sticky bottom-0 bg-white pt-4 pb-2 border-t border-slate-100 flex gap-3 mt-4">
              <button 
                type="button" 
                onClick={onClose} 
                className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="flex-1 px-8 py-3 rounded-xl text-white font-black shadow-lg bg-blue-600 hover:bg-blue-700 shadow-blue-200 transition-all active:scale-95"
              >
                {productoEdicion ? '💾 Guardar Cambios' : '➕ Crear Tela'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}