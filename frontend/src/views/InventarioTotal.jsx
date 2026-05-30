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
    const [mostrarInactivos, setMostrarInactivos] = useState(false);
    const [paginaActual, setPaginaActual] = useState(1);
    const [productosInactivos, setProductosInactivos] = useState([]);
    const filasPorPagina = 9;

    useEffect(() => { 
        setPaginaActual(1); 
    }, [busqueda, mostrarInactivos]);

    useEffect(() => {
        if (mostrarInactivos) {
            cargarProductosInactivos();
        }
    }, [mostrarInactivos]);

    const cargarProductosInactivos = async () => {
        try {
            const res = await api.get('/productos/inactivos');
            setProductosInactivos(res.data);
        } catch (error) {
            console.error("Error al cargar inactivos:", error);
            toast.error("Error al cargar productos desactivados");
        }
    };

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

    const eliminarProducto = async (id, nombre, tieneHistorial = false) => {
        let mensaje = `🚨 ¡ADVERTENCIA!\n\n¿Eliminar "${nombre}"?\n`;
        
        if (tieneHistorial) {
            mensaje += `\n⚠️ Este producto tiene ventas o movimientos registrados.\nSe dará de BAJA LÓGICA (no aparecerá en el punto de venta, pero se conservará el historial).\n\n¿Continuar?`;
        } else {
            mensaje += `\nEsta acción NO se puede deshacer.\n\n¿Continuar?`;
        }
        
        const confirmar = window.confirm(mensaje);
        if (confirmar) {
            try {
                const res = await api.delete(`/productos/${id}`);
                if (res.data.bajaLogica) {
                    toast.success(`📦 ${nombre} ha sido desactivado. El historial se conserva.`);
                } else {
                    toast.success(`🗑️ ${nombre} eliminado permanentemente.`);
                }
                onUpdate();
                if (mostrarInactivos) {
                    cargarProductosInactivos();
                }
            } catch (error) {
                const msg = error.response?.data?.error || "Error al eliminar";
                toast.error(msg);
            }
        }
    };

    const reactivarProducto = async (id, nombre) => {
        const confirmar = window.confirm(`¿Reactivar "${nombre}"?\nEl producto volverá a aparecer en el inventario y punto de venta.`);
        if (confirmar) {
            try {
                await api.patch(`/productos/${id}/reactivar`);
                toast.success(`✅ ${nombre} reactivado correctamente`);
                onUpdate();
                cargarProductosInactivos();
            } catch (error) {
                toast.error("Error al reactivar producto");
            }
        }
    };

    const productosAMostrar = mostrarInactivos ? productosInactivos : productos;
    
    const productosFiltrados = productosAMostrar.filter(p => {
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
        if (!productos || !Array.isArray(productos) || productos.length === 0) {
            toast.warning("No hay productos para exportar.");
            return;
        }

        const datosParaExcel = productos.map(p => ({
            ID: p.id || '',
            Nombre: p.nombre || 'Sin nombre',
            Categoría: p.categoria?.nombre || '---',
            Color: p.color?.nombre || '---',
            'Precio Compra': `S/ ${typeof p.precio_compra === 'number' ? p.precio_compra.toFixed(2) : '0.00'}`,
            'Precio Venta': `S/ ${typeof p.precio === 'number' ? p.precio.toFixed(2) : '0.00'}`,
            'Stock (m)': typeof p.stock === 'number' ? p.stock : 0,
            Estado: (typeof p.stock === 'number' && p.stock < 15) ? 'STOCK BAJO' : 'OK'
        }));

        try {
            const hoja = XLSX.utils.json_to_sheet(datosParaExcel);
            const libro = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(libro, hoja, "Inventario");
            XLSX.writeFile(libro, `Inventario_Telas_${new Date().toLocaleDateString()}.xlsx`);
            toast.success("📊 Excel exportado correctamente.");
        } catch (error) {
            console.error("Error al exportar Excel:", error);
            toast.error("❌ Error al generar el archivo Excel.");
        }
    };

    return (
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
            
            {/* CABECERA RESPONSIVA */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 sm:mb-8 gap-4 border-b border-slate-100 pb-4 sm:pb-6">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">📦 Inventario Central</h2>
                    <p className="text-sm text-slate-500 mt-1">Gestiona tus telas, precios y existencias.</p>
                </div>
                <div className="flex flex-wrap gap-2 sm:gap-3 w-full lg:w-auto">
                    <button 
                        onClick={() => setMostrarInactivos(!mostrarInactivos)} 
                        className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm ${
                            mostrarInactivos 
                                ? 'bg-orange-100 text-orange-700 border border-orange-200' 
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                    >
                        {mostrarInactivos ? '📦 Ver Activos' : '🗑️ Ver Desactivados'}
                    </button>
                    <button onClick={() => setModalAtributos(true)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm">
                        🎨 Atributos
                    </button>
                    <button onClick={manejarExportacionExcel} className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm">
                        📊 Excel
                    </button>
                    <button onClick={abrirCreacion} className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-black transition-all shadow-lg shadow-blue-200">
                        ➕ Nueva Tela
                    </button>
                </div>
            </div>

            {/* BARRA DE BÚSQUEDA RESPONSIVA */}
            <div className="mb-6 relative">
                <span className="absolute inset-y-0 left-4 flex items-center text-slate-400 text-base sm:text-lg">🔍</span>
                <input 
                    type="text" 
                    placeholder="Buscar por nombre, color o categoría..." 
                    value={busqueda} 
                    onChange={(e) => setBusqueda(e.target.value)} 
                    className="w-full bg-slate-50 border-2 border-slate-100 p-3 sm:p-4 pl-10 sm:pl-12 rounded-2xl focus:border-blue-500 outline-none transition-colors text-slate-700 font-medium text-sm sm:text-lg" 
                />
            </div>

            {/* INDICADOR DE VISTA ACTUAL */}
            {mostrarInactivos && (
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-xl text-orange-700 text-xs sm:text-sm font-bold flex justify-between items-center flex-wrap gap-2">
                    <span>⚠️ Mostrando productos desactivados (dados de baja)</span>
                    <button onClick={() => setMostrarInactivos(false)} className="text-xs underline">Ver activos</button>
                </div>
            )}

            {/* GRID DE PRODUCTOS - RESPONSIVO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {itemsActuales.length === 0 ? (
                    <div className="col-span-full text-center py-10 text-slate-400">
                        {mostrarInactivos ? 'No hay productos desactivados' : 'No se encontraron productos'}
                    </div>
                ) : (
                    itemsActuales.map((p) => {
                        const esInactivo = mostrarInactivos || p.activo === false;
                        return (
                            <div key={p.id} className={`border-2 p-4 sm:p-5 rounded-2xl transition-all shadow-sm hover:shadow-md group ${
                                esInactivo ? 'border-orange-200 bg-orange-50/30 opacity-75' : 'border-slate-100 hover:border-blue-300 bg-white'
                            }`}>
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1">
                                        <h3 className="font-black text-base sm:text-lg text-slate-800 leading-tight line-clamp-2">{p.nombre}</h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                                            {p.categoria?.nombre || '---'} • {p.color?.nombre || '---'}
                                        </p>
                                    </div>
                                    <div className="flex gap-1 sm:gap-2">
                                        {!esInactivo && (
                                            <>
                                                <button onClick={() => abrirEdicion(p)} className="bg-blue-50 text-blue-600 p-1.5 sm:p-2 rounded-lg hover:bg-blue-100 transition-colors" title="Editar">
                                                    ✏️
                                                </button>
                                                <button onClick={() => eliminarProducto(p.id, p.nombre, true)} className="bg-red-50 text-red-500 p-1.5 sm:p-2 rounded-lg hover:bg-red-100 transition-colors" title="Eliminar">
                                                    🗑️
                                                </button>
                                            </>
                                        )}
                                        {esInactivo && (
                                            <button onClick={() => reactivarProducto(p.id, p.nombre)} className="bg-green-50 text-green-600 p-1.5 sm:p-2 rounded-lg hover:bg-green-100 transition-colors" title="Reactivar">
                                                🔄
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {esInactivo && (
                                    <div className="mb-3 inline-block bg-orange-200 text-orange-800 text-[10px] font-black px-2 py-1 rounded-full">
                                        🚫 DESACTIVADO
                                    </div>
                                )}

                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-3 bg-slate-50 rounded-xl">
                                    <div>
                                        <p className="text-blue-600 font-black text-lg sm:text-xl leading-none">
                                            S/ {typeof p.precio === 'number' ? p.precio.toFixed(2) : '0.00'}
                                        </p>
                                        {typeof p.precio_compra === 'number' && p.precio_compra > 0 && (
                                            <p className="text-[10px] text-slate-400 mt-0.5">
                                                Compra: S/ {p.precio_compra.toFixed(2)}
                                            </p>
                                        )}
                                        <p className={`text-xs font-black mt-1 ${typeof p.stock === 'number' && p.stock < 10 ? 'text-red-500' : 'text-emerald-600'}`}>
                                            📏 Stock: {typeof p.stock === 'number' ? p.stock : 0} mts
                                        </p>
                                    </div>
                                    {!esInactivo && (
                                        <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto">
                                            <button onClick={() => manejarAjusteStock(p.id, 'entrada', p.nombre)} className="flex-1 sm:flex-none bg-emerald-500 text-white px-2 sm:px-3 py-1.5 rounded-lg text-[10px] font-black hover:bg-emerald-600 transition-colors shadow-sm">
                                                ➕ ENTRADA
                                            </button>
                                            <button onClick={() => manejarAjusteStock(p.id, 'salida', p.nombre)} className="flex-1 sm:flex-none bg-slate-200 text-slate-600 px-2 sm:px-3 py-1.5 rounded-lg text-[10px] font-black hover:bg-slate-300 transition-colors shadow-sm">
                                                ➖ SALIDA
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* PAGINACIÓN RESPONSIVA */}
            {productosFiltrados.length > 0 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 sm:mt-8 pt-6 border-t border-slate-100">
                    <button 
                        onClick={() => setPaginaActual(paginaActual - 1)} 
                        disabled={paginaActual === 1} 
                        className="w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-2.5 bg-white border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-all"
                    >
                        ⬅️ Anterior
                    </button>
                    <span className="text-sm font-bold text-slate-500">
                        Página <span className="text-blue-600 text-base sm:text-lg">{paginaActual}</span> de {totalPaginas || 1}
                    </span>
                    <button 
                        onClick={() => setPaginaActual(paginaActual + 1)} 
                        disabled={paginaActual >= totalPaginas} 
                        className="w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-2.5 bg-white border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-all"
                    >
                        Siguiente ➡️
                    </button>
                </div>
            )}

            {/* MODALES */}
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

            {modalAtributos && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-2xl w-full max-w-3xl relative max-h-[90vh] overflow-y-auto">
                        <button onClick={() => setModalAtributos(false)} className="absolute top-3 right-3 sm:top-4 sm:right-4 text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-all">
                            ❌
                        </button>
                        <h2 className="text-xl sm:text-2xl font-black mb-4 text-slate-800">🎨 Gestor de Atributos</h2>
                        <GestorAtributos />
                    </div>
                </div>
            )}
        </div>
    );
}