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

    // Cargar TODOS los movimientos UNA SOLA VEZ desde la ruta VIEJA (que sí funciona)
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

    // Filtrar en memoria (rápido y sin depender del backend)
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
            "Fecha": new Date(m.fecha).toLocaleDateString(),
            "Producto": m.producto?.nombre,
            "Tipo": m.tipo,
            "Cantidad": m.cantidad,
            "Motivo": m.motivo
        }));
        const ws = XLSX.utils.json_to_sheet(datos);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Kardex");
        XLSX.writeFile(wb, `Kardex_${fechaDesde}_al_${fechaHasta}.xlsx`);
        toast.success("Excel descargado.");
    };

    const exportarPDF = () => {
        if (movimientosFiltrados.length === 0) return toast.warning("No hay datos para exportar.");
        const doc = new jsPDF();
        doc.text(`Kardex: ${fechaDesde} al ${fechaHasta}`, 14, 15);
        doc.text(`Entradas: +${totalEntradas.toFixed(1)}m | Salidas: -${totalSalidas.toFixed(1)}m`, 14, 22);
        
        const datos = movimientosFiltrados.map(m => [
            new Date(m.fecha).toLocaleString(),
            m.producto?.nombre || '---',
            m.tipo,
            `${m.tipo === 'ENTRADA' ? '+' : '-'}${m.cantidad.toFixed(1)}m`,
            m.motivo || '---'
        ]);
        
        autoTable(doc, { startY: 30, head: [['Fecha', 'Producto', 'Tipo', 'Cantidad', 'Motivo']], body: datos });
        doc.save(`Kardex_${fechaDesde}_al_${fechaHasta}.pdf`);
        toast.success("PDF generado.");
    };

    if (cargando) return <div className="p-10 text-center animate-pulse">Cargando kardex...</div>;

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border-t-4 border-indigo-500">
            <div className="flex justify-between mb-6">
                <h2 className="text-2xl font-black">📊 Kardex - Movimientos de Inventario</h2>
                <div className="flex gap-2">
                    <button onClick={exportarExcel} className="bg-emerald-600 text-white px-4 py-2 rounded-lg">📥 Excel</button>
                    <button onClick={exportarPDF} className="bg-red-600 text-white px-4 py-2 rounded-lg">📄 PDF</button>
                </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl mb-6 space-y-3">
                <div className="flex gap-3">
                    <input type="text" placeholder="🔍 Producto o motivo..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="flex-1 p-2 border rounded-lg" />
                    <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="p-2 border rounded-lg">
                        <option value="TODOS">Todos</option>
                        <option value="ENTRADA">🟢 Entradas</option>
                        <option value="SALIDA">🔴 Salidas</option>
                    </select>
                </div>
                <div className="flex gap-3">
                    <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="flex-1 p-2 border rounded-lg" />
                    <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="flex-1 p-2 border rounded-lg" />
                    <button onClick={limpiarFiltros} className="px-4 py-2 bg-slate-200 rounded-lg">🗑️ Limpiar</button>
                </div>
                <div className="text-xs text-slate-500">
                    📅 Mostrando {movimientosFiltrados.length} movimientos del {fechaDesde} al {fechaHasta} — 
                    Entradas: <span className="text-green-600">+{totalEntradas.toFixed(1)}m</span> — 
                    Salidas: <span className="text-red-500">-{totalSalidas.toFixed(1)}m</span>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="p-3">Fecha y Hora</th>
                            <th className="p-3">Producto</th>
                            <th className="p-3">Tipo</th>
                            <th className="p-3">Cantidad</th>
                            <th className="p-3">Motivo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {itemsActuales.length === 0 ? (
                            <tr><td colSpan="5" className="p-10 text-center text-slate-400">No hay movimientos en este período</td></tr>
                        ) : (
                            itemsActuales.map(m => (
                                <tr key={m.id} className="border-b">
                                    <td className="p-3 text-slate-500">{new Date(m.fecha).toLocaleString()}</td>
                                    <td className="p-3 font-bold">{m.producto?.nombre}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded-full text-[10px] ${m.tipo === 'ENTRADA' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {m.tipo}
                                        </span>
                                    </td>
                                    <td className={`p-3 font-black ${m.tipo === 'ENTRADA' ? 'text-green-600' : 'text-red-600'}`}>
                                        {m.tipo === 'ENTRADA' ? '+' : '-'}{m.cantidad.toFixed(1)}m
                                    </td>
                                    <td className="p-3 italic text-slate-500">{m.motivo}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {movimientosFiltrados.length > 0 && (
                <div className="flex justify-between mt-4">
                    <button disabled={paginaActual === 1} onClick={() => setPaginaActual(p => p - 1)} className="px-4 py-2 border rounded-lg">⬅️ Anterior</button>
                    <span>Página {paginaActual} de {totalPaginas}</span>
                    <button disabled={paginaActual >= totalPaginas} onClick={() => setPaginaActual(p => p + 1)} className="px-4 py-2 border rounded-lg">Siguiente ➡️</button>
                </div>
            )}
        </div>
    );
}