import { useState, useEffect } from 'react';
import api from '../services/api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; 
import { toast } from 'sonner';

export default function Reportes() {
    const [ventas, setVentas] = useState([]);
    const [resumen, setResumen] = useState({ totalVendido: 0, metodos: {} });
    const [cargando, setCargando] = useState(false);
    
    const [fechas, setFechas] = useState({ 
        inicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], 
        fin: new Date().toISOString().split('T')[0] 
    });

    const [paginaActual, setPaginaActual] = useState(1);
    const filasPorPagina = 10;

    const cargarReporte = async () => {
        setCargando(true);
        try {
            const res = await api.get(`/ventas/reporte/detallado`, {
                params: { inicio: fechas.inicio, fin: fechas.fin }
            });

            if (res.data) {
                setVentas(res.data.ventas || []);
                setResumen(res.data.resumen || { totalVendido: 0, metodos: {} });
            }
            setPaginaActual(1); 
        } catch (e) {
            console.error("ERROR CARGANDO REPORTE:", e);
            toast.error("Error al cargar el reporte detallado.");
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => { cargarReporte(); }, []);

    const indiceUltimoItem = paginaActual * filasPorPagina;
    const indicePrimerItem = indiceUltimoItem - filasPorPagina;
    const itemsActuales = ventas.slice(indicePrimerItem, indiceUltimoItem);
    const totalPaginas = Math.ceil(ventas.length / filasPorPagina);

    const exportarExcel = () => {
        if (ventas.length === 0) return toast.warning("No hay datos para exportar.");
        const datosParaExcel = ventas.map(v => ({
            "Fecha": new Date(v.fecha).toLocaleDateString(),
            "Hora": new Date(v.fecha).toLocaleTimeString(),
            "Nro Boleta": `B001-${String(v.id).padStart(6, '0')}`,
            "Cliente": v.cliente?.nombre || 'Público General',
            "Método de Pago": v.metodo_pago,
            "Total Final (S/)": parseFloat(v.total.toFixed(2))
        }));
        const worksheet = XLSX.utils.json_to_sheet(datosParaExcel);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Ventas_Detalladas");
        XLSX.writeFile(workbook, `Reporte_Ventas_${fechas.inicio}_al_${fechas.fin}.xlsx`);
    };

    const exportarPDF = () => {
        if (!ventas || ventas.length === 0) return toast.warning("No hay datos para exportar.");
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(37, 99, 235);
        doc.text('Reporte de Ventas Detallado', 14, 15);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(`Periodo: ${fechas.inicio} al ${fechas.fin}`, 14, 22);
        const total = resumen?.totalVendido || 0;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(`Total Recaudado: S/ ${Number(total).toFixed(2)}`, 14, 30);

        const datosTabla = ventas.map(v => [
            new Date(v.fecha).toLocaleDateString('es-PE'),
            `B001-${String(v.id).padStart(6, '0')}`,
            v.cliente?.nombre || 'Público General',
            String(v.metodo_pago || '').toUpperCase(),
            `S/ ${Number(v.total).toFixed(2)}`
        ]);

        autoTable(doc, {
            startY: 35,
            head: [['Fecha', 'Nro. Boleta', 'Cliente', 'Método', 'Total']],
            body: datosTabla,
            theme: 'grid',
            headStyles: { fillColor: [37, 99, 235], fontSize: 10, halign: 'center' },
            columnStyles: { 4: { halign: 'right', fontStyle: 'bold' } },
            styles: { fontSize: 9 }
        });
        doc.save(`Reporte_Ventas_${fechas.inicio}_al_${fechas.fin}.pdf`);
    };

    return (
        <div className="space-y-6 p-4 max-w-full">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">📊 Reportes y Auditoría</h2>

            {/* SECCIÓN DE FILTROS Y BOTONES RESPONSIVA */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Desde</label>
                        <input type="date" className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 font-medium text-slate-700" value={fechas.inicio} onChange={(e) => setFechas({...fechas, inicio: e.target.value})} />
                    </div>
                    <div className="flex-1">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Hasta</label>
                        <input type="date" className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 font-medium text-slate-700" value={fechas.fin} onChange={(e) => setFechas({...fechas, fin: e.target.value})} />
                    </div>
                </div>
                
                {/* BOTONES: Se apilan en móvil, se alinean en tablet/pc */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button onClick={cargarReporte} disabled={cargando} className="bg-blue-600 text-white p-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all">🔍 Filtrar</button>
                    <button onClick={exportarExcel} disabled={ventas.length === 0} className="bg-emerald-600 text-white p-3 rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all">📥 Excel</button>
                    <button onClick={exportarPDF} disabled={ventas.length === 0} className="bg-red-600 text-white p-3 rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-100 transition-all">📄 PDF</button>
                </div>
            </div>

            {/* CARDS DE RESUMEN: 1 columna en móvil, 4 en desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-800 p-6 rounded-3xl text-white shadow-xl shadow-slate-200">
                    <p className="text-[10px] uppercase opacity-70 font-black tracking-widest">Total Rango</p>
                    <p className="text-3xl font-black mt-1">S/ {resumen.totalVendido.toFixed(2)}</p>
                </div>
                {Object.entries(resumen.metodos).map(([metodo, monto]) => (
                    <div key={metodo} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <p className="text-[10px] uppercase text-slate-400 font-black tracking-widest">{metodo}</p>
                        <p className="text-2xl font-black text-slate-700 mt-1">S/ {monto.toFixed(2)}</p>
                    </div>
                ))}
            </div>

            {/* TABLA CON SCROLL LATERAL PARA MÓVIL */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px] text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black">
                            <tr>
                                <th className="p-5 border-b border-slate-100">Fecha y Hora</th>
                                <th className="p-5 border-b border-slate-100">Nro Boleta</th>
                                <th className="p-5 border-b border-slate-100">Cliente</th>
                                <th className="p-5 border-b border-slate-100">Método</th>
                                <th className="p-5 border-b border-slate-100 text-right">Monto Total</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {cargando ? (
                                <tr><td colSpan="5" className="p-10 text-center text-slate-400 font-bold animate-pulse">Obteniendo registros...</td></tr>
                            ) : itemsActuales.length === 0 ? (
                                <tr><td colSpan="5" className="p-10 text-center text-slate-400 font-medium italic">No se encontraron ventas.</td></tr>
                            ) : (
                                itemsActuales.map((v) => (
                                    <tr key={v.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors">
                                        <td className="p-5 text-slate-500">
                                            <span className="font-bold text-slate-700 block">{new Date(v.fecha).toLocaleDateString()}</span>
                                            <span className="text-xs">{new Date(v.fecha).toLocaleTimeString()}</span>
                                        </td>
                                        <td className="p-5 font-black text-slate-800 font-mono tracking-tight text-xs sm:text-sm">B001-{String(v.id).padStart(6, '0')}</td>
                                        <td className="p-5">
                                            <span className="block font-bold text-slate-700 text-xs sm:text-sm">{v.cliente?.nombre || 'Público General'}</span>
                                            <span className="text-[10px] text-slate-400">{v.cliente?.documento || 'Sin DNI'}</span>
                                        </td>
                                        <td className="p-5">
                                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black ${v.metodo_pago === 'EFECTIVO' ? 'bg-emerald-100 text-emerald-700' : v.metodo_pago === 'YAPE' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {v.metodo_pago}
                                            </span>
                                        </td>
                                        <td className="p-5 text-right font-black text-blue-600 text-base sm:text-lg">S/ {v.total.toFixed(2)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* PAGINACIÓN RESPONSIVA */}
                {ventas.length > 0 && (
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 bg-slate-50 border-t border-slate-100">
                        <button onClick={() => setPaginaActual(paginaActual - 1)} disabled={paginaActual === 1} className="w-full sm:w-auto px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 disabled:opacity-40 shadow-sm">⬅️ Anterior</button>
                        <span className="text-sm font-bold text-slate-500 order-first sm:order-none">Página {paginaActual} de {totalPaginas}</span>
                        <button onClick={() => setPaginaActual(paginaActual + 1)} disabled={paginaActual >= totalPaginas} className="w-full sm:w-auto px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 disabled:opacity-40 shadow-sm">Siguiente ➡️</button>
                    </div>
                )}
            </div>
        </div>
    );
}