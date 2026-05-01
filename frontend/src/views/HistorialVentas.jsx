import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import api from '../services/api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function HistorialVentas() {
    const [ventas, setVentas] = useState([]);
    const [cargando, setCargando] = useState(true);
    
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('TODOS');
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');

    const [paginaActual, setPaginaActual] = useState(1);
    const filasPorPagina = 10;

    const usuarioString = localStorage.getItem('usuario');
    const usuario = usuarioString ? JSON.parse(usuarioString) : {};

    useEffect(() => { cargarVentas(); }, []);
    useEffect(() => { setPaginaActual(1); }, [busqueda, filtroEstado, fechaDesde, fechaHasta]);

    const cargarVentas = async () => {
        try {
            const res = await api.get('/ventas');
            setVentas(res.data);
        } catch (error) {
            toast.error("Error al cargar el historial de ventas.");
        } finally {
            setCargando(false);
        }
    };

    const anularVenta = async (idVenta) => {
        const confirmar = window.confirm("⚠️ ¿Estás seguro de anular esta boleta?\n\nEl dinero se restará de la caja y la tela volverá al inventario.");
        if (confirmar) {
            try {
                await api.put(`/ventas/${idVenta}/anular`);
                toast.success("Venta anulada. Stock devuelto.");
                cargarVentas();
            } catch (error) {
                toast.error("Error al anular: " + (error.response?.data?.error || ""));
            }
        }
    };

    const ventasFiltradas = ventas.filter(v => {
        const termino = busqueda.toLowerCase();
        const boleta = `B001-${String(v.id).padStart(6, '0')}`.toLowerCase();
        const cliente = (v.cliente?.nombre || 'público general').toLowerCase();
        const coincideTexto = boleta.includes(termino) || cliente.includes(termino);

        const estadoActual = v.estado || 'ACTIVA';
        const coincideEstado = filtroEstado === 'TODOS' || estadoActual === filtroEstado;

        const fechaVenta = new Date(v.fecha);
        const desde = fechaDesde ? new Date(fechaDesde + 'T00:00:00') : null;
        const hasta = fechaHasta ? new Date(fechaHasta + 'T23:59:59') : null;
        const coincideFecha = (!desde || fechaVenta >= desde) && (!hasta || fechaVenta <= hasta);

        return coincideTexto && coincideEstado && coincideFecha;
    });

    const indiceUltimoItem = paginaActual * filasPorPagina;
    const indicePrimerItem = indiceUltimoItem - filasPorPagina;
    const itemsActuales = ventasFiltradas.slice(indicePrimerItem, indiceUltimoItem);
    const totalPaginas = Math.ceil(ventasFiltradas.length / filasPorPagina);

    const limpiarFiltros = () => {
        setBusqueda('');
        setFiltroEstado('TODOS');
        setFechaDesde('');
        setFechaHasta('');
    };

    const exportarExcel = () => {
        if (ventasFiltradas.length === 0) return toast.warning("No hay datos para exportar.");
        toast.info("Generando archivo Excel...");
        const datosParaExcel = ventasFiltradas.map(v => ({
            "Boleta": `B001-${String(v.id).padStart(6, '0')}`,
            "Fecha y Hora": new Date(v.fecha).toLocaleString(),
            "Cliente": v.cliente?.nombre || 'Público General',
            "DNI/RUC": v.cliente?.documento || '---',
            "Método de Pago": v.metodo_pago || '---',
            "Total (S/)": parseFloat(v.total?.toFixed(2)),
            "Estado": v.estado || 'ACTIVA'
        }));
        const worksheet = XLSX.utils.json_to_sheet(datosParaExcel);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Historial_Ventas");
        XLSX.writeFile(workbook, `Historial_Ventas_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`);
        toast.success("Excel descargado.");
    };

    const exportarPDF = () => {
        if (ventasFiltradas.length === 0) return toast.warning("No hay datos para exportar.");
        toast.info("Generando PDF...");
        const doc = new jsPDF();

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Historial de Ventas', 14, 15);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);

        let infoY = 22;
        doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, infoY); infoY += 6;
        if (busqueda) { doc.text(`Búsqueda: "${busqueda}"`, 14, infoY); infoY += 6; }
        if (filtroEstado !== 'TODOS') { doc.text(`Estado: ${filtroEstado}`, 14, infoY); infoY += 6; }
        if (fechaDesde) { doc.text(`Desde: ${fechaDesde}`, 14, infoY); infoY += 6; }
        if (fechaHasta) { doc.text(`Hasta: ${fechaHasta}`, 14, infoY); infoY += 6; }

        // Totales resumen
        const totalGeneral = ventasFiltradas.filter(v => v.estado !== 'ANULADA').reduce((s, v) => s + v.total, 0);
        doc.setTextColor(0);
        doc.setFont('helvetica', 'bold');
        doc.text(`Total del período: S/ ${totalGeneral.toFixed(2)}  |  Registros: ${ventasFiltradas.length}`, 14, infoY);
        infoY += 4;

        const datosTabla = ventasFiltradas.map(v => [
            `B001-${String(v.id).padStart(6, '0')}`,
            new Date(v.fecha).toLocaleString(),
            v.cliente?.nombre || 'Público General',
            v.metodo_pago || '---',
            `S/ ${v.total?.toFixed(2)}`,
            v.estado || 'ACTIVA'
        ]);

        autoTable(doc, {
            startY: infoY + 4,
            head: [['Boleta', 'Fecha', 'Cliente', 'Método', 'Total', 'Estado']],
            body: datosTabla,
            theme: 'grid',
            headStyles: { fillColor: [59, 130, 246] },
            styles: { fontSize: 8 },
            didParseCell: (data) => {
                if (data.section === 'body' && data.column.index === 5) {
                    data.cell.styles.textColor = data.cell.raw === 'ANULADA'
                        ? [220, 38, 38] : [22, 163, 74];
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        });

        doc.save(`Historial_Ventas_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`);
        toast.success("PDF generado.");
    };

    if (cargando) return <div className="p-10 text-center text-slate-500 font-bold animate-pulse">Cargando historial...</div>;

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 border-t-4 border-blue-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800">📋 Historial de Ventas</h2>
                    <p className="text-sm text-slate-500">Supervisa las transacciones y anula errores</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <button onClick={exportarExcel} className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold text-sm">📥 Excel</button>
                    <button onClick={exportarPDF} className="flex-1 md:flex-none bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold text-sm">📄 PDF</button>
                </div>
            </div>

            {/* FILTROS */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 space-y-3">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1">
                        <label className="block text-xs font-black text-slate-500 uppercase mb-1">Buscar</label>
                        <input
                            type="text" placeholder="🔍 Boleta o cliente..."
                            value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                        />
                    </div>
                    <div className="w-full md:w-44">
                        <label className="block text-xs font-black text-slate-500 uppercase mb-1">Estado</label>
                        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold text-slate-700 outline-none focus:border-blue-500">
                            <option value="TODOS">Todos</option>
                            <option value="ACTIVA">🟢 Activas</option>
                            <option value="ANULADA">🔴 Anuladas</option>
                        </select>
                    </div>
                </div>
                <div className="flex flex-col md:flex-row gap-3 items-end">
                    <div className="flex-1">
                        <label className="block text-xs font-black text-slate-500 uppercase mb-1">Desde</label>
                        <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500" />
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-black text-slate-500 uppercase mb-1">Hasta</label>
                        <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500" />
                    </div>
                    <button onClick={limpiarFiltros}
                        className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-sm transition-all whitespace-nowrap">
                        🗑️ Limpiar
                    </button>
                </div>

                {/* RESUMEN DE FILTRO ACTIVO */}
                {(fechaDesde || fechaHasta || busqueda || filtroEstado !== 'TODOS') && (
                    <div className="text-xs text-slate-500 font-medium pt-1">
                        Mostrando <span className="font-black text-blue-600">{ventasFiltradas.length}</span> resultado(s) —
                        Total activas: <span className="font-black text-emerald-600">
                            S/ {ventasFiltradas.filter(v => v.estado !== 'ANULADA').reduce((s, v) => s + v.total, 0).toFixed(2)}
                        </span>
                    </div>
                )}
            </div>

            {/* TABLA */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                        <tr>
                            <th className="p-4 border-b border-slate-200">Boleta</th>
                            <th className="p-4 border-b border-slate-200">Fecha</th>
                            <th className="p-4 border-b border-slate-200">Cliente</th>
                            <th className="p-4 border-b border-slate-200">Método</th>
                            <th className="p-4 border-b border-slate-200">Total</th>
                            <th className="p-4 border-b border-slate-200">Estado</th>
                            {usuario.rol === 'Administrador' && <th className="p-4 border-b border-slate-200 text-center">Acciones</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {itemsActuales.length === 0 ? (
                            <tr><td colSpan="7" className="p-8 text-center text-slate-400 italic font-bold">No se encontraron ventas con esos filtros.</td></tr>
                        ) : (
                            itemsActuales.map((v) => (
                                <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 font-mono font-bold text-slate-700">B001-{String(v.id).padStart(6, '0')}</td>
                                    <td className="p-4 text-slate-600">{new Date(v.fecha).toLocaleString()}</td>
                                    <td className="p-4 text-slate-800 font-medium">{v.cliente?.nombre || 'Público General'}</td>
                                    <td className="p-4 text-slate-600 text-xs font-bold">{v.metodo_pago || '---'}</td>
                                    <td className="p-4 font-black text-blue-600">S/ {v.total?.toFixed(2)}</td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black ${v.estado === 'ANULADA' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                            {v.estado || 'ACTIVA'}
                                        </span>
                                    </td>
                                    {usuario.rol === 'Administrador' && (
                                        <td className="p-4 text-center">
                                            {(v.estado === 'ACTIVA' || !v.estado) ? (
                                                <button onClick={() => anularVenta(v.id)}
                                                    className="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-3 py-1 rounded-lg text-xs">
                                                    🚫 Anular
                                                </button>
                                            ) : (
                                                <span className="text-slate-400 text-xs italic">Sin acciones</span>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {ventasFiltradas.length > 0 && (
                    <div className="flex justify-between items-center p-4 bg-slate-50 border-t border-slate-200">
                        <button onClick={() => setPaginaActual(p => p - 1)} disabled={paginaActual === 1}
                            className="px-4 py-2 bg-white border border-slate-200 shadow-sm rounded-lg text-sm font-bold disabled:opacity-40 hover:bg-slate-100 text-slate-600">
                            ⬅️ Anterior
                        </button>
                        <span className="text-sm font-bold text-slate-500">
                            Página <span className="text-blue-600">{paginaActual}</span> de {totalPaginas || 1}
                        </span>
                        <button onClick={() => setPaginaActual(p => p + 1)} disabled={paginaActual >= totalPaginas}
                            className="px-4 py-2 bg-white border border-slate-200 shadow-sm rounded-lg text-sm font-bold disabled:opacity-40 hover:bg-slate-100 text-slate-600">
                            Siguiente ➡️
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}