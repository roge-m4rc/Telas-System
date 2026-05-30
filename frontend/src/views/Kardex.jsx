import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import api from '../services/api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const obtenerFechaLocalPeru = () => {
    const fecha = new Date();
    const opciones = { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' };
    const formateador = new Intl.DateTimeFormat('fr-CA', opciones);
    return formateador.format(fecha);
};

export default function Kardex() {
    const [movimientosTotales, setMovimientosTotales] = useState([]);
    const [cargando, setCargando] = useState(true);
    
    const [busqueda, setBusqueda] = useState('');
    const [filtroTipo, setFiltroTipo] = useState('TODOS');
    
    const fechaHoy = obtenerFechaLocalPeru();
    const [fechaDesde, setFechaDesde] = useState(fechaHoy);
    const [fechaHasta, setFechaHasta] = useState(fechaHoy);
    
    const [paginaActual, setPaginaActual] = useState(1);
    const filasPorPagina = 10;

    // Cargar TODOS los movimientos UNA SOLA VEZ
    useEffect(() => {
        const cargarMovimientos = async () => {
            try {
                const res = await api.get('/productos/movimientos');
                console.log("📦 Movimientos cargados:", res.data.length);
                setMovimientosTotales(res.data);
            } catch (error) {
                console.error(error);
                toast.error("Error al cargar el kardex: " + (error.response?.data?.error || ""));
            } finally {
                setCargando(false);
            }
        };
        cargarMovimientos();
    }, []);

    // Filtrar en memoria
    const movimientosFiltrados = useMemo(() => {
        let resultado = [...movimientosTotales];
        
        // Filtrar por fechas
        resultado = resultado.filter(m => {
            const fechaMov = new Date(m.fecha).toISOString().split('T')[0];
            return fechaMov >= fechaDesde && fechaMov <= fechaHasta;
        });
        
        // Filtrar por búsqueda
        if (busqueda) {
            const termino = busqueda.toLowerCase();
            resultado = resultado.filter(m => 
                (m.producto?.nombre || '').toLowerCase().includes(termino) ||
                (m.motivo || '').toLowerCase().includes(termino)
            );
        }
        
        // Filtrar por tipo
        if (filtroTipo !== 'TODOS') {
            resultado = resultado.filter(m => m.tipo === filtroTipo);
        }
        
        return resultado;
    }, [movimientosTotales, fechaDesde, fechaHasta, busqueda, filtroTipo]);

    useEffect(() => { setPaginaActual(1); }, [fechaDesde, fechaHasta, busqueda, filtroTipo]);

    const itemsActuales = movimientosFiltrados.slice((paginaActual - 1) * filasPorPagina, paginaActual * filasPorPagina);
    const totalPaginas = Math.ceil(movimientosFiltrados.length / filasPorPagina);

    const limpiarFiltros = () => {
        setBusqueda('');
        setFiltroTipo('TODOS');
        setFechaDesde(fechaHoy);
        setFechaHasta(fechaHoy);
    };

    const totalEntradas = movimientosFiltrados.filter(m => m.tipo === 'ENTRADA').reduce((s, m) => s + m.cantidad, 0);
    const totalSalidas = movimientosFiltrados.filter(m => m.tipo === 'SALIDA').reduce((s, m) => s + m.cantidad, 0);

    const exportarExcel = () => {
        if (movimientosFiltrados.length === 0) return toast.warning("No hay datos para exportar.");
        const datos = movimientosFiltrados.map(m => ({
            "Fecha": new Date(m.fecha).toLocaleString(),
            "Producto": m.producto?.nombre || 'Producto eliminado',
            "Tipo": m.tipo,
            "Cantidad (m)": m.cantidad,
            "Motivo": m.motivo || '---'
        }));
        const ws = XLSX.utils.json_to_sheet(datos);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Kardex");
        XLSX.writeFile(wb, `Kardex_${fechaDesde}_al_${fechaHasta}.xlsx`);
        toast.success("📊 Excel exportado correctamente.");
    };

    const exportarPDF = () => {
        if (movimientosFiltrados.length === 0) return toast.warning("No hay datos para exportar.");
        const doc = new jsPDF();
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('📊 Kardex - Historial de Inventario', 14, 15);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Período: ${fechaDesde} al ${fechaHasta}`, 14, 22);
        doc.text(`Entradas: +${totalEntradas.toFixed(1)}m | Salidas: -${totalSalidas.toFixed(1)}m`, 14, 29);
        
        const datos = movimientosFiltrados.map(m => [
            new Date(m.fecha).toLocaleString(),
            m.producto?.nombre || 'Producto eliminado',
            m.tipo,
            `${m.tipo === 'ENTRADA' ? '+' : '-'}${m.cantidad.toFixed(1)}m`,
            m.motivo || '---'
        ]);
        
        autoTable(doc, { 
            startY: 38, 
            head: [['Fecha y Hora', 'Producto', 'Tipo', 'Cantidad', 'Motivo']], 
            body: datos,
            headStyles: { fillColor: [79, 70, 229] },
            styles: { fontSize: 8 },
            didParseCell: (data) => {
                if (data.section === 'body' && data.column.index === 3) {
                    data.cell.styles.textColor = data.cell.raw.includes('+') ? [22, 163, 74] : [220, 38, 38];
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        });
        
        doc.save(`Kardex_${fechaDesde}_al_${fechaHasta}.pdf`);
        toast.success("📄 PDF generado correctamente.");
    };

    if (cargando) return <div className="p-10 text-center text-slate-500 font-bold animate-pulse">Cargando kardex...</div>;

    return (
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border-t-4 border-indigo-500">
            
            {/* CABECERA RESPONSIVA */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-800">📊 Kardex - Movimientos de Inventario</h2>
                    <p className="text-xs text-slate-500 mt-1">Historial completo de entradas y salidas de stock</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={exportarExcel} className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-3 sm:px-4 py-2 rounded-lg font-bold text-sm transition-all shadow-sm">
                        📥 Excel
                    </button>
                    <button onClick={exportarPDF} className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 text-white px-3 sm:px-4 py-2 rounded-lg font-bold text-sm transition-all shadow-sm">
                        📄 PDF
                    </button>
                </div>
            </div>

            {/* FILTROS RESPONSIVOS */}
            <div className="bg-slate-50 p-4 rounded-xl mb-6 space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                    <input 
                        type="text" 
                        placeholder="🔍 Buscar por producto o motivo..." 
                        value={busqueda} 
                        onChange={(e) => setBusqueda(e.target.value)} 
                        className="flex-1 p-2 border rounded-lg text-sm focus:border-indigo-500 outline-none" 
                    />
                    <select 
                        value={filtroTipo} 
                        onChange={(e) => setFiltroTipo(e.target.value)} 
                        className="p-2 border rounded-lg text-sm bg-white focus:border-indigo-500 outline-none"
                    >
                        <option value="TODOS">📌 Todos</option>
                        <option value="ENTRADA">🟢 Entradas</option>
                        <option value="SALIDA">🔴 Salidas</option>
                    </select>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                    <input 
                        type="date" 
                        value={fechaDesde} 
                        onChange={(e) => setFechaDesde(e.target.value)} 
                        className="flex-1 p-2 border rounded-lg text-sm focus:border-indigo-500 outline-none" 
                    />
                    <input 
                        type="date" 
                        value={fechaHasta} 
                        onChange={(e) => setFechaHasta(e.target.value)} 
                        className="flex-1 p-2 border rounded-lg text-sm focus:border-indigo-500 outline-none" 
                    />
                    <button 
                        onClick={limpiarFiltros} 
                        className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-sm transition-all whitespace-nowrap"
                    >
                        🗑️ Limpiar
                    </button>
                </div>
                
                {/* Resumen de filtros */}
                <div className="text-xs text-slate-500 text-center sm:text-left">
                    📅 Mostrando <span className="font-bold text-indigo-600">{movimientosFiltrados.length}</span> movimientos del {fechaDesde} al {fechaHasta} — 
                    Entradas: <span className="font-bold text-green-600">+{totalEntradas.toFixed(1)}m</span> — 
                    Salidas: <span className="font-bold text-red-500">-{totalSalidas.toFixed(1)}m</span>
                </div>
            </div>

            {/* TABLA con scroll horizontal */}
            <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-sm border-collapse">
                    <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase font-black tracking-wider">
                        <tr>
                            <th className="p-3 sm:p-4 border-b border-slate-200">📅 Fecha y Hora</th>
                            <th className="p-3 sm:p-4 border-b border-slate-200">📦 Producto</th>
                            <th className="p-3 sm:p-4 border-b border-slate-200">🔄 Tipo</th>
                            <th className="p-3 sm:p-4 border-b border-slate-200">📏 Cantidad</th>
                            <th className="p-3 sm:p-4 border-b border-slate-200">📝 Motivo</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {itemsActuales.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="p-8 text-center text-slate-400 italic font-medium">
                                    No hay movimientos en este período
                                </td>
                            </tr>
                        ) : (
                            itemsActuales.map(m => (
                                <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-3 sm:p-4 text-slate-500 text-xs sm:text-sm whitespace-nowrap">
                                        {new Date(m.fecha).toLocaleString()}
                                    </td>
                                    <td className="p-3 sm:p-4">
                                        <span className="font-bold text-slate-800 block text-sm">{m.producto?.nombre || 'Producto eliminado'}</span>
                                        <span className="text-[10px] text-slate-400 uppercase">{m.producto?.categoria?.nombre || '---'}</span>
                                    </td>
                                    <td className="p-3 sm:p-4">
                                        <span className={`inline-block px-2 sm:px-3 py-1 rounded-full text-[10px] font-black ${
                                            m.tipo === 'ENTRADA' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                            {m.tipo === 'ENTRADA' ? '🟢 ENTRADA' : '🔴 SALIDA'}
                                        </span>
                                    </td>
                                    <td className={`p-3 sm:p-4 font-black text-base sm:text-lg ${
                                        m.tipo === 'ENTRADA' ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                        {m.tipo === 'ENTRADA' ? '+' : '-'}{m.cantidad.toFixed(1)} <span className="text-xs font-normal">m</span>
                                    </td>
                                    <td className="p-3 sm:p-4 italic text-slate-500 text-xs sm:text-sm max-w-xs break-words">
                                        {m.motivo || '---'}
                                    </td>
                                 </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* PAGINACIÓN RESPONSIVA */}
            {movimientosFiltrados.length > 0 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 pt-4 border-t border-slate-200">
                    <button 
                        onClick={() => setPaginaActual(p => p - 1)} 
                        disabled={paginaActual === 1} 
                        className="w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-2.5 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-all shadow-sm"
                    >
                        ⬅️ Anterior
                    </button>
                    <span className="text-sm font-bold text-slate-500 order-first sm:order-none">
                        📄 Página <span className="text-indigo-600 text-base">{paginaActual}</span> de {totalPaginas}
                    </span>
                    <button 
                        onClick={() => setPaginaActual(p => p + 1)} 
                        disabled={paginaActual >= totalPaginas} 
                        className="w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-2.5 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-all shadow-sm"
                    >
                        Siguiente ➡️
                    </button>
                </div>
            )}
        </div>
    );
}