import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import api from '../services/api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import Swal from 'sweetalert2';
import autoTable from 'jspdf-autotable';

const obtenerFechaLocalPeru = () => {
    const fecha = new Date();
    const opciones = { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' };
    const formateador = new Intl.DateTimeFormat('fr-CA', opciones);
    return formateador.format(fecha);
};

export default function HistorialVentas() {
    const [ventasTotales, setVentasTotales] = useState([]);
    const [cargando, setCargando] = useState(true);
    
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('TODOS');
    
    const fechaHoy = obtenerFechaLocalPeru();
    const [fechaDesde, setFechaDesde] = useState(fechaHoy);
    const [fechaHasta, setFechaHasta] = useState(fechaHoy);

    const [paginaActual, setPaginaActual] = useState(1);
    const filasPorPagina = 10;

    const usuarioString = localStorage.getItem('usuario');
    const usuario = usuarioString ? JSON.parse(usuarioString) : {};

    // Cargar TODAS las ventas UNA SOLA VEZ
    useEffect(() => {
        cargarTodasLasVentas();
    }, []);

    const cargarTodasLasVentas = async () => {
        try {
            const res = await api.get('/ventas');
            console.log(`📦 Ventas totales cargadas: ${res.data.length}`);
            setVentasTotales(res.data);
        } catch (error) {
            console.error(error);
            toast.error("Error al cargar el historial de ventas.");
        } finally {
            setCargando(false);
        }
    };

    // 🔥 FILTRADO EN MEMORIA CON useMemo (solo se recalcula cuando cambian los filtros)
    const ventasFiltradas = useMemo(() => {
        let resultado = [...ventasTotales];
        
        // Filtrar por fechas (YYYY-MM-DD)
        resultado = resultado.filter(v => {
            const fechaVenta = new Date(v.fecha).toISOString().split('T')[0];
            return fechaVenta >= fechaDesde && fechaVenta <= fechaHasta;
        });
        
        // Filtrar por búsqueda
        if (busqueda) {
            const termino = busqueda.toLowerCase();
            resultado = resultado.filter(v => {
                const boleta = `B001-${String(v.id).padStart(6, '0')}`.toLowerCase();
                const cliente = (v.cliente?.nombre || 'público general').toLowerCase();
                return boleta.includes(termino) || cliente.includes(termino);
            });
        }
        
        // Filtrar por estado
        if (filtroEstado !== 'TODOS') {
            resultado = resultado.filter(v => (v.estado || 'ACTIVA') === filtroEstado);
        }
        
        return resultado;
    }, [ventasTotales, fechaDesde, fechaHasta, busqueda, filtroEstado]);

    useEffect(() => { setPaginaActual(1); }, [fechaDesde, fechaHasta, busqueda, filtroEstado]);

    const indiceUltimoItem = paginaActual * filasPorPagina;
    const indicePrimerItem = indiceUltimoItem - filasPorPagina;
    const itemsActuales = ventasFiltradas.slice(indicePrimerItem, indiceUltimoItem);
    const totalPaginas = Math.ceil(ventasFiltradas.length / filasPorPagina);

    const limpiarFiltros = () => {
        setBusqueda('');
        setFiltroEstado('TODOS');
        setFechaDesde(fechaHoy);
        setFechaHasta(fechaHoy);
    };

    const anularVenta = async (idVenta) => {
    const result = await Swal.fire({
            title: '⚠️ ¿Anular esta venta?',
            html: `
                <p class="text-left text-sm">Esta acción:</p>
                <ul class="text-left text-sm list-disc pl-6 mb-4">
                    <li>✔️ Devolverá el stock al inventario</li>
                    <li>✔️ Restará el monto de la caja</li>
                    <li>✔️ Registrará la anulación en el Kardex</li>
                </ul>
                <p class="text-left text-sm font-bold text-red-600">Esta acción NO se puede deshacer.</p>
            `,
            input: 'textarea',
            inputLabel: 'Motivo de la anulación (obligatorio)',
            inputPlaceholder: 'Ej: Error en el método de pago / Cliente canceló / Producto dañado...',
            inputAttributes: {
                'aria-label': 'Escribe el motivo de anulación'
            },
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Sí, anular venta',
            cancelButtonText: 'Cancelar',
            inputValidator: (value) => {
                if (!value || value.trim() === '') {
                    return '¡Debes escribir un motivo para anular la venta!';
                }
                if (value.trim().length < 5) {
                    return 'El motivo debe tener al menos 5 caracteres';
                }
                return null;
            }
        });

        if (result.isConfirmed && result.value) {
            try {
                await api.put(`/ventas/${idVenta}/anular`, { motivo: result.value.trim() });
                toast.success("✅ Venta anulada correctamente");
                cargarVentas(); // Recargar la lista
            } catch (error) {
                toast.error(error.response?.data?.error || "Error al anular la venta");
            }
        }
    };

    const exportarExcel = () => {
        if (ventasFiltradas.length === 0) return toast.warning("No hay datos para exportar.");
        const datosParaExcel = ventasFiltradas.map(v => ({
            "Boleta": `B001-${String(v.id).padStart(6, '0')}`,
            "Fecha": new Date(v.fecha).toLocaleString(),
            "Cliente": v.cliente?.nombre || 'Público General',
            "Método": v.metodo_pago || '---',
            "Total": v.total?.toFixed(2),
            "Estado": v.estado || 'ACTIVA'
        }));
        const worksheet = XLSX.utils.json_to_sheet(datosParaExcel);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Historial_Ventas");
        XLSX.writeFile(workbook, `Historial_Ventas_${fechaDesde}_al_${fechaHasta}.xlsx`);
        toast.success("Excel descargado.");
    };

    const exportarPDF = () => {
        if (ventasFiltradas.length === 0) return toast.warning("No hay datos para exportar.");
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Historial de Ventas', 14, 15);
        doc.setFontSize(9);
        doc.text(`Período: ${fechaDesde} al ${fechaHasta}`, 14, 22);
        
        const totalGeneral = ventasFiltradas.filter(v => v.estado !== 'ANULADA').reduce((s, v) => s + v.total, 0);
        doc.text(`Total: S/ ${totalGeneral.toFixed(2)} | Registros: ${ventasFiltradas.length}`, 14, 28);

        const datosTabla = ventasFiltradas.map(v => [
            `B001-${String(v.id).padStart(6, '0')}`,
            new Date(v.fecha).toLocaleString(),
            v.cliente?.nombre || 'Público General',
            `S/ ${v.total?.toFixed(2)}`,
            v.estado || 'ACTIVA'
        ]);

        autoTable(doc, {
            startY: 35,
            head: [['Boleta', 'Fecha', 'Cliente', 'Total', 'Estado']],
            body: datosTabla,
            theme: 'grid',
            headStyles: { fillColor: [59, 130, 246] },
            styles: { fontSize: 8 }
        });
        doc.save(`Historial_Ventas_${fechaDesde}_al_${fechaHasta}.pdf`);
        toast.success("PDF generado.");
    };
    const reimprimirTicket = async (venta) => {
        try {
            // Obtener configuración de la empresa
            const configRes = await api.get('/configuracion');
            const config = configRes.data || {
                nombre_empresa: 'Tienda de Telas',
                ruc: '20000000000',
                direccion: 'Ayacucho, Perú',
                simbolo: 'S/'
            };
            
            const doc = new jsPDF();
            const pageWidth = 210;
            let y = 15;
            
            // Header
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text(config.nombre_empresa, pageWidth / 2, y, { align: 'center' });
            y += 6;
            
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(`RUC: ${config.ruc}`, pageWidth / 2, y, { align: 'center' });
            y += 4;
            doc.text(config.direccion, pageWidth / 2, y, { align: 'center' });
            y += 8;
            
            // Tipo de comprobante
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('BOLETA ELECTRONICA', pageWidth / 2, y, { align: 'center' });
            y += 6;
            doc.setFontSize(10);
            doc.text(`B001-${String(venta.id).padStart(6, '0')}`, pageWidth / 2, y, { align: 'center' });
            y += 10;
            
            // Datos del ticket
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(`Fecha: ${new Date(venta.fecha).toLocaleString()}`, 15, y);
            y += 5;
            doc.text(`Cliente: ${venta.cliente?.nombre || 'Público General'}`, 15, y);
            y += 5;
            if (venta.cliente?.documento) {
                doc.text(`Documento: ${venta.cliente.documento}`, 15, y);
                y += 5;
            }
            doc.text(`Método de Pago: ${venta.metodo_pago || 'EFECTIVO'}`, 15, y);
            y += 8;
            
            // Línea separadora
            doc.line(15, y, pageWidth - 15, y);
            y += 5;
            
            // Tabla de productos
            const productosData = venta.detalles.map(d => [
                d.cantidad.toFixed(1),
                d.producto?.nombre || 'Producto eliminado',
                `${config.simbolo} ${d.precio_unit.toFixed(2)}`,
                `${config.simbolo} ${d.subtotal.toFixed(2)}`
            ]);
            
            autoTable(doc, {
                startY: y,
                head: [['Cant.', 'Producto', 'Precio', 'Subtotal']],
                body: productosData,
                theme: 'grid',
                headStyles: { fillColor: [59, 130, 246] },
                styles: { fontSize: 8 },
                margin: { left: 15, right: 15 }
            });
            
            y = doc.lastAutoTable.finalY + 8;
            
            // Totales
            doc.setFont('helvetica', 'bold');
            doc.text(`SUBTOTAL: ${config.simbolo} ${venta.subtotal?.toFixed(2) || '0.00'}`, pageWidth - 20, y, { align: 'right' });
            y += 5;
            doc.text(`IGV (18%): ${config.simbolo} ${venta.igv?.toFixed(2) || '0.00'}`, pageWidth - 20, y, { align: 'right' });
            y += 6;
            doc.setFontSize(12);
            doc.text(`TOTAL: ${config.simbolo} ${venta.total?.toFixed(2) || '0.00'}`, pageWidth - 20, y, { align: 'right' });
            y += 12;
            
            // Footer
            doc.setFontSize(8);
            doc.setFont('helvetica', 'italic');
            doc.text('*** GRACIAS POR SU COMPRA ***', pageWidth / 2, y, { align: 'center' });
            y += 5;
            doc.text('Vuelva pronto', pageWidth / 2, y, { align: 'center' });
            
            doc.save(`Ticket_B001-${String(venta.id).padStart(6, '0')}.pdf`);
            toast.success("Ticket reimprimido");
        } catch (error) {
            console.error(error);
            toast.error("Error al generar el ticket");
        }
    };

    if (cargando) return <div className="p-10 text-center animate-pulse">Cargando historial...</div>;

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border-t-4 border-blue-500">
            <div className="flex justify-between mb-6">
                <h2 className="text-2xl font-black">📋 Historial de Ventas</h2>
                <div className="flex gap-2">
                    <button onClick={exportarExcel} className="bg-emerald-600 text-white px-4 py-2 rounded-lg">📥 Excel</button>
                    <button onClick={exportarPDF} className="bg-red-600 text-white px-4 py-2 rounded-lg">📄 PDF</button>
                </div>
            </div>

            {/* FILTROS */}
            <div className="bg-slate-50 p-4 rounded-xl mb-6 space-y-3">
                <div className="flex gap-3">
                    <input type="text" placeholder="🔍 Buscar..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="flex-1 p-2 border rounded-lg" />
                    <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="p-2 border rounded-lg">
                        <option value="TODOS">Todos</option>
                        <option value="ACTIVA">🟢 Activas</option>
                        <option value="ANULADA">🔴 Anuladas</option>
                    </select>
                </div>
                <div className="flex gap-3">
                    <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="flex-1 p-2 border rounded-lg" />
                    <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="flex-1 p-2 border rounded-lg" />
                    <button onClick={limpiarFiltros} className="px-4 py-2 bg-slate-200 rounded-lg">🗑️ Limpiar</button>
                </div>
                <div className="text-xs text-slate-500">
                    📅 Mostrando {ventasFiltradas.length} ventas del {fechaDesde} al {fechaHasta}
                </div>
            </div>

            {/* TABLA */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="p-3 text-left">Boleta</th>
                            <th className="p-3 text-left">Fecha</th>
                            <th className="p-3 text-left">Cliente</th>
                            <th className="p-3 text-left">Total</th>
                            <th className="p-3 text-left">Estado</th>
                            {usuario.rol === 'Administrador' && <th className="p-3">Acciones</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {itemsActuales.map(v => (
                            <tr key={v.id} className="border-b">
                                <td className="p-3 font-mono">B001-{String(v.id).padStart(6, '0')}</td>
                                <td className="p-3">{new Date(v.fecha).toLocaleString()}</td>
                                <td className="p-3">{v.cliente?.nombre || 'Público General'}</td>
                                <td className="p-3 font-bold text-blue-600">S/ {v.total?.toFixed(2)}</td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 rounded-full text-[10px] ${v.estado === 'ANULADA' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                        {v.estado || 'ACTIVA'}
                                    </span>
                                </td>
                                {usuario.rol === 'Administrador' && (
                                    <td className="p-4 text-center">
                                        <div className="flex gap-2 justify-center">
                                            {(v.estado === 'ACTIVA' || !v.estado) ? (
                                                <>
                                                    <button 
                                                        onClick={() => anularVenta(v.id)}
                                                        className="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-3 py-1 rounded-lg text-xs"
                                                    >
                                                        🚫 Anular
                                                    </button>
                                                    <button 
                                                        onClick={() => reimprimirTicket(v)}
                                                        className="bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold px-3 py-1 rounded-lg text-xs"
                                                    >
                                                        🖨️ Reimprimir
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button 
                                                        onClick={() => reimprimirTicket(v)}
                                                        className="bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold px-3 py-1 rounded-lg text-xs"
                                                    >
                                                        🖨️ Reimprimir
                                                    </button>
                                                    <span className="text-slate-400 text-xs italic ml-2">Anulada</span>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* PAGINACIÓN */}
            {ventasFiltradas.length > 0 && (
                <div className="flex justify-between mt-4">
                    <button disabled={paginaActual === 1} onClick={() => setPaginaActual(p => p - 1)} className="px-5 py-2.5 bg-white border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-all">⬅️ Anterior</button>
                    <span>Página {paginaActual} de {totalPaginas}</span>
                    <button disabled={paginaActual >= totalPaginas} onClick={() => setPaginaActual(p => p + 1)} className="px-5 py-2.5 bg-white border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-all">Siguiente ➡️</button>
                </div>
            )}
        </div>
    );
}