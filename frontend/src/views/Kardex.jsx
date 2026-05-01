import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import api from '../services/api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Kardex() {
    const [movimientos, setMovimientos] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [filtroTipo, setFiltroTipo] = useState('TODOS');
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');
    const [paginaActual, setPaginaActual] = useState(1);
    const filasPorPagina = 10;

    useEffect(() => {
        const cargarKardex = async () => {
            try {
                const res = await api.get('/productos/movimientos');
                setMovimientos(res.data);
            } catch (e) {
                toast.error("Error al cargar el historial de inventario.");
            }
        };
        cargarKardex();
    }, []);

    useEffect(() => { setPaginaActual(1); }, [busqueda, filtroTipo, fechaDesde, fechaHasta]);

    const movimientosFiltrados = movimientos.filter(m => {
        const termino = busqueda.toLowerCase();
        const coincideTexto =
            (m.producto?.nombre || '').toLowerCase().includes(termino) ||
            (m.motivo || '').toLowerCase().includes(termino);
        const coincideTipo = filtroTipo === 'TODOS' || m.tipo === filtroTipo;

        const fechaMov = new Date(m.fecha);
        const desde = fechaDesde ? new Date(fechaDesde + 'T00:00:00') : null;
        const hasta = fechaHasta ? new Date(fechaHasta + 'T23:59:59') : null;
        const coincideFecha = (!desde || fechaMov >= desde) && (!hasta || fechaMov <= hasta);

        return coincideTexto && coincideTipo && coincideFecha;
    });

    const indiceUltimoItem = paginaActual * filasPorPagina;
    const indicePrimerItem = indiceUltimoItem - filasPorPagina;
    const itemsActuales = movimientosFiltrados.slice(indicePrimerItem, indiceUltimoItem);
    const totalPaginas = Math.ceil(movimientosFiltrados.length / filasPorPagina);

    const limpiarFiltros = () => {
        setBusqueda('');
        setFiltroTipo('TODOS');
        setFechaDesde('');
        setFechaHasta('');
    };

    const exportarExcel = () => {
        if (movimientosFiltrados.length === 0) return toast.warning("No hay datos para exportar.");
        toast.info("Generando Excel...");
        const datosParaExcel = movimientosFiltrados.map(m => ({
            "Fecha": new Date(m.fecha).toLocaleDateString(),
            "Hora": new Date(m.fecha).toLocaleTimeString(),
            "Producto": m.producto?.nombre || 'Desconocido',
            "Categoría": m.producto?.categoria?.nombre || '---',
            "Tipo": m.tipo,
            "Cantidad (m)": m.cantidad,
            "Motivo": m.motivo
        }));
        const worksheet = XLSX.utils.json_to_sheet(datosParaExcel);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Kardex");
        XLSX.writeFile(workbook, `Kardex_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`);
        toast.success("Excel descargado.");
    };

    const exportarPDF = () => {
        if (movimientosFiltrados.length === 0) return toast.warning("No hay datos para exportar.");
        toast.info("Generando PDF...");
        const doc = new jsPDF();

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Kardex - Historial de Movimientos', 14, 15);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);

        let infoY = 22;
        doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, infoY); infoY += 6;
        if (busqueda) { doc.text(`Búsqueda: "${busqueda}"`, 14, infoY); infoY += 6; }
        if (filtroTipo !== 'TODOS') { doc.text(`Tipo: ${filtroTipo}`, 14, infoY); infoY += 6; }
        if (fechaDesde) { doc.text(`Desde: ${fechaDesde}`, 14, infoY); infoY += 6; }
        if (fechaHasta) { doc.text(`Hasta: ${fechaHasta}`, 14, infoY); infoY += 6; }

        const totalEntradas = movimientosFiltrados.filter(m => m.tipo === 'ENTRADA').reduce((s, m) => s + m.cantidad, 0);
        const totalSalidas = movimientosFiltrados.filter(m => m.tipo === 'SALIDA').reduce((s, m) => s + m.cantidad, 0);
        doc.setTextColor(0);
        doc.setFont('helvetica', 'bold');
        doc.text(`Entradas: +${totalEntradas.toFixed(1)}m  |  Salidas: -${totalSalidas.toFixed(1)}m  |  Registros: ${movimientosFiltrados.length}`, 14, infoY);
        infoY += 4;

        const datosTabla = movimientosFiltrados.map(m => [
            new Date(m.fecha).toLocaleString(),
            m.producto?.nombre || 'Desconocido',
            m.tipo,
            `${m.tipo === 'ENTRADA' ? '+' : '-'}${m.cantidad.toFixed(1)}m`,
            m.motivo
        ]);

        autoTable(doc, {
            startY: infoY + 4,
            head: [['Fecha y Hora', 'Producto', 'Tipo', 'Cantidad', 'Motivo']],
            body: datosTabla,
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229] },
            styles: { fontSize: 8 },
            didParseCell: (data) => {
                if (data.section === 'body' && data.column.index === 3) {
                    data.cell.styles.textColor = data.cell.raw.includes('+')
                        ? [22, 163, 74] : [220, 38, 38];
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        });

        doc.save(`Kardex_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`);
        toast.success("PDF generado.");
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border-t-4 border-indigo-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-slate-800">📊 Historial de Inventario (Kardex)</h2>
                <div className="flex gap-2 w-full md:w-auto">
                    <button onClick={exportarExcel} className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold text-sm">📥 Excel</button>
                    <button onClick={exportarPDF} className="flex-1 md:flex-none bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold text-sm">📄 PDF</button>
                </div>
            </div>

            {/* FILTROS */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6 space-y-3">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1">
                        <label className="block text-xs font-black text-slate-500 uppercase mb-1">Buscar</label>
                        <input type="text" placeholder="🔍 Producto o motivo..."
                            value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-indigo-500" />
                    </div>
                    <div className="w-full md:w-44">
                        <label className="block text-xs font-black text-slate-500 uppercase mb-1">Tipo</label>
                        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold text-slate-700 outline-none focus:border-indigo-500">
                            <option value="TODOS">Todos</option>
                            <option value="ENTRADA">🟢 Entradas</option>
                            <option value="SALIDA">🔴 Salidas</option>
                        </select>
                    </div>
                </div>
                <div className="flex flex-col md:flex-row gap-3 items-end">
                    <div className="flex-1">
                        <label className="block text-xs font-black text-slate-500 uppercase mb-1">Desde</label>
                        <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-indigo-500" />
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-black text-slate-500 uppercase mb-1">Hasta</label>
                        <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-indigo-500" />
                    </div>
                    <button onClick={limpiarFiltros}
                        className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-sm whitespace-nowrap">
                        🗑️ Limpiar
                    </button>
                </div>

                {/* RESUMEN ACTIVO */}
                {(fechaDesde || fechaHasta || busqueda || filtroTipo !== 'TODOS') && (
                    <div className="text-xs text-slate-500 font-medium pt-1">
                        Mostrando <span className="font-black text-indigo-600">{movimientosFiltrados.length}</span> registro(s) —
                        Entradas: <span className="font-black text-emerald-600">+{movimientosFiltrados.filter(m => m.tipo === 'ENTRADA').reduce((s, m) => s + m.cantidad, 0).toFixed(1)}m</span> —
                        Salidas: <span className="font-black text-red-500">-{movimientosFiltrados.filter(m => m.tipo === 'SALIDA').reduce((s, m) => s + m.cantidad, 0).toFixed(1)}m</span>
                    </div>
                )}
            </div>

            {/* TABLA */}
            <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider font-bold">
                            <th className="p-4 border-b border-slate-200">Fecha y Hora</th>
                            <th className="p-4 border-b border-slate-200">Producto</th>
                            <th className="p-4 border-b border-slate-200">Tipo</th>
                            <th className="p-4 border-b border-slate-200">Cantidad</th>
                            <th className="p-4 border-b border-slate-200">Motivo</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-slate-100">
                        {itemsActuales.length === 0 ? (
                            <tr><td colSpan="5" className="p-8 text-center text-slate-400 italic font-bold">No se encontraron movimientos.</td></tr>
                        ) : (
                            itemsActuales.map(m => (
                                <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 text-slate-500 font-mono">{new Date(m.fecha).toLocaleString()}</td>
                                    <td className="p-4">
                                        <span className="font-bold text-slate-700">{m.producto?.nombre}</span>
                                        <p className="text-[10px] text-slate-400 uppercase">{m.producto?.categoria?.nombre}</p>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black ${m.tipo === 'ENTRADA' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {m.tipo}
                                        </span>
                                    </td>
                                    <td className={`p-4 font-black text-lg ${m.tipo === 'ENTRADA' ? 'text-green-600' : 'text-red-600'}`}>
                                        {m.tipo === 'ENTRADA' ? '+' : '-'}{m.cantidad.toFixed(1)} <span className="text-xs font-normal">m</span>
                                    </td>
                                    <td className="p-4 italic text-slate-500">{m.motivo}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {movimientosFiltrados.length > 0 && (
                    <div className="flex justify-between items-center p-4 bg-slate-50 border-t border-slate-200">
                        <button onClick={() => setPaginaActual(p => p - 1)} disabled={paginaActual === 1}
                            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-100 shadow-sm">
                            ⬅️ Anterior
                        </button>
                        <span className="text-sm font-bold text-slate-500">
                            Página <span className="text-indigo-600">{paginaActual}</span> de {totalPaginas || 1}
                        </span>
                        <button onClick={() => setPaginaActual(p => p + 1)} disabled={paginaActual >= totalPaginas}
                            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-100 shadow-sm">
                            Siguiente ➡️
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}