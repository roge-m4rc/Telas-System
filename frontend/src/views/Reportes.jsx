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
            const metodo = v.metodo_pago || 'OTROS';
            metodos[metodo] = (metodos[metodo] || 0) + v.total;
        });
        return { totalVendido, metodos };
    }, [ventasFiltradas]);

    const itemsActuales = ventasFiltradas.slice((paginaActual - 1) * filasPorPagina, paginaActual * filasPorPagina);
    const totalPaginas = Math.ceil(ventasFiltradas.length / filasPorPagina);

    const exportarExcel = () => {
        if (ventasFiltradas.length === 0) return toast.warning("No hay datos");
        const datos = ventasFiltradas.map(v => ({
            "Fecha": new Date(v.fecha).toLocaleDateString(),
            "Boleta": `B001-${String(v.id).padStart(6, '0')}`,
            "Cliente": v.cliente?.nombre || 'Público',
            "Método": v.metodo_pago,
            "Total": v.total
        }));
        const ws = XLSX.utils.json_to_sheet(datos);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Reporte");
        XLSX.writeFile(wb, `Reporte_${fechas.inicio}_al_${fechas.fin}.xlsx`);
        toast.success("Excel listo");
    };

    const exportarPDF = () => {
        if (ventasFiltradas.length === 0) return toast.warning("No hay datos");
        const doc = new jsPDF();
        doc.text(`Reporte de Ventas: ${fechas.inicio} al ${fechas.fin}`, 14, 15);
        doc.text(`Total: S/ ${resumen.totalVendido.toFixed(2)}`, 14, 22);
        
        const datos = ventasFiltradas.map(v => [
            new Date(v.fecha).toLocaleDateString(),
            `B001-${String(v.id).padStart(6, '0')}`,
            v.cliente?.nombre || 'Público',
            `S/ ${v.total.toFixed(2)}`
        ]);
        
        autoTable(doc, { startY: 30, head: [['Fecha', 'Boleta', 'Cliente', 'Total']], body: datos });
        doc.save(`Reporte_${fechas.inicio}_al_${fechas.fin}.pdf`);
        toast.success("PDF listo");
    };

    if (cargando) return <div className="p-10 text-center animate-pulse">Cargando...</div>;

    return (
        <div className="p-6 space-y-6">
            <h2 className="text-2xl font-black">📊 Reportes de Ventas</h2>

            <div className="bg-white p-4 rounded-xl shadow-sm">
                <div className="flex gap-4 mb-4">
                    <input type="date" value={fechas.inicio} onChange={(e) => setFechas({...fechas, inicio: e.target.value})} className="flex-1 p-2 border rounded-lg" />
                    <input type="date" value={fechas.fin} onChange={(e) => setFechas({...fechas, fin: e.target.value})} className="flex-1 p-2 border rounded-lg" />
                    <button onClick={exportarExcel} className="bg-emerald-600 text-white px-4 py-2 rounded-lg">📥 Excel</button>
                    <button onClick={exportarPDF} className="bg-red-600 text-white px-4 py-2 rounded-lg">📄 PDF</button>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-slate-800 p-4 rounded-xl text-white">
                        <p className="text-xs">Total</p>
                        <p className="text-2xl font-black">S/ {resumen.totalVendido.toFixed(2)}</p>
                    </div>
                    {Object.entries(resumen.metodos).map(([metodo, monto]) => (
                        <div key={metodo} className="bg-white border p-4 rounded-xl">
                            <p className="text-xs text-slate-400">{metodo}</p>
                            <p className="text-xl font-black">S/ {monto.toFixed(2)}</p>
                        </div>
                    ))}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                            <tr><th className="p-3">Fecha</th><th>Boleta</th><th>Cliente</th><th>Total</th></tr>
                        </thead>
                        <tbody>
                            {itemsActuales.map(v => (
                                <tr key={v.id} className="border-b">
                                    <td className="p-3">{new Date(v.fecha).toLocaleDateString()}</td>
                                    <td className="p-3 font-mono">B001-{String(v.id).padStart(6, '0')}</td>
                                    <td className="p-3">{v.cliente?.nombre || 'Público'}</td>
                                    <td className="p-3 font-bold">S/ {v.total.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {ventasFiltradas.length > 0 && (
                    <div className="flex justify-between mt-4">
                        <button disabled={paginaActual === 1} onClick={() => setPaginaActual(p => p - 1)} className="px-5 py-2.5 bg-white border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-all">⬅️ Anterior</button>
                        <span>Página {paginaActual} de {totalPaginas}</span>
                        <button disabled={paginaActual >= totalPaginas} onClick={() => setPaginaActual(p => p + 1)} className="px-5 py-2.5 bg-white border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-all">Siguiente ➡️</button>
                    </div>
                )}
            </div>
        </div>
    );
}