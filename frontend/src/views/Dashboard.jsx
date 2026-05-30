import { useState, useEffect } from 'react';
import api from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

export default function Dashboard({ productos = [] }) {
    const [stats, setStats] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [montado, setMontado] = useState(false);
    const [cajaActual, setCajaActual] = useState(null);

    const [mostrarGasto, setMostrarGasto] = useState(false);
    const [gasto, setGasto] = useState({ descripcion: '', monto: '' });

    const [mostrarHistorial, setMostrarHistorial] = useState(false);
    const [historialCajas, setHistorialCajas] = useState([]);
    const [filtroFecha, setFiltroFecha] = useState('');
    const [cargandoHistorial, setCargandoHistorial] = useState(false);

    const [paginaActual, setPaginaActual] = useState(1);
    const filasPorPagina = 10;

    const usuarioString = localStorage.getItem('usuario');
    const usuario = usuarioString ? JSON.parse(usuarioString) : { nombre: 'Usuario', rol: 'Vendedor' };
    const esAdmin = usuario.rol === 'Administrador';

    const alertasStockReales = productos
        .filter(p => p.stock < 15)
        .sort((a, b) => a.stock - b.stock);

    const verificarCajaActual = async () => {
        try {
            const res = await api.get('/ventas/caja/estado');
            console.log("🔍 Estado de caja:", res.data);
            if (res.data) {
                setCajaActual({
                    abierta: res.data.abierta === true || res.data.estado === 'ABIERTA',
                    ...res.data
                });
            } else {
                setCajaActual({ abierta: false });
            }
        } catch (error) {
            console.error("Error al verificar caja:", error);
            setCajaActual({ abierta: false });
        }
    };

    useEffect(() => {
        cargarStats();
        verificarCajaActual();
        setMontado(true);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            verificarCajaActual();
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    const cargarStats = async () => {
        try {
            const res = await api.get(`/productos/dashboard/resumen?t=${new Date().getTime()}`);
            setStats(res.data);
        } catch (e) {
            console.error("Error al cargar estadisticas", e);
        } finally {
            setCargando(false);
        }
    };

    const registrarGasto = async (e) => {
        e.preventDefault();
        try {
            await api.post('/ventas/gastos', {
                descripcion: gasto.descripcion,
                monto: parseFloat(gasto.monto)
            });
            toast.success("Gasto registrado en caja.");
            setMostrarGasto(false);
            setGasto({ descripcion: '', monto: '' });
            cargarStats();
            verificarCajaActual();
        } catch (error) {
            toast.error("Error al registrar gasto: " + (error.response?.data?.error || ""));
        }
    };

    const abrirHistorialCajas = async () => {
        setMostrarHistorial(true);
        setCargandoHistorial(true);
        setPaginaActual(1);
        try {
            const res = await api.get('/ventas/cajas/historial');
            setHistorialCajas(res.data);
        } catch (error) {
            toast.error("Error al cargar el historial de cajas.");
        } finally {
            setCargandoHistorial(false);
        }
    };

    const calcularEstadoCaja = (caja) => {
        const esperado = Number(caja.efectivo_esperado || caja.monto_esperado || 0);
        const real = Number(caja.efectivo_real || caja.monto_final_real || 0);
        const diferencia = real - esperado;

        let colorClase = 'text-blue-600 bg-blue-50';
        let texto = 'Cuadrado';

        if (diferencia < -0.01) {
            colorClase = 'text-red-600 bg-red-50';
            texto = `Falto S/ ${Math.abs(diferencia).toFixed(2)}`;
        } else if (diferencia > 0.01) {
            colorClase = 'text-emerald-600 bg-emerald-50';
            texto = `Sobro S/ ${diferencia.toFixed(2)}`;
        }

        return { esperado, real, diferencia, colorClase, texto };
    };

    const descargarPDFHistorial = (caja) => {
        const doc = new jsPDF();
        const pageWidth = 210;
        let y = 15;

        const fechaCierre = caja.fecha_cierre ? new Date(caja.fecha_cierre).toLocaleDateString('es-PE') : 'Sin Cierre';
        const horaCierre = caja.fecha_cierre ? new Date(caja.fecha_cierre).toLocaleTimeString('es-PE') : '--:--';

        doc.setFillColor(30, 41, 59);
        doc.rect(0, 0, pageWidth, 30, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('REPORTE DE CIERRE DE CAJA', pageWidth / 2, 22, { align: 'center' });
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generado: ${new Date().toLocaleString('es-PE')}`, pageWidth / 2, 28, { align: 'center' });
        y = 38;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('INFORMACION GENERAL', 15, y);
        y += 6;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const infoItems = [
            ['Cajero Responsable:', caja.usuario?.nombre || 'Admin Principal'],
            ['Fecha de Cierre:', `${fechaCierre}  ${horaCierre}`],
            ['Fecha de Apertura:', caja.fecha_apertura ? new Date(caja.fecha_apertura).toLocaleString('es-PE') : '---'],
        ];
        infoItems.forEach(([label, valor]) => {
            doc.setTextColor(80);
            doc.text(label, 20, y);
            doc.setTextColor(0);
            doc.setFont('helvetica', 'bold');
            doc.text(String(valor), 70, y);
            doc.setFont('helvetica', 'normal');
            y += 5;
        });

        y += 3;
        doc.line(15, y, pageWidth - 15, y);
        y += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('EFECTIVO EN CAJA', 15, y);
        y += 6;

        const efectivoEsperado = Number(caja.efectivo_esperado || caja.monto_esperado || 0);
        const efectivoReal = Number(caja.efectivo_real || caja.monto_final_real || 0);
        const inicial = Number(caja.monto_inicial || 0);
        const egresos = Number(caja.salidas_gastos || 0);
        const ventasEfectivo = Number(caja.EFECTIVO || 0);

        const linea = (label, valor, isBold = false, color = [80, 80, 80]) => {
            doc.setTextColor(...color);
            doc.setFont('helvetica', isBold ? 'bold' : 'normal');
            doc.text(label, 20, y);
            doc.setTextColor(0);
            doc.setFont('helvetica', isBold ? 'bold' : 'normal');
            doc.text(String(valor), pageWidth - 20, y, { align: 'right' });
            y += 5;
        };

        linea('Fondo Inicial:', `S/ ${inicial.toFixed(2)}`);
        linea('+ Ventas Efectivo:', `S/ ${ventasEfectivo.toFixed(2)}`, false, [22, 163, 74]);
        linea('- Gastos:', `S/ ${egresos.toFixed(2)}`, false, [220, 38, 38]);

        y += 1;
        doc.line(20, y - 2, pageWidth - 20, y - 2);
        y += 4;

        linea('EFECTIVO ESPERADO:', `S/ ${efectivoEsperado.toFixed(2)}`, true, [37, 99, 235]);
        linea('EFECTIVO REAL:', `S/ ${efectivoReal.toFixed(2)}`, true, [0, 0, 0]);

        y += 2;
        const diferencia = efectivoReal - efectivoEsperado;
        if (Math.abs(diferencia) > 0.01) {
            if (diferencia < 0) {
                doc.setFillColor(254, 226, 226);
                doc.setTextColor(185, 28, 28);
                doc.roundedRect(15, y - 4, pageWidth - 30, 10, 2, 2, 'F');
                doc.setFont('helvetica', 'bold');
                doc.text(`FALTANTE: S/ ${Math.abs(diferencia).toFixed(2)}`, pageWidth / 2, y + 2, { align: 'center' });
            } else {
                doc.setFillColor(220, 252, 231);
                doc.setTextColor(21, 128, 61);
                doc.roundedRect(15, y - 4, pageWidth - 30, 10, 2, 2, 'F');
                doc.setFont('helvetica', 'bold');
                doc.text(`SOBRANTE: S/ ${diferencia.toFixed(2)}`, pageWidth / 2, y + 2, { align: 'center' });
            }
        } else {
            doc.setFillColor(219, 234, 254);
            doc.setTextColor(29, 78, 216);
            doc.roundedRect(15, y - 4, pageWidth - 30, 10, 2, 2, 'F');
            doc.setFont('helvetica', 'bold');
            doc.text('CAJA CUADRADA', pageWidth / 2, y + 2, { align: 'center' });
        }
        y += 12;

        doc.line(15, y, pageWidth - 15, y);
        y += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('VENTAS DIGITALES (No van a caja fisica)', 15, y);
        y += 6;

        const yape = Number(caja.YAPE || 0);
        const visa = Number(caja.VISA || 0);
        const totalDigitales = yape + visa;

        linea('Yape / Plin:', `S/ ${yape.toFixed(2)}`, false, [124, 58, 237]);
        linea('Visa / Tarjeta:', `S/ ${visa.toFixed(2)}`, false, [124, 58, 237]);

        y += 1;
        doc.line(20, y - 2, pageWidth - 20, y - 2);
        y += 4;
        linea('TOTAL DIGITAL:', `S/ ${totalDigitales.toFixed(2)}`, true, [124, 58, 237]);

        y += 8;
        doc.line(15, y, pageWidth - 15, y);
        y += 8;

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('RESUMEN DEL DIA', 15, y);
        y += 8;

        const ingresosTotales = Number(caja.ingresos_totales || 0);
        linea('Ventas Efectivo:', `S/ ${ventasEfectivo.toFixed(2)}`);
        linea('Ventas Digitales:', `S/ ${totalDigitales.toFixed(2)}`);
        linea('Gastos:', `S/ ${egresos.toFixed(2)}`, false, [220, 38, 38]);

        y += 1;
        doc.setDrawColor(30, 41, 59);
        doc.setLineWidth(0.5);
        doc.line(20, y - 2, pageWidth - 20, y - 2);
        y += 5;
        linea('TOTAL VENDIDO:', `S/ ${ingresosTotales.toFixed(2)}`, true, [30, 41, 59]);

        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.setFont('helvetica', 'normal');
        doc.text(`Documento generado por: ${usuario.nombre} | Sistema de Inventario`, pageWidth / 2, 285, { align: 'center' });

        doc.save(`Arqueo_${caja.usuario?.nombre || 'Caja'}_${fechaCierre.replace(/\//g, '-')}.pdf`);
        toast.success("PDF generado.");
    };

    const historialFiltrado = historialCajas.filter(c => {
        if (!filtroFecha) return true;
        const fechaCaja = new Date(c.fecha_apertura).toISOString().split('T')[0];
        return fechaCaja === filtroFecha;
    });

    const totalPaginas = Math.ceil(historialFiltrado.length / filasPorPagina);
    const indiceInicio = (paginaActual - 1) * filasPorPagina;
    const itemsPaginados = historialFiltrado.slice(indiceInicio, indiceInicio + filasPorPagina);

    if (cargando) return <div className="p-10 text-center font-bold text-slate-500 animate-pulse">Cargando estadisticas...</div>;
    if (!stats) return <div className="p-10 text-center text-red-500 font-bold">Error de conexion.</div>;

    return (
        <div className="space-y-6 p-3 sm:p-4 md:p-6">
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #fecaca;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #f87171;
                }
            `}</style>

            {/* CABECERA RESPONSIVA */}
            <div className="bg-white p-4 sm:p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="w-full md:w-auto">
                        <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">📊 Panel de Control</h2>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium italic">Bienvenido, {usuario.nombre}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        {cajaActual?.abierta === true && (
                            <button onClick={() => setMostrarGasto(true)} className="w-full sm:w-auto bg-orange-100 text-orange-700 px-4 sm:px-6 py-2 sm:py-3 rounded-2xl font-bold text-xs sm:text-sm hover:bg-orange-200 transition-colors">
                                💸 Registrar Gasto
                            </button>
                        )}
                        {esAdmin && (
                            <>
                                <button onClick={abrirHistorialCajas} className="w-full sm:w-auto bg-slate-800 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-2xl font-bold text-xs sm:text-sm shadow-lg hover:bg-slate-700 transition-colors">
                                    📋 Auditoría de Cajas
                                </button>
                                <button onClick={async () => {
                                    try {
                                        const response = await api.get('/backup/exportar', { responseType: 'blob' });
                                        const url = window.URL.createObjectURL(new Blob([response.data]));
                                        const link = document.createElement('a');
                                        link.href = url;
                                        const contentDisposition = response.headers['content-disposition'];
                                        const filename = contentDisposition ? contentDisposition.split('filename=')[1].replace(/"/g, '') : 'backup.json';
                                        link.setAttribute('download', filename);
                                        document.body.appendChild(link);
                                        link.click();
                                        link.remove();
                                        window.URL.revokeObjectURL(url);
                                        toast.success("Backup generado y descargado");
                                    } catch (error) {
                                        toast.error("Error al generar backup");
                                    }
                                }} className="w-full sm:w-auto bg-emerald-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-2xl font-bold text-xs sm:text-sm shadow-lg hover:bg-emerald-700 transition-colors">
                                    💾 Backup
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* CARDS RESPONSIVAS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-5 sm:p-6 rounded-3xl text-white shadow-xl">
                    <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest opacity-80">💰 Ventas Hoy</p>
                    <h3 className="text-2xl sm:text-3xl font-black mt-2">S/ {stats.hoy?.total?.toFixed(2) || '0.00'}</h3>
                    <p className="text-[10px] sm:text-xs mt-2 bg-white/20 inline-block px-2 py-1 rounded-full">{stats.hoy?.cantidad || 0} operaciones</p>
                </div>
                
                {esAdmin ? (
                    <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-5 sm:p-6 rounded-3xl text-white shadow-xl">
                        <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest opacity-80">📅 Mes Actual</p>
                        <h3 className="text-2xl sm:text-3xl font-black mt-2">S/ {stats.mes?.total?.toFixed(2) || '0.00'}</h3>
                        <p className="text-[10px] sm:text-xs mt-2 opacity-70 font-medium">Acumulado mensual</p>
                    </div>
                ) : (
                    <div className="bg-gradient-to-br from-purple-600 to-purple-700 p-5 sm:p-6 rounded-3xl text-white shadow-xl">
                        <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest opacity-80">🔐 Estado del Turno</p>
                        <h3 className="text-xl sm:text-2xl font-black mt-2">{cajaActual?.abierta ? '✅ Caja Abierta' : '🔒 Caja Cerrada'}</h3>
                        <p className="text-[10px] sm:text-xs mt-2 bg-white/20 inline-block px-2 py-1 rounded-full">{cajaActual?.abierta ? 'Turno en curso' : 'Inicia turno para vender'}</p>
                    </div>
                )}

                <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-5 sm:p-6 rounded-3xl text-white shadow-xl">
                    <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest opacity-80">⚠️ Alertas Stock</p>
                    <h3 className="text-3xl sm:text-4xl font-black mt-2">{alertasStockReales.length}</h3>
                    <p className="text-[10px] sm:text-xs mt-1 font-bold">Telas bajo 15m</p>
                </div>
            </div>

            {/* GRÁFICO */}
            {esAdmin && (
                <div className="bg-white p-4 sm:p-6 rounded-3xl shadow-sm border border-slate-100">
                    <h3 className="text-base sm:text-lg font-black text-slate-800 mb-4 sm:mb-6">📈 Tendencia (7 días)</h3>
                    <div className="h-[250px] sm:h-[300px] w-full">
                        {montado && stats.graficoVentas?.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.graficoVentas}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '15px', border: 'none' }} />
                                    <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                                        {stats.graficoVentas.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index === stats.graficoVentas.length - 1 ? '#2563eb' : '#cbd5e1'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400 italic text-sm">Sin datos para graficar</div>
                        )}
                    </div>
                </div>
            )}

            {/* ALERTAS DE INVENTARIO */}
            <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-4 sm:p-5">
                <h3 className="text-base sm:text-lg font-black text-red-600 mb-3 flex items-center gap-2">⚠️ Alertas de Inventario</h3>
                <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {alertasStockReales.length > 0 ? (
                        alertasStockReales.map(prod => (
                            <div key={prod.id} className="flex justify-between items-center p-3 border-b border-slate-100 hover:bg-red-50 transition-colors rounded-lg">
                                <span className="font-medium text-slate-700 text-sm">{prod.nombre}</span>
                                <span className="font-black text-red-500 bg-red-50 px-3 py-1 rounded-full text-xs">{prod.stock} mts</span>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-slate-400 text-sm flex flex-col items-center gap-2">
                            <span className="text-3xl">✅</span>
                            <p>Todo el stock está normal</p>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL GASTO */}
            {mostrarGasto && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl p-5 sm:p-6 w-full max-w-sm mx-auto">
                        <h2 className="text-xl font-black mb-4">💸 Registrar Gasto</h2>
                        <form onSubmit={registrarGasto} className="space-y-4">
                            <input required type="text" placeholder="Concepto..." className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-orange-500" value={gasto.descripcion} onChange={(e) => setGasto({ ...gasto, descripcion: e.target.value })} />
                            <input required type="number" step="0.1" placeholder="Monto S/..." className="w-full border-2 border-slate-100 p-3 rounded-xl font-mono focus:border-orange-500" value={gasto.monto} onChange={(e) => setGasto({ ...gasto, monto: e.target.value })} />
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setMostrarGasto(false)} className="flex-1 bg-slate-100 p-3 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors">Cancelar</button>
                                <button type="submit" className="flex-1 bg-orange-500 text-white p-3 rounded-xl font-bold hover:bg-orange-600 transition-colors">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL AUDITORÍA DE CAJAS */}
            {mostrarHistorial && esAdmin && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
                        <div className="p-4 sm:p-6 bg-slate-800 text-white flex justify-between items-center">
                            <div>
                                <h2 className="text-lg sm:text-xl font-black">📋 Auditoría de Cajas</h2>
                                <p className="text-xs text-slate-400 mt-1">Historial completo de cierres</p>
                            </div>
                            <button onClick={() => setMostrarHistorial(false)} className="text-2xl hover:text-red-400 transition-colors">✕</button>
                        </div>

                        <div className="p-4 border-b bg-slate-50 flex flex-wrap gap-3 items-center">
                            <label className="text-sm font-bold text-slate-600">Filtrar por fecha:</label>
                            <input type="date" value={filtroFecha} onChange={(e) => { setFiltroFecha(e.target.value); setPaginaActual(1); }} className="border-2 border-slate-200 p-2 rounded-xl text-sm focus:border-blue-500 outline-none" />
                            {filtroFecha && (<button onClick={() => { setFiltroFecha(''); setPaginaActual(1); }} className="text-xs text-blue-600 font-bold hover:underline">Limpiar</button>)}
                            <div className="ml-auto text-sm text-slate-500 font-medium">Total: <span className="font-black text-slate-800">{historialFiltrado.length}</span> | Pag. <span className="font-black text-blue-600">{paginaActual}</span> de {totalPaginas || 1}</div>
                        </div>

                        <div className="flex-1 overflow-auto p-4">
                            {cargandoHistorial ? (
                                <div className="p-10 text-center text-slate-400 animate-pulse font-bold">Cargando historial...</div>
                            ) : (
                                <div className="overflow-x-auto border rounded-2xl">
                                    <table className="w-full text-sm min-w-[800px]">
                                        <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-black tracking-wider">
                                            <tr><th className="p-3 text-left">#</th><th className="p-3 text-left">Cajero</th><th className="p-3 text-left">Apertura</th><th className="p-3 text-left">Cierre</th><th className="p-3 text-right">Fondo</th><th className="p-3 text-right">Ventas</th><th className="p-3 text-right">Gastos</th><th className="p-3 text-right">Esperado</th><th className="p-3 text-right">Real</th><th className="p-3 text-center">Estado</th><th className="p-3 text-center">PDF</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {itemsPaginados.length === 0 ? (
                                                <tr><td colSpan="11" className="p-8 text-center text-slate-400 italic font-bold">No hay cajas cerradas {filtroFecha && 'para esa fecha'}.</td></tr>
                                            ) : (
                                                itemsPaginados.map((c, idx) => {
                                                    const { esperado, real, colorClase, texto } = calcularEstadoCaja(c);
                                                    const ingresos = Number(c.ingresos_totales || 0);
                                                    const gastos = Number(c.salidas_gastos || 0);
                                                    const inicial = Number(c.monto_inicial || 0);
                                                    return (
                                                        <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                                            <td className="p-3 text-slate-400 font-mono text-xs">{indiceInicio + idx + 1}</td>
                                                            <td className="p-3 font-bold text-slate-800">{c.usuario?.nombre || '---'}</td>
                                                            <td className="p-3 text-xs text-slate-600">{c.fecha_apertura ? new Date(c.fecha_apertura).toLocaleString('es-PE') : '---'}</td>
                                                            <td className="p-3 text-xs text-slate-600">{c.fecha_cierre ? new Date(c.fecha_cierre).toLocaleString('es-PE') : '---'}</td>
                                                            <td className="p-3 text-right font-mono text-slate-600">S/ {inicial.toFixed(2)}</td>
                                                            <td className="p-3 text-right font-mono font-bold text-emerald-600">S/ {ingresos.toFixed(2)}</td>
                                                            <td className="p-3 text-right font-mono text-red-500">S/ {gastos.toFixed(2)}</td>
                                                            <td className="p-3 text-right font-mono font-bold text-blue-600">S/ {esperado.toFixed(2)}</td>
                                                            <td className="p-3 text-right font-mono font-bold text-slate-800">S/ {real.toFixed(2)}</td>
                                                            <td className="p-3 text-center"><span className={`inline-block px-2 py-1 rounded-lg text-[10px] font-black ${colorClase}`}>{texto}</span></td>
                                                            <td className="p-3 text-center"><button onClick={() => descargarPDFHistorial(c)} disabled={!c.fecha_cierre} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-30 transition-colors shadow-sm">PDF</button></td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {totalPaginas > 1 && (
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 p-4 bg-slate-50 border-t">
                                <button onClick={() => setPaginaActual(p => Math.max(1, p - 1))} disabled={paginaActual === 1} className="w-full sm:w-auto px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold disabled:opacity-40 hover:bg-slate-100">⬅️ Anterior</button>
                                <span className="text-sm font-bold text-slate-500">Página <span className="text-blue-600">{paginaActual}</span> de {totalPaginas}</span>
                                <button onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual >= totalPaginas} className="w-full sm:w-auto px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold disabled:opacity-40 hover:bg-slate-100">Siguiente ➡️</button>
                            </div>
                        )}

                        <div className="p-4 bg-slate-50 border-t text-xs text-slate-500 flex flex-col sm:flex-row justify-between gap-2">
                            <span>💡 <span className="font-bold">Tip:</span> Esperado = Fondo Inicial + Efectivo - Gastos</span>
                            <span className="font-bold">📊 {historialFiltrado.length} caja(s) encontradas</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}