import { useState, useEffect } from 'react';
import api from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

// 1. RECIBIMOS LOS PRODUCTOS REALES DESDE APP.JSX
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

    // 👻 2. ¡EL EXORCISMO! Calculamos las alertas aquí mismo, usando la lista limpia que no tiene fantasmas.
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
            toast.error("Error al cargar el historial de cajas. Verifica el servidor.");
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
        doc.text(`Cajero Responsable: ${caja.usuario?.nombre || 'Desconocido'}`, 105, y + 5, { align: 'center' });
        y += 15;

        doc.setDrawColor(200);
        doc.line(20, y, 190, y);
        y += 10;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0);
        doc.text('RESUMEN DE FLUJO DE CAJA', 20, y);
        y += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        const ingresosTotales = caja.ventas_efectivo + caja.ventas_yape + caja.ventas_visa;

        const flujo = [
            ['Fondo Inicial', `S/ ${(caja.monto_inicial || 0).toFixed(2)}`],
            ['Ingresos por Ventas (Total)', `S/ ${(ingresosTotales || 0).toFixed(2)}`],
            ['Egresos (Gastos)', `S/ ${(caja.gastos || 0).toFixed(2)}`],
            ['Efectivo Físico Esperado', `S/ ${(caja.monto_esperado || 0).toFixed(2)}`],
            ['Efectivo Real Reportado', `S/ ${(caja.monto_final || 0).toFixed(2)}`]
        ];

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
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        const diferencia = (caja.monto_final || 0) - (caja.monto_esperado || 0);
        if (diferencia < 0) {
            doc.setTextColor(220, 38, 38); 
            doc.text(`FALTANTE EN CAJA: S/ ${Math.abs(diferencia).toFixed(2)}`, 185, y, { align: 'right' });
        } else if (diferencia > 0) {
            doc.setTextColor(22, 163, 74); 
            doc.text(`SOBRANTE EN CAJA: S/ ${diferencia.toFixed(2)}`, 185, y, { align: 'right' });
        } else {
            doc.setTextColor(37, 99, 235); 
            doc.text(`CAJA CUADRADA EXACTA`, 185, y, { align: 'right' });
        }

        y += 8;
        doc.setDrawColor(200);
        doc.line(20, y, 190, y);
        y += 10;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0);
        doc.text('VENTAS POR MÉTODO DE PAGO', 20, y);
        y += 8;

        const pagos = [
            ['Efectivo', caja.ventas_efectivo || 0],
            ['Yape / Plin', caja.ventas_yape || 0],
            ['Visa / Tarjeta', caja.ventas_visa || 0],
        ];

        pagos.forEach(([metodo, monto]) => {
            doc.setTextColor(80);
            doc.text(metodo, 25, y);
            doc.setTextColor(0);
            doc.setFont('helvetica', 'bold');
            doc.text(`S/ ${Number(monto).toFixed(2)}`, 185, y, { align: 'right' });
            doc.setFont('helvetica', 'normal');
            y += 7;
        });

        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.setFont('helvetica', 'italic');
        doc.text('Este documento es una reimpresión del arqueo histórico de caja.', 105, 280, { align: 'center' });
        doc.text(`Reimpreso por: ${usuario.nombre} - ${new Date().toLocaleString('es-PE')}`, 105, 285, { align: 'center' });

        doc.save(`Arqueo_Historico_${fechaCierre.replace(/\//g, '-')}.pdf`);
        toast.success("PDF generado y descargado.");
    };

    const historialFiltrado = historialCajas.filter(c => {
        if (!filtroFecha) return true;
        const fechaCaja = new Date(c.fecha_apertura).toISOString().split('T')[0];
        return fechaCaja === filtroFecha;
    });

    if (cargando) return <div className="p-10 text-center font-bold text-slate-500 animate-pulse">📊 Cargando inteligencia de negocio...</div>;
    if (!stats) return <div className="p-10 text-center text-red-500 font-bold">⚠️ Error al conectar con el servidor.</div>;

    return (
        <div className="space-y-6 p-4">
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100 gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Panel de Control</h2>
                    <p className="text-sm text-slate-500 font-medium italic">Hola, {usuario.nombre} — Rol: {usuario.rol}</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <button onClick={() => setMostrarGasto(true)} className="flex-1 md:flex-none bg-orange-100 hover:bg-orange-200 text-orange-700 px-6 py-3 rounded-xl font-bold transition-all text-sm shadow-sm">
                        💸 Registrar Gasto
                    </button>
                    {usuario.rol === 'Administrador' && (
                        <button onClick={abrirHistorialCajas} className="flex-1 md:flex-none bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg text-sm flex items-center justify-center gap-2">
                            📚 Historial de Cajas
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-600 p-6 rounded-3xl text-white shadow-xl shadow-blue-100">
                    <p className="text-xs opacity-80 font-black uppercase tracking-widest">Ventas de Hoy</p>
                    <h3 className="text-4xl font-black mt-2">S/ {stats.hoy?.total?.toFixed(2) || '0.00'}</h3>
                    <p className="text-[10px] mt-2 opacity-70 bg-white/20 inline-block px-2 py-1 rounded-full">{stats.hoy?.cantidad || 0} operaciones hoy</p>
                </div>
                <div className="bg-emerald-600 p-6 rounded-3xl text-white shadow-xl shadow-emerald-100">
                    <p className="text-xs opacity-80 font-black uppercase tracking-widest">Ingresos del Mes</p>
                    <h3 className="text-4xl font-black mt-2">S/ {stats.mes?.total?.toFixed(2) || '0.00'}</h3>
                    <p className="text-[10px] mt-2 opacity-70 font-medium uppercase italic">Acumulado mensual</p>
                </div>
                <div className="bg-amber-500 p-6 rounded-3xl text-white shadow-xl shadow-amber-100">
                    <p className="text-xs opacity-80 font-black uppercase tracking-widest">Alertas de Almacén</p>
                    {/* 3. MOSTRAMOS LA CANTIDAD REAL DE ALERTAS */}
                    <h3 className="text-4xl font-black mt-2">{alertasStockReales.length}</h3>
                    <p className="text-[10px] mt-2 opacity-70 font-bold">Telas con menos de 15m</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">📈 Tendencia de Ventas (Últimos 7 Días)</h3>
                <div className="h-[350px] w-full">
                    {montado && stats.graficoVentas?.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.graficoVentas} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v) => `S/${v}`} />
                                <Tooltip contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} cursor={{ fill: '#f8fafc' }} />
                                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                                    {stats.graficoVentas.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === stats.graficoVentas.length - 1 ? '#2563eb' : '#cbd5e1'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            <p className="text-sm font-medium italic">Esperando datos de ventas para graficar...</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <h4 className="text-lg font-black text-slate-800 mb-4 text-red-600 flex items-center gap-2">⚠️ Alertas de Inventario</h4>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black">
                            <tr><th className="p-4">Tela / Producto</th><th className="p-4 text-right">Stock</th></tr>
                        </thead>
                        <tbody className="text-sm">
                            {/* 4. MAPEO SOBRE LA LISTA REAL */}
                            {alertasStockReales.length === 0 ? (
                                <tr><td colSpan="2" className="p-10 text-center text-slate-400 font-bold">✅ Inventario al día. No hay productos bajos.</td></tr>
                            ) : (
                                alertasStockReales.map((prod, idx) => (
                                    <tr key={idx} className="border-b border-slate-50 hover:bg-red-50/50 transition-colors">
                                        <td className="p-4 text-slate-700 font-bold">{prod.nombre}</td>
                                        <td className="p-4 text-right text-red-600 font-black font-mono">{prod.stock}m</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL DE GASTO Y DE HISTORIAL (IGUAL QUE ANTES) */}
            {mostrarGasto && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm">
                        <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">💸 Registrar Gasto</h2>
                        <form onSubmit={registrarGasto} className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase mb-1">Concepto</label>
                                <input required type="text" placeholder="Ej: Pago de transporte..." className="w-full border-2 border-slate-100 p-3 rounded-xl focus:border-blue-500 outline-none" value={gasto.descripcion} onChange={(e) => setGasto({ ...gasto, descripcion: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase mb-1">Importe (S/)</label>
                                <input required type="number" step="0.1" className="w-full border-2 border-slate-100 p-3 rounded-xl font-mono text-lg focus:border-blue-500 outline-none" value={gasto.monto} onChange={(e) => setGasto({ ...gasto, monto: e.target.value })} />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setMostrarGasto(false)} className="flex-1 bg-slate-100 text-slate-600 font-bold p-3 rounded-xl">Cancelar</button>
                                <button type="submit" className="flex-1 bg-orange-500 text-white font-bold p-3 rounded-xl shadow-lg shadow-orange-100">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {mostrarHistorial && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-3xl">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">📚 Auditoría de Cajas</h2>
                                <p className="text-sm text-slate-500 mt-1">Revisa, filtra y descarga los cierres de días anteriores.</p>
                            </div>
                            <button onClick={() => setMostrarHistorial(false)} className="text-slate-400 hover:text-red-500 bg-white p-2 rounded-full shadow-sm hover:bg-red-50 transition-all">
                                ❌
                            </button>
                        </div>

                        <div className="p-6 border-b border-slate-100">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Filtrar por Fecha Exacta</label>
                            <input 
                                type="date" 
                                value={filtroFecha}
                                onChange={(e) => setFiltroFecha(e.target.value)}
                                className="border-2 border-slate-200 p-3 rounded-xl focus:border-blue-500 outline-none font-bold text-slate-700 bg-slate-50"
                            />
                            {filtroFecha && (
                                <button onClick={() => setFiltroFecha('')} className="ml-3 text-sm text-blue-600 font-bold hover:underline">
                                    Limpiar Filtro
                                </button>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            {cargandoHistorial ? (
                                <div className="text-center py-10 text-slate-400 font-bold animate-pulse">Buscando en los archivos...</div>
                            ) : historialFiltrado.length === 0 ? (
                                <div className="text-center py-10 text-slate-400 font-bold italic">No se encontraron cajas cerradas para esta fecha.</div>
                            ) : (
                                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-800 text-white text-[11px] uppercase tracking-wider font-bold">
                                            <tr>
                                                <th className="p-4">Apertura</th>
                                                <th className="p-4">Cierre</th>
                                                <th className="p-4">Cajero</th>
                                                <th className="p-4">Ef. Esperado</th>
                                                <th className="p-4">Diferencia</th>
                                                <th className="p-4 text-center">Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {historialFiltrado.map((caja) => {
                                                const diferencia = (caja.monto_final || 0) - (caja.monto_esperado || 0);
                                                return (
                                                    <tr key={caja.id} className="hover:bg-slate-50 transition-colors">
                                                        <td className="p-4 text-slate-600 font-mono">
                                                            {new Date(caja.fecha_apertura).toLocaleString('es-PE', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}
                                                        </td>
                                                        <td className="p-4 text-slate-600 font-mono">
                                                            {caja.fecha_cierre ? new Date(caja.fecha_cierre).toLocaleString('es-PE', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }) : <span className="text-amber-500 font-bold">En curso...</span>}
                                                        </td>
                                                        <td className="p-4 font-bold text-slate-700">{caja.usuario?.nombre || '---'}</td>
                                                        <td className="p-4 font-black text-slate-800">S/ {(caja.monto_esperado || 0).toFixed(2)}</td>
                                                        <td className="p-4 font-black">
                                                            {caja.fecha_cierre ? (
                                                                <span className={diferencia < 0 ? 'text-red-500 bg-red-50 px-2 py-1 rounded' : diferencia > 0 ? 'text-green-600 bg-green-50 px-2 py-1 rounded' : 'text-slate-500'}>
                                                                    {diferencia < 0 ? '-' : diferencia > 0 ? '+' : ''} S/ {Math.abs(diferencia).toFixed(2)}
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-300">---</span>
                                                            )}
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            <button 
                                                                onClick={() => descargarPDFHistorial(caja)}
                                                                disabled={!caja.fecha_cierre}
                                                                className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors disabled:opacity-30"
                                                            >
                                                                📄 Ver PDF
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}