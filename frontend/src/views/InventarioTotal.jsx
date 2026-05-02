import { useState, useEffect } from 'react';
import FormularioProducto from '../components/FormularioProducto';
import GestorAtributos from '../components/GestorAtributos';
import api from '../services/api'; 
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export default function InventarioTotal({ productos, onUpdate }) {
    const [busqueda, setBusqueda] = useState('');
    const [productoAEditar, setProductoAEditar] = useState(null);
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
        if (window.confirm(`🚨 ¿Eliminar "${nombre}"?`)) {
            try {
                await api.delete(`/productos/${id}`);
                toast.success(`🗑️ Producto eliminado.`);
                onUpdate(); 
            } catch (error) {
                toast.error("Error al eliminar.");
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

    return (
        <div className="bg-white p-3 sm:p-6 rounded-3xl shadow-sm border border-slate-100">
            
            {/* CABECERA RESPONSIVA */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4 border-b border-slate-100 pb-6">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">📦 Inventario</h2>
                    <p className="text-slate-500 text-xs sm:text-sm mt-1">Gestiona tus telas y existencias.</p>
                </div>
                <div className="grid grid-cols-2 sm:flex gap-2 w-full lg:w-auto">
                    <button onClick={() => setModalAtributos(true)} className="bg-slate-100 text-slate-700 px-3 py-2 rounded-xl text-[10px] sm:text-sm font-bold">🎨 Atributos</button>
                    <button onClick={manejarExportacionExcel} className="bg-emerald-100 text-emerald-700 px-3 py-2 rounded-xl text-[10px] sm:text-sm font-bold">📊 Excel</button>
                    <button onClick={() => { setProductoAEditar(null); setModalFormulario(true); }} className="col-span-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black shadow-lg shadow-blue-100">➕ Nueva Tela</button>
                </div>
            </div>

            {/* BARRA DE BÚSQUEDA */}
            <div className="mb-6 relative">
                <span className="absolute inset-y-0 left-4 flex items-center text-slate-400">🔍</span>
                <input type="text" placeholder="Buscar tela..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 p-3 pl-12 rounded-2xl focus:border-blue-500 outline-none text-sm sm:text-base" />
            </div>

            {/* GRID DE PRODUCTOS: 1 columna en móvil, 2 en tablet, 3 en desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {itemsActuales.map((p) => (
                    <div key={p.id} className="border-2 border-slate-100 p-4 rounded-2xl hover:border-blue-300 transition-all bg-white shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <div className="max-w-[70%]">
                                <h3 className="font-black text-base text-slate-800 leading-tight truncate">{p.nombre}</h3>
                                <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">
                                    {p.categoria?.nombre || '---'} • {p.color?.nombre || '---'}
                                </p>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => { setProductoAEditar(p); setModalFormulario(true); }} className="bg-blue-50 text-blue-600 p-2 rounded-lg text-xs">✏️</button>
                                <button onClick={() => eliminarProducto(p.id, p.nombre)} className="bg-red-50 text-red-500 p-2 rounded-lg text-xs">🗑️</button>
                            </div>
                        </div>

                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                            <div>
                                <p className="text-blue-600 font-black text-lg leading-none">S/ {p.precio.toFixed(2)}</p>
                                <p className={`text-[10px] font-black mt-1 ${p.stock < 10 ? 'text-red-500' : 'text-emerald-600'}`}>
                                    {p.stock}m disp.
                                </p>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <button onClick={() => manejarAjusteStock(p.id, 'entrada', p.nombre)} className="bg-emerald-500 text-white px-2 py-1.5 rounded-lg text-[9px] font-black">+ ENTRADA</button>
                                <button onClick={() => manejarAjusteStock(p.id, 'salida', p.nombre)} className="bg-slate-200 text-slate-600 px-2 py-1.5 rounded-lg text-[9px] font-black">- AJUSTE</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* PAGINACIÓN */}
            {productosFiltrados.length > 0 && (
                <div className="flex flex-col sm:flex-row justify-between items-center mt-8 gap-4 pt-4 border-t">
                    <button onClick={() => setPaginaActual(paginaActual - 1)} disabled={paginaActual === 1} className="w-full sm:w-auto px-4 py-2 border-2 rounded-xl text-xs font-bold disabled:opacity-30">⬅️ Anterior</button>
                    <span className="text-xs font-bold text-slate-500">Página {paginaActual} de {totalPaginas}</span>
                    <button onClick={() => setPaginaActual(paginaActual + 1)} disabled={paginaActual >= totalPaginas} className="w-full sm:w-auto px-4 py-2 border-2 rounded-xl text-xs font-bold disabled:opacity-30">Siguiente ➡️</button>
                </div>
            )}

            {/* MODALES CON CLASES DE RESPONSIVIDAD */}
            {modalFormulario && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-2">
                    <div className="w-full max-w-lg max-h-[95vh] overflow-y-auto">
                        <FormularioProducto 
                            productosActuales={productos} 
                            onProductoCreado={() => { onUpdate(); setModalFormulario(false); }}
                            productoEdicion={productoAEditar}
                            limpiarEdicion={() => setProductoAEditar(null)}
                            onClose={() => setModalFormulario(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}