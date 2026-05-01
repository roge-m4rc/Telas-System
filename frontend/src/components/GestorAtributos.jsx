import { useState, useEffect } from 'react';
import { obtenerCategorias, crearCategoria, obtenerColores, crearColor } from '../services/api';

export default function GestorAtributos() {
    const [categorias, setCategorias] = useState([]);
    const [colores, setColores] = useState([]);
    const [nuevoNombre, setNuevoNombre] = useState({ cat: '', col: '' });

    const cargarDatos = async () => {
        const [cats, cols] = await Promise.all([obtenerCategorias(), obtenerColores()]);
        setCategorias(cats);
        setColores(cols);
    };

    useEffect(() => { cargarDatos(); }, []);

    const manejarGuardar = async (tipo) => {
        const nombre = tipo === 'cat' ? nuevoNombre.cat : nuevoNombre.col;
        if (!nombre.trim()) return;
        try {
            if (tipo === 'cat') await crearCategoria(nombre);
            else await crearColor(nombre);
            setNuevoNombre({ ...nuevoNombre, [tipo]: '' });
            cargarDatos();
        } catch (error) { alert("Error al guardar"); }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-4">
            {/* SECCIÓN CATEGORÍAS */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-700 mb-4">📁 Categorías de Tela</h3>
                <div className="flex gap-2 mb-4">
                    <input 
                        type="text" value={nuevoNombre.cat} 
                        onChange={(e) => setNuevoNombre({...nuevoNombre, cat: e.target.value})}
                        className="flex-1 border p-2 rounded-lg" placeholder="Ej: Sedas..."
                    />
                    <button onClick={() => manejarGuardar('cat')} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold">+</button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {categorias.map(c => (
                        <span key={c.id} className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm font-medium border border-slate-200">
                            {c.nombre}
                        </span>
                    ))}
                </div>
            </div>

            {/* SECCIÓN COLORES */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-700 mb-4">🎨 Paleta de Colores</h3>
                <div className="flex gap-2 mb-4">
                    <input 
                        type="text" value={nuevoNombre.col} 
                        onChange={(e) => setNuevoNombre({...nuevoNombre, col: e.target.value})}
                        className="flex-1 border p-2 rounded-lg" placeholder="Ej: Turquesa..."
                    />
                    <button onClick={() => manejarGuardar('col')} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold">+</button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {colores.map(c => (
                        <span key={c.id} className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm font-medium border border-slate-200">
                            {c.nombre}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}