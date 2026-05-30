import { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

const obtenerFechaLocalPeru = () => {
    const fecha = new Date();
    const opciones = { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' };
    const formateador = new Intl.DateTimeFormat('fr-CA', opciones);
    return formateador.format(fecha);
};

export default function Reportes() {
    const [ventasTotales, setVentasTotales] = useState([]);
    const [cargando, setCargando] = useState(true);
    
    const fechaHoy = obtenerFechaLocalPeru();
    const [fechas, setFechas] = useState({ inicio: fechaHoy, fin: fechaHoy });
    const [paginaActual, setPaginaActual] = useState(1);
    const filasPorPagina = 10;

    useEffect(() => {
        cargarTodasLasVentas();
    }, []);

    const cargarTodasLasVentas = async () => {
        try {
            const res = await api.get('/ventas');
            setVentasTotales(res.data);
        } catch (e) {
            toast.error("Error al cargar reportes.");
        } finally {
            setCargando(false);
        }
    };

    // Filtrar por fechas
    const ventasFiltradas = useMemo(() => {
        return ventasTotales.filter(v => {
            const fechaVenta = new Date(v.fecha).toISOString().split('T')[0];
            return fechaVenta >= fechas.inicio && fechaVenta <= fechas.fin;
        });
    }, [ventasTotales, fechas.inicio, fechas.fin]);

    // Resumen por método de pago
    const resumen = useMemo(() => {
        const totalVendido = ventasFiltradas.reduce((s, v) => s + v.total, 0);
        const metodos = {};
        ventasFiltradas.forEach(v => {
            const metodo = v.metodo_pago || 'EFECTIVO';
            metodos[metodo] = (metodos[metodo] || 0) + v.total;
        });
        return { totalVendido, metodos };
    }, [ventasFiltradas]);

    const itemsActuales = ventasFiltradas.slice((paginaActual - 1) * filasPorPagina, paginaActual * filasPorPagina);
    const totalPaginas = Math.ceil(ventasFiltradas.length / filasPorPagina);

    const exportarExcel = () => {
        if (ventasFiltradas.length === 0) return toast.warning("No hay datos para exportar.");
        const datos = ventasFiltradas.map(v => ({
            "Fecha": new Date(v.fecha).toLocaleString(),
            "Boleta": `B001-${String(v.id).padStart(6, '0')}`,
            "Cliente": v.cliente?.nombre || 'Público General',
            "Método de Pago": v.metodo_pago || 'EFECTIVO',
            "Total (S/)": v.total?.toFixed(2)
        }));
        const ws = XLSX.utils.json_to_sheet(datos);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Reporte_Ventas");
        XLSX.writeFile(wb, `Reporte_Ventas_${fechas.inicio}_al_${fechas.fin}.xlsx`);
        toast.success("📊 Excel exportado correctamente.");
    };

    const exportarPDF = () => {
        if (ventasFiltradas.length === 0) return toast.warning("No hay datos para exportar.");
        const doc = new jsPDF();
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('📊 Reporte de Ventas', 14, 15);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Período: ${fechas.inicio} al ${fechas.fin}`, 14, 22);
        doc.text(`Total recaudado: S/ ${resumen.totalVendido.toFixed(2)}`, 14, 29);
        
        const datos = ventasFiltradas.map(v => [
            new Date(v.fecha).toLocaleDateString(),
            `B001-${String(v.id).padStart(6, '0')}`,
            v.cliente?.nombre || 'Público General',
            v.metodo_pago || 'EFECTIVO',
            `S/ ${v.total.toFixed(2)}`
        ]);
        
        autoTable(doc, { 
            startY: 38, 
            head: [['Fecha', 'Boleta', 'Cliente', 'Método', 'Total']], 
            body: datos,
            headStyles: { fillColor: [59, 130, 246] },
            styles: { fontSize: 8 }
        });
        
        doc.save(`Reporte_Ventas_${fechas.inicio}_al_${fechas.fin}.pdf`);
        toast.success("📄 PDF generado correctamente.");
    };

    if (cargando) return <div className="p-10 text-center text-slate-500 font-bold animate-pulse">Cargando reportes...</div>;

    return (
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-full">
            {/* Título responsivo */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">📊 Reportes y Auditoría</h2>
                <p className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full">Total de ventas: {ventasFiltradas.length}</p>
            </div>

            {/* Panel de filtros y botones - RESPONSIVO */}
            <div className="bg-white p-4 sm:p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
                {/* Filtros de fecha */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider">📅 Desde</label>
                        <input 
                            type="date" 
                            className="w-full border-2 border-slate-100 p-2 sm:p-3 rounded-xl outline-none focus:border-blue-500 font-medium text-slate-700 text-sm" 
                            value={fechas.inicio} 
                            onChange={(e) => setFechas({...fechas, inicio: e.target.value})} 
                        />
                    </div>
                    <div className="flex-1">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider">📅 Hasta</label>
                        <input 
                            type="date" 
                            className="w-full border-2 border-slate-100 p-2 sm:p-3 rounded-xl outline-none focus:border-blue-500 font-medium text-slate-700 text-sm" 
                            value={fechas.fin} 
                            onChange={(e) => setFechas({...fechas, fin: e.target.value})} 
                        />
                    </div>
                </div>
                
                {/* Botones - Se apilan en móvil */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                    <button 
                        onClick={cargarTodasLasVentas} 
                        disabled={cargando} 
                        className="bg-blue-600 text-white p-2 sm:p-3 rounded-xl font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-[0.98]"
                    >
                        🔍 Filtrar
                    </button>
                    <button 
                        onClick={exportarExcel} 
                        disabled={ventasFiltradas.length === 0} 
                        className="bg-emerald-600 text-white p-2 sm:p-3 rounded-xl font-bold text-sm hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                    >
                        📥 Excel
                    </button>
                    <button 
                        onClick={exportarPDF} 
                        disabled={ventasFiltradas.length === 0} 
                        className="bg-red-600 text-white p-2 sm:p-3 rounded-xl font-bold text-sm hover:bg-red-700 shadow-lg shadow-red-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                    >
                        📄 PDF
                    </button>
                </div>
            </div>

            {/* Resumen del período */}
            <div className="bg-blue-50 p-2 sm:p-3 rounded-xl text-center text-xs sm:text-sm font-bold text-blue-700">
                📅 Mostrando datos del período: <span className="font-black">{fechas.inicio}</span> al <span className="font-black">{fechas.fin}</span>
            </div>

            {/* CARDS DE RESUMEN - Grid responsivo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-4 sm:p-6 rounded-3xl text-white shadow-xl">
                    <p className="text-[10px] uppercase opacity-70 font-black tracking-widest">💰 Total Período</p>
                    <p className="text-2xl sm:text-3xl font-black mt-1 break-words">S/ {resumen.totalVendido.toFixed(2)}</p>
                    <p className="text-[10px] mt-2 opacity-50">{ventasFiltradas.length} ventas</p>
                </div>
                
                {Object.entries(resumen.metodos).map(([metodo, monto]) => {
                    const colores = {
                        'EFECTIVO': 'from-green-500 to-green-600',
                        'YAPE': 'from-purple-500 to-purple-600',
                        'VISA': 'from-blue-500 to-blue-600'
                    };
                    const bgColor = colores[metodo] || 'from-gray-500 to-gray-600';
                    
                    return (
                        <div key={metodo} className={`bg-gradient-to-br ${bgColor} p-4 sm:p-6 rounded-3xl text-white shadow-xl`}>
                            <p className="text-[10px] uppercase opacity-80 font-black tracking-widest">
                                {metodo === 'YAPE' ? '📱 YAPE / PLIN' : metodo === 'VISA' ? '💳 VISA' : '💵 EFECTIVO'}
                            </p>
                            <p className="text-xl sm:text-2xl font-black mt-1 break-words">S/ {monto.toFixed(2)}</p>
                            <p className="text-[10px] mt-2 opacity-60">
                                {((monto / resumen.totalVendido) * 100).toFixed(1)}% del total
                            </p>
                        </div>
                    );
                })}
            </div>

            {/* TABLA con scroll horizontal en móvil */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black">
                            <tr>
                                <th className="p-3 sm:p-5 border-b border-slate-100">📅 Fecha</th>
                                <th className="p-3 sm:p-5 border-b border-slate-100">🔢 Boleta</th>
                                <th className="p-3 sm:p-5 border-b border-slate-100">👤 Cliente</th>
                                <th className="p-3 sm:p-5 border-b border-slate-100">💳 Método</th>
                                <th className="p-3 sm:p-5 border-b border-slate-100 text-right">💰 Total</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {itemsActuales.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-8 sm:p-10 text-center text-slate-400 font-medium italic">
                                        No se encontraron ventas en el período seleccionado.
                                    </td>
                                </tr>
                            ) : (
                                itemsActuales.map((v) => (
                                    <tr key={v.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors">
                                        <td className="p-3 sm:p-5 text-slate-500">
                                            <span className="font-bold text-slate-700 block text-xs sm:text-sm">
                                                {new Date(v.fecha).toLocaleDateString()}
                                            </span>
                                            <span className="text-[10px] sm:text-xs text-slate-400">
                                                {new Date(v.fecha).toLocaleTimeString()}
                                            </span>
                                        </td>
                                        <td className="p-3 sm:p-5 font-black text-slate-800 font-mono tracking-tight text-xs sm:text-sm">
                                            B001-{String(v.id).padStart(6, '0')}
                                        </td>
                                        <td className="p-3 sm:p-5">
                                            <span className="block font-bold text-slate-700 text-xs sm:text-sm">
                                                {v.cliente?.nombre || 'Público General'}
                                            </span>
                                            <span className="text-[10px] text-slate-400">
                                                {v.cliente?.documento || 'Sin DNI'}
                                            </span>
                                        </td>
                                        <td className="p-3 sm:p-5">
                                            <span className={`inline-block px-2 sm:px-3 py-1 rounded-lg text-[10px] font-black whitespace-nowrap ${
                                                v.metodo_pago === 'EFECTIVO' ? 'bg-green-100 text-green-700' : 
                                                v.metodo_pago === 'YAPE' ? 'bg-purple-100 text-purple-700' : 
                                                'bg-blue-100 text-blue-700'
                                            }`}>
                                                {v.metodo_pago || 'EFECTIVO'}
                                            </span>
                                        </td>
                                        <td className="p-3 sm:p-5 text-right font-black text-blue-600 text-sm sm:text-base">
                                            S/ {v.total.toFixed(2)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* PAGINACIÓN RESPONSIVA */}
                {ventasFiltradas.length > 0 && (
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-3 p-4 bg-slate-50 border-t border-slate-100">
                        <button 
                            onClick={() => setPaginaActual(p => p - 1)} 
                            disabled={paginaActual === 1} 
                            className="w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-2.5 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-all shadow-sm"
                        >
                            ⬅️ Anterior
                        </button>
                        <span className="text-sm font-bold text-slate-500 order-first sm:order-none">
                            📄 Página <span className="text-blue-600 text-base">{paginaActual}</span> de {totalPaginas}
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
        </div>
    );
}