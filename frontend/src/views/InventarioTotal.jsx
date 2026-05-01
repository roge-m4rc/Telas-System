import { useState, useEffect } from 'react';
import FormularioProducto from '../components/FormularioProducto';
import GestorAtributos from '../components/GestorAtributos'; // Opcional si quieren gestionarlos en masa
import api from '../services/api'; 
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export default function InventarioTotal({ productos, onUpdate }) {
    const [busqueda, setBusqueda] = useState('');
    const [productoAEditar, setProductoAEditar] = useState(null);
    
    // 🪟 ESTADOS DE LOS MODALES (Ventanas flotantes)
    const [modalFormulario, setModalFormulario] = useState(false);
    const [modalAtributos, setModalAtributos] = useState(false);

    const [paginaActual, setPaginaActual] = useState(1);
    const filasPorPagina = 9;

    useEffect(() => { setPaginaActual(1); }, [busqueda]);

    const manejarAjusteStock = async (id, tipo, nombre) => {
        const accion = tipo === 'entrada' ? 'ingresar' : 'retirar';
        const valor = prompt(`¿Cuántos metros desea ${accion} para: ${nombre}?`);
        if (valor === null) return; 
        const metros = parseFloat(valor);
        if (isNaN(metros) || metros <= 0) return toast.warning("Ingresa un número válido mayor a 0.");

        try {
            await api.patch(`/productos/${id}/stock`, { cantidad: metros, tipo: tipo });
            onUpdate(); 
            toast.success("✅ Stock actualizado");
        } catch (error) {
            toast.warning("Error al actualizar stock.");
        }
    };

    const eliminarProducto = async (id, nombre) => {
        const confirmar = window.confirm(`🚨 ¡ADVERTENCIA!\n\n¿Eliminar "${nombre}"?\nEsta acción NO se puede deshacer.`);
        if (confirmar) {
            try {
                await api.delete(`/productos/${id}`);
                toast.success(`🗑️ Producto eliminado.`);
                onUpdate(); 
            } catch (error) {
                toast.error("No se puede eliminar. Probablemente esté vinculado a ventas pasadas.");
            }
        }
    };

    const productosFiltrados = productos.filter(p => {
        const termino = busqueda.toLowerCase();
        return (p.nombre || '').toLowerCase().includes(termino) || 
               (p.categoria?.nombre || '').toLowerCase().includes(termino) || 
               (p.color?.nombre || '').toLowerCase().includes(termino);
    });

    const itemsActuales = productosFiltrados.slice((paginaActual - 1) * filasPorPagina, paginaActual * filasPorPagina);
    const totalPaginas = Math.ceil(productosFiltrados.length / filasPorPagina);

    const abrirCreacion = () => {
        setProductoAEditar(null);
        setModalFormulario(true);
    };

    const abrirEdicion = (producto) => {
        setProductoAEditar(producto);
        setModalFormulario(true);
    };

    const manejarExportacionExcel = () => {
        const datosParaExcel = productos.map(p => ({
            ID: p.id, Nombre: p.nombre, Categoría: p.categoria?.nombre || '---',
            Color: p.color?.nombre || '---', Precio: `S/ ${p.precio.toFixed(2)}`,
            'Stock Actual (m)': p.stock, Estado: p.stock < 15 ? 'STOCK BAJO' : 'OK'
        }));
        const hoja = XLSX.utils.json_to_sheet(datosParaExcel);
        const libro = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(libro, hoja, "Inventario");
        XLSX.writeFile(libro, `Inventario_Telas_${new Date().toLocaleDateString()}.xlsx`);
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            
            {/* CABECERA PRINCIPAL */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4 border-b border-slate-100 pb-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">📦 Inventario Central</h2>
                    <p className="text-slate-500 text-sm mt-1">Gestiona tus telas, precios y existencias.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button onClick={() => setModalAtributos(true)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm">
                        🎨 Gestionar Atributos
                    </button>
                    <button onClick={manejarExportacionExcel} className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm">
                        📊 Exportar Excel
                    </button>
                    <button onClick={abrirCreacion} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl text-sm font-black transition-all shadow-lg shadow-blue-200">
                        ➕ Nueva Tela
                    </button>
                </div>
            </div>

            {/* BARRA DE BÚSQUEDA */}
            <div className="mb-6 relative">
                <span className="absolute inset-y-0 left-4 flex items-center text-slate-400 text-lg">🔍</span>
                <input type="text" placeholder="Buscar por nombre de tela, color o categoría..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 p-4 pl-12 rounded-2xl focus:border-blue-500 outline-none transition-colors text-slate-700 font-medium text-lg" />
            </div>

            {/* GRID DE PRODUCTOS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {itemsActuales.map((p) => (
                    <div key={p.id} className="border-2 border-slate-100 p-5 rounded-2xl hover:border-blue-300 transition-all bg-white shadow-sm hover:shadow-md group">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h3 className="font-black text-lg text-slate-800 leading-tight">{p.nombre}</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                                    {p.categoria?.nombre || '---'} • {p.color?.nombre || '---'}
                                </p>
                            </div>
                            <div className="flex gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => abrirEdicion(p)} className="bg-blue-50 text-blue-600 p-2 rounded-lg hover:bg-blue-100" title="Editar">✏️</button>
                                <button onClick={() => eliminarProducto(p.id, p.nombre)} className="bg-red-50 text-red-500 p-2 rounded-lg hover:bg-red-100" title="Eliminar">🗑️</button>
                            </div>
                        </div>

                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                            <div>
                                <p className="text-blue-600 font-black text-xl leading-none">S/ {p.precio.toFixed(2)}</p>
                                <p className={`text-xs font-black mt-1 ${p.stock < 10 ? 'text-red-500' : 'text-emerald-600'}`}>
                                    {p.stock} metros disp.
                                </p>
                            </div>
                            <div className="flex flex-col gap-2">
                                <button onClick={() => manejarAjusteStock(p.id, 'entrada', p.nombre)} className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-black hover:bg-emerald-600 transition-colors shadow-sm">+ ENTRADA</button>
                                <button onClick={() => manejarAjusteStock(p.id, 'salida', p.nombre)} className="bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-[10px] font-black hover:bg-slate-300 transition-colors shadow-sm">- AJUSTE</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* PAGINACIÓN */}
            {productosFiltrados.length > 0 && (
                <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-100">
                    <button onClick={() => setPaginaActual(paginaActual - 1)} disabled={paginaActual === 1} className="px-5 py-2.5 bg-white border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-all">⬅️ Anterior</button>
                    <span className="text-sm font-bold text-slate-500">Página <span className="text-blue-600 text-lg">{paginaActual}</span> de {totalPaginas || 1}</span>
                    <button onClick={() => setPaginaActual(paginaActual + 1)} disabled={paginaActual >= totalPaginas} className="px-5 py-2.5 bg-white border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-all">Siguiente ➡️</button>
                </div>
            )}

            {/* 🪟 MODAL: FORMULARIO DE TELA */}
            {modalFormulario && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <FormularioProducto 
                        productosActuales={productos} 
                        onProductoCreado={() => { onUpdate(); setModalFormulario(false); }}
                        productoEdicion={productoAEditar}
                        limpiarEdicion={() => setProductoAEditar(null)}
                        onClose={() => setModalFormulario(false)}
                    />
                </div>
            )}

            {/* 🪟 MODAL: GESTOR DE ATRIBUTOS (Opcional, para eliminar categorías/colores viejos) */}
            {modalAtributos && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white p-6 rounded-3xl shadow-2xl w-full max-w-3xl relative max-h-[90vh] overflow-y-auto">
                        <button onClick={() => setModalAtributos(false)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-all">
                            ❌
                        </button>
                        <h2 className="text-2xl font-black mb-4 text-slate-800">🎨 Gestor de Atributos</h2>
                        <GestorAtributos />
                    </div>
                </div>
            )}
        </div>
    );
}