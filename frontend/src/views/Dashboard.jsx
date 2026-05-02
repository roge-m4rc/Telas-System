import { useState, useEffect } from 'react';
import api from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

export default function Dashboard({ productos = [] }) {
    const [stats, setStats] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [montado, setMontado] = useState(false);

    const [mostrarGasto, setMostrarGasto] = useState(false);
    const [gasto, setGasto] = useState({ descripcion: '', monto: '' });

    const [mostrarHistorial, setMostrarHistorial] = useState(false);
    const [historialCajas, setHistorialCajas] = useState([]);
    const [filtroFecha, setFiltroFecha] = useState('');
    const [cargandoHistorial, setCargandoHistorial] = useState(false);

    const usuarioString = localStorage.getItem('usuario');
    const usuario = usuarioString ? JSON.parse(usuarioString) : { nombre: 'Usuario', rol: 'Vendedor' };

    const alertasStockReales = productos
        .filter(p => p.stock < 15)
        .sort((a, b) => a.stock - b.stock);

    useEffect(() => {
        cargarStats();
        setMontado(true);
    }, []);

    const cargarStats = async () => {
        try {
            const res = await api.get('/productos/dashboard/resumen');
            setStats(res.data);
        } catch (e) {
            console.error("Error al cargar estadísticas", e);
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
            toast.success("✅ Gasto registrado en caja.");
            setMostrarGasto(false);
            setGasto({ descripcion: '', monto: '' });
            cargarStats(); 
        } catch (error) {
            toast.error("❌ Error al registrar gasto: " + (error.response?.data?.error || ""));
        }
    };

    const abrirHistorialCajas = async () => {
        setMostrarHistorial(true);
        setCargandoHistorial(true);
        try {
            const res = await api.get('/ventas/cajas/historial'); 
            setHistorialCajas(res.data);
        } catch (error) {
            toast.error("Error al cargar el historial de cajas.");
        } finally {
            setCargandoHistorial(false);
        }
    };

    const descargarPDFHistorial = (caja) => {
        const doc = new jsPDF();
        const fechaCierre = caja.fecha_cierre ? new Date(caja.fecha_cierre).toLocaleDateString('es-PE') : 'Sin Cierre';
        const horaCierre = caja.fecha_cierre ? new Date(caja.fecha_cierre).toLocaleTimeString('es-PE') : '--:--';
        let y = 20;

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('REPORTE DE CIERRE DE CAJA', 105, y, { align: 'center' });
        y += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text(`Fecha de Cierre: ${fechaCierre}  Hora: ${horaCierre}`, 105, y, { align: 'center' });
        doc.text(`Cajero Responsable: ${caja.usuario?.nombre || 'Admin Principal'}`, 105, y + 5, { align: 'center' });
        y += 15;

        doc.setDrawColor(200);
        doc.line(20, y, 190, y);
        y += 10;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0);
        doc.text('RESUMEN DE FLUJO DE CAJA', 20, y);
        y += 8;

        const ingresosTotales = Number(caja.ingresos_totales || 0);
        const egresos = Number(caja.salidas_gastos || 0);
        const inicial = Number(caja.monto_inicial || 0);
        const esperado = Number(caja.efectivo_esperado || 0);
        const final = Number(caja.efectivo_real || 0);

        const flujo = [
            ['Fondo Inicial', `S/ ${inicial.toFixed(2)}`],
            ['Ingresos por Ventas (Total)', `S/ ${ingresosTotales.toFixed(2)}`],
            ['Egresos (Gastos)', `S/ ${egresos.toFixed(2)}`],
            ['Efectivo Físico Esperado', `S/ ${esperado.toFixed(2)}`],
            ['Efectivo Real Reportado', `S/ ${final.toFixed(2)}`]
        ];

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        flujo.forEach(([label, valor]) => {
            doc.setTextColor(80);
            doc.text(label, 25, y);
            doc.setTextColor(0);
            doc.setFont('helvetica', 'bold');
            doc.text(valor, 185, y, { align: 'right' });
            doc.setFont('helvetica', 'normal');
            y += 7;
        });

        y += 3;
        const diferencia = final - esperado;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        if (diferencia < -0.01) {
            doc.setTextColor(220, 38, 38); 
            doc.text(`FALTANTE EN CAJA: S/ ${Math.abs(diferencia).toFixed(2)}`, 185, y, { align: 'right' });
        } else if (diferencia > 0.01) {
            doc.setTextColor(22, 163, 74); 
            doc.text(`SOBRANTE EN CAJA: S/ ${diferencia.toFixed(2)}`, 185, y, { align: 'right' });
        } else {
            doc.setTextColor(37, 99, 235); 
            doc.text(`CAJA CUADRADA EXACTA`, 185, y, { align: 'right' });
        }

        y += 10;
        doc.setTextColor(0);
        doc.setFontSize(12);
        doc.text('VENTAS POR MÉTODO DE PAGO', 20, y);
        y += 8;

        const pagos = [
            ['Efectivo', caja.EFECTIVO || 0],
            ['Yape / Plin', caja.YAPE || 0],
            ['Visa / Tarjeta', caja.VISA || 0],
        ];

        doc.setFontSize(10);
        pagos.forEach(([metodo, monto]) => {
            doc.setTextColor(80);
            doc.text(metodo, 25, y);
            doc.setTextColor(0);
            doc.setFont('helvetica', 'bold');
            doc.text(`S/ ${Number(monto).toFixed(2)}`, 185, y, { align: 'right' });
            doc.setFont('helvetica', 'normal');
            y += 7;
        });

        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Reimpreso por: ${usuario.nombre} - ${new Date().toLocaleString('es-PE')}`, 105, 285, { align: 'center' });

        doc.save(`Arqueo_Historico_${fechaCierre.replace(/\//g, '-')}.pdf`);
        toast.success("PDF generado.");
    };

    const historialFiltrado = historialCajas.filter(c => {
        if (!filtroFecha) return true;
        const fechaCaja = new Date(c.fecha_apertura).toISOString().split('T')[0];
        return fechaCaja === filtroFecha;
    });

    if (cargando) return <div className="p-10 text-center font-bold text-slate-500 animate-pulse">📊 Cargando estadísticas...</div>;
    if (!stats) return <div className="p-10 text-center text-red-500 font-bold">⚠️ Error de conexión.</div>;

    return (
        <div className="space-y-6 p-2 sm:p-4">
            {/* CABECERA RESPONSIVA */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100 gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Panel de Control</h2>
                    <p className="text-sm text-slate-500 font-medium italic">Bienvenido, {usuario.nombre}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                    <button onClick={() => setMostrarGasto(true)} className="w-full sm:w-auto bg-orange-100 text-orange-700 px-6 py-3 rounded-2xl font-bold text-sm">
                        💸 Registrar Gasto
                    </button>
                    {usuario.rol === 'Administrador' && (
                        <button onClick={abrirHistorialCajas} className="w-full sm:w-auto bg-slate-800 text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg">
                            📚 Auditoría de Cajas
                        </button>
                    )}
                </div>
            </div>

            {/* CARDS RESPONSIVAS (1 col en móvil, 2 en tablet, 4 en desktop) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
                <div className="bg-blue-600 p-6 rounded-3xl text-white shadow-xl shadow-blue-100">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Ventas Hoy</p>
                    <h3 className="text-3xl font-black mt-2">S/ {stats.hoy?.total?.toFixed(2) || '0.00'}</h3>
                    <p className="text-[10px] mt-2 bg-white/20 inline-block px-2 py-1 rounded-full">{stats.hoy?.cantidad || 0} operaciones</p>
                </div>
                <div className="bg-emerald-600 p-6 rounded-3xl text-white shadow-xl shadow-emerald-100">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Mes Actual</p>
                    <h3 className="text-3xl font-black mt-2">S/ {stats.mes?.total?.toFixed(2) || '0.00'}</h3>
                </div>
                <div className="bg-amber-500 p-6 rounded-3xl text-white shadow-xl shadow-amber-100">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Alertas Stock</p>
                    <h3 className="text-3xl font-black mt-2">{alertasStockReales.length}</h3>
                    <p className="text-[10px] mt-1 font-bold">Telas bajo 15m</p>
                </div>
            </div>

            {/* GRÁFICO (Responsivo por contenedor) */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-black text-slate-800 mb-6">📈 Tendencia (7 días)</h3>
                <div className="h-[300px] w-full">
                    {montado && stats.graficoVentas?.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.graficoVentas}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '15px', border: 'none'}} />
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

            {/* TABLA DE ALERTAS CON SCROLL */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <h4 className="text-lg font-black text-red-600 mb-4">⚠️ Alertas de Inventario</h4>
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[300px]">
                        <thead className="text-[10px] uppercase font-black text-slate-400">
                            <tr><th className="p-2">Producto</th><th className="p-2 text-right">Stock</th></tr>
                        </thead>
                        <tbody className="text-sm">
                            {alertasStockReales.length === 0 ? (
                                <tr><td colSpan="2" className="p-4 text-center text-slate-400">✅ Todo en orden</td></tr>
                            ) : (
                                alertasStockReales.map((p, i) => (
                                    <tr key={i} className="border-b border-slate-50">
                                        <td className="p-3 font-bold text-slate-700">{p.nombre}</td>
                                        <td className="p-3 text-right text-red-600 font-black">{p.stock}m</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL GASTO (Responsivo) */}
            {mostrarGasto && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 duration-200">
                        <h2 className="text-xl font-black mb-4">💸 Registrar Gasto</h2>
                        <form onSubmit={registrarGasto} className="space-y-4">
                            <input required type="text" placeholder="Concepto..." className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500" value={gasto.descripcion} onChange={(e) => setGasto({ ...gasto, descripcion: e.target.value })} />
                            <input required type="number" step="0.1" placeholder="Monto S/..." className="w-full border-2 border-slate-100 p-3 rounded-xl font-mono focus:border-blue-500" value={gasto.monto} onChange={(e) => setGasto({ ...gasto, monto: e.target.value })} />
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setMostrarGasto(false)} className="flex-1 bg-slate-100 p-3 rounded-xl font-bold">Cerrar</button>
                                <button type="submit" className="flex-1 bg-orange-500 text-white p-3 rounded-xl font-bold">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL AUDITORÍA (Responsivo con tabla deslizable) */}
            {mostrarHistorial && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
                            <h2 className="text-xl font-black">📚 Auditoría de Cajas</h2>
                            <button onClick={() => setMostrarHistorial(false)} className="text-xl">❌</button>
                        </div>
                        <div className="p-4 border-b">
                            <input type="date" value={filtroFecha} onChange={(e) => setFiltroFecha(e.target.value)} className="w-full sm:w-auto border-2 border-slate-200 p-2 rounded-xl" />
                        </div>
                        <div className="flex-1 overflow-auto p-4">
                            <div className="overflow-x-auto border rounded-2xl">
                                <table className="w-full text-sm min-w-[700px]">
                                    <thead className="bg-slate-800 text-white uppercase text-[10px] font-bold">
                                        <tr><th className="p-3">Apertura</th><th className="p-3">Cierre</th><th className="p-3">Cajero</th><th className="p-3">Esperado</th><th className="p-3 text-center">Acción</th></tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {historialFiltrado.map(c => (
                                            <tr key={c.id} className="hover:bg-slate-50">
                                                <td className="p-3 text-xs">{new Date(c.fecha_apertura).toLocaleString('es-PE', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'})}</td>
                                                <td className="p-3 text-xs">{c.fecha_cierre ? new Date(c.fecha_cierre).toLocaleString('es-PE', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'}) : 'Abierta'}</td>
                                                <td className="p-3 font-bold">{c.usuario?.nombre}</td>
                                                <td className="p-3 font-black">S/ {c.monto_esperado?.toFixed(2)}</td>
                                                <td className="p-3 text-center">
                                                    <button onClick={() => descargarPDFHistorial(c)} disabled={!c.fecha_cierre} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-xs font-bold disabled:opacity-30">📄 PDF</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}