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
            // Log para ver qué fechas estamos mandando realmente
            console.log("Enviando fechas:", fechas.inicio, fechas.fin);
            
            const res = await api.get(`/ventas/reporte/detallado`, {
                params: { inicio: fechas.inicio, fin: fechas.fin }
            });

            // Verificamos que los datos existan antes de setearlos
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

    // 📄 FUNCIÓN PDF CORREGIDA
    const exportarPDF = () => {
        if (ventas.length === 0) return toast.warning("No hay datos para exportar.");
        
        const doc = new jsPDF();
        
        // Título
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Reporte de Ventas Detallado', 14, 15);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Desde: ${fechas.inicio}  Hasta: ${fechas.fin}`, 14, 22);
        doc.text(`Total Recaudado: S/ ${resumen.totalVendido.toFixed(2)}`, 14, 28);

        // Transformar ventas a formato de tabla para jsPDF
        const datosTabla = ventas.map(v => [
            new Date(v.fecha).toLocaleDateString(),
            `B001-${String(v.id).padStart(6, '0')}`,
            v.cliente?.nombre || 'Público General',
            v.metodo_pago,
            `S/ ${v.total.toFixed(2)}`
        ]);

        // FORMA INFALIBLE DE USAR AUTOTABLE
        autoTable(doc, {
            startY: 35,
            head: [['Fecha', 'Boleta', 'Cliente', 'Método', 'Total']],
            body: datosTabla,
            theme: 'grid',
            headStyles: { fillColor: [37, 99, 235] } 
        });

        doc.save(`Reporte_Ventas_${fechas.inicio}_al_${fechas.fin}.pdf`);
    };

    return (
        <div className="space-y-6 p-4">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">📊 Reportes de Venta y Auditoría</h2>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-6 items-end justify-between">
                <div className="flex flex-wrap gap-4 w-full md:w-auto">
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase mb-2">Desde</label>
                        <input type="date" className="border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 font-medium text-slate-700" value={fechas.inicio} onChange={(e) => setFechas({...fechas, inicio: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase mb-2">Hasta</label>
                        <input type="date" className="border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 font-medium text-slate-700" value={fechas.fin} onChange={(e) => setFechas({...fechas, fin: e.target.value})} />
                    </div>
                </div>
                
                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <button onClick={cargarReporte} disabled={cargando} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100">🔍 Filtrar</button>
                    <button onClick={exportarExcel} disabled={ventas.length === 0} className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-100">📥 Excel</button>
                    <button onClick={exportarPDF} disabled={ventas.length === 0} className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-100">📄 PDF</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:flex md:items-end gap-4">
                <div className="bg-slate-800 p-6 rounded-3xl text-white shadow-xl shadow-slate-200">
                    <p className="text-[10px] uppercase opacity-70 font-black tracking-widest">Total Rango</p>
                    <p className="text-3xl font-black mt-1">S/ {resumen.totalVendido.toFixed(2)}</p>
                </div>
                {Object.entries(resumen.metodos).map(([metodo, monto]) => (
                    <div key={metodo} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-center">
                        <p className="text-[10px] uppercase text-slate-400 font-black tracking-widest">{metodo}</p>
                        <p className="text-2xl font-black text-slate-700 mt-1">S/ {monto.toFixed(2)}</p>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
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
                            {cargando ? <tr><td colSpan="5" className="p-10 text-center text-slate-400 font-bold animate-pulse">Obteniendo registros...</td></tr> : 
                                itemsActuales.length === 0 ? <tr><td colSpan="5" className="p-10 text-center text-slate-400 font-medium italic">No se encontraron ventas.</td></tr> :
                                itemsActuales.map((v) => (
                                    // LA TABLA CHULA ORIGINAL:
                                    <tr key={v.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors">
                                        <td className="p-5 text-slate-500">
                                            <span className="font-bold text-slate-700 block">{new Date(v.fecha).toLocaleDateString()}</span>
                                            <span className="text-xs">{new Date(v.fecha).toLocaleTimeString()}</span>
                                        </td>
                                        <td className="p-5 font-black text-slate-800 font-mono tracking-tight">B001-{String(v.id).padStart(6, '0')}</td>
                                        <td className="p-5">
                                            <span className="block font-bold text-slate-700">{v.cliente?.nombre || 'Público General'}</span>
                                            <span className="text-xs text-slate-400">{v.cliente?.documento || 'Sin DNI'}</span>
                                        </td>
                                        <td className="p-5 text-xs font-black">
                                            {/* AQUÍ VUELVEN LOS COLORES */}
                                            <span className={`px-3 py-1.5 rounded-lg ${v.metodo_pago === 'EFECTIVO' ? 'bg-emerald-100 text-emerald-700' : v.metodo_pago === 'YAPE' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {v.metodo_pago}
                                            </span>
                                        </td>
                                        <td className="p-5 text-right font-black text-blue-600 text-lg">S/ {v.total.toFixed(2)}</td>
                                    </tr>
                                ))
                            }
                        </tbody>
                    </table>
                </div>

                {ventas.length > 0 && (
                    <div className="flex justify-between items-center p-4 bg-slate-50 border-t border-slate-100">
                        <button onClick={() => setPaginaActual(paginaActual - 1)} disabled={paginaActual === 1} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-100 shadow-sm transition-all">⬅️ Anterior</button>
                        <span className="text-sm font-bold text-slate-500">Página <span className="text-blue-600">{paginaActual}</span> de {totalPaginas}</span>
                        <button onClick={() => setPaginaActual(paginaActual + 1)} disabled={paginaActual >= totalPaginas} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-100 shadow-sm transition-all">Siguiente ➡️</button>
                    </div>
                )}
            </div>
        </div>
    );
}