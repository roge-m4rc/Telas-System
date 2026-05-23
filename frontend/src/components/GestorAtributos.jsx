import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import api from '../services/api';

export default function GestorAtributos() {
    const [categorias, setCategorias] = useState([]);
    const [colores, setColores] = useState([]);
    const [nuevoNombre, setNuevoNombre] = useState({ cat: '', col: '' });
    const [editando, setEditando] = useState({ tipo: null, id: null, nombre: '' });

    const cargarDatos = async () => {
        try {
            const [catsRes, colsRes] = await Promise.all([
                api.get('/atributos/categorias'),
                api.get('/atributos/colores')
            ]);
            setCategorias(catsRes.data);
            setColores(colsRes.data);
        } catch (error) {
            console.error(error);
            toast.error("Error al cargar atributos");
        }
    };

    useEffect(() => { cargarDatos(); }, []);

    const manejarGuardar = async (tipo) => {
        const nombre = tipo === 'cat' ? nuevoNombre.cat : nuevoNombre.col;
        if (!nombre.trim()) {
            toast.warning("Escribe un nombre válido");
            return;
        }
        
        try {
            if (tipo === 'cat') {
                await api.post('/atributos/categorias', { nombre });
            } else {
                await api.post('/atributos/colores', { nombre });
            }
            setNuevoNombre({ ...nuevoNombre, [tipo]: '' });
            cargarDatos();
            toast.success(`${tipo === 'cat' ? 'Categoría' : 'Color'} creado`);
        } catch (error) {
            toast.error(error.response?.data?.error || "Error al guardar");
        }
    };

    const manejarEditar = async (tipo, id, nombreActual) => {
        const nuevoNombrePrompt = prompt(`Editar ${tipo === 'cat' ? 'categoría' : 'color'}:`, nombreActual);
        if (!nuevoNombrePrompt || nuevoNombrePrompt.trim() === "") return;
        
        try {
            const url = tipo === 'cat' 
                ? `/atributos/categorias/${id}` 
                : `/atributos/colores/${id}`;
            await api.put(url, { nombre: nuevoNombrePrompt.trim() });
            toast.success(`${tipo === 'cat' ? 'Categoría' : 'Color'} actualizado`);
            cargarDatos();
        } catch (error) {
            toast.error(error.response?.data?.error || "Error al actualizar");
        }
    };

    const manejarEliminar = async (tipo, id, nombre) => {
        const confirmar = window.confirm(`¿Seguro que deseas eliminar "${nombre}"?\n\nEsta acción no se puede deshacer.`);
        if (!confirmar) return;
        
        try {
            const url = tipo === 'cat' 
                ? `/atributos/categorias/${id}` 
                : `/atributos/colores/${id}`;
            const { data } = await api.delete(url);
            toast.success(data.message);
            cargarDatos();
        } catch (error) {
            toast.error(error.response?.data?.error || "No se pudo eliminar");
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-4">
            {/* SECCIÓN CATEGORÍAS */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-700 mb-4">📁 Categorías de Tela</h3>
                <div className="flex gap-2 mb-4">
                    <input 
                        type="text" 
                        value={nuevoNombre.cat} 
                        onChange={(e) => setNuevoNombre({...nuevoNombre, cat: e.target.value})}
                        className="flex-1 border p-2 rounded-lg" 
                        placeholder="Ej: Sedas..."
                        onKeyPress={(e) => e.key === 'Enter' && manejarGuardar('cat')}
                    />
                    <button onClick={() => manejarGuardar('cat')} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold">+</button>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {categorias.length === 0 ? (
                        <p className="text-slate-400 text-sm text-center py-4">No hay categorías</p>
                    ) : (
                        categorias.map(c => (
                            <div key={c.id} className="flex justify-between items-center p-2 border-b border-slate-100 hover:bg-slate-50 rounded-lg">
                                <span className="font-medium text-slate-700">{c.nombre}</span>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => manejarEditar('cat', c.id, c.nombre)} 
                                        className="text-blue-600 hover:text-blue-800 text-xs font-bold px-2 py-1 rounded hover:bg-blue-50"
                                    >
                                        ✏️ Editar
                                    </button>
                                    <button 
                                        onClick={() => manejarEliminar('cat', c.id, c.nombre)} 
                                        className="text-red-500 hover:text-red-700 text-xs font-bold px-2 py-1 rounded hover:bg-red-50"
                                    >
                                        🗑️ Eliminar
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* SECCIÓN COLORES */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-700 mb-4">🎨 Paleta de Colores</h3>
                <div className="flex gap-2 mb-4">
                    <input 
                        type="text" 
                        value={nuevoNombre.col} 
                        onChange={(e) => setNuevoNombre({...nuevoNombre, col: e.target.value})}
                        className="flex-1 border p-2 rounded-lg" 
                        placeholder="Ej: Turquesa..."
                        onKeyPress={(e) => e.key === 'Enter' && manejarGuardar('col')}
                    />
                    <button onClick={() => manejarGuardar('col')} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold">+</button>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {colores.length === 0 ? (
                        <p className="text-slate-400 text-sm text-center py-4">No hay colores</p>
                    ) : (
                        colores.map(c => (
                            <div key={c.id} className="flex justify-between items-center p-2 border-b border-slate-100 hover:bg-slate-50 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <div 
                                        className="w-5 h-5 rounded-full border border-slate-300" 
                                        style={{ backgroundColor: c.nombre.toLowerCase() }}
                                    />
                                    <span className="font-medium text-slate-700">{c.nombre}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => manejarEditar('col', c.id, c.nombre)} 
                                        className="text-blue-600 hover:text-blue-800 text-xs font-bold px-2 py-1 rounded hover:bg-blue-50"
                                    >
                                        ✏️ Editar
                                    </button>
                                    <button 
                                        onClick={() => manejarEliminar('col', c.id, c.nombre)} 
                                        className="text-red-500 hover:text-red-700 text-xs font-bold px-2 py-1 rounded hover:bg-red-50"
                                    >
                                        🗑️ Eliminar
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}