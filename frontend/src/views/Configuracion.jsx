import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import api from '../services/api';

export default function Configuracion() {
    const [config, setConfig] = useState({
        nombre_empresa: '',
        ruc: '',
        direccion: '',
        telefono: '',
        moneda: 'PEN',
        simbolo: 'S/',
        nombre_impuesto: 'IGV',
        porcentaje_impuesto: 18 // Lo manejaremos como porcentaje visual (18) y al guardar lo dividimos entre 100
    });
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const res = await api.get('/configuracion');
                if (res.data) {
                    setConfig({
                        ...res.data,
                        porcentaje_impuesto: res.data.porcentaje_impuesto * 100 // Convertir 0.18 a 18 para el input
                    });
                }
            } catch (error) {
                console.error("Error al cargar configuración", error);
            } finally {
                setCargando(false);
            }
        };
        cargarDatos();
    }, []);

    const guardarConfiguracion = async (e) => {
        e.preventDefault();
        setGuardando(true);
        try {
            // Preparamos los datos, convirtiendo el 18 de vuelta a 0.18 para la BD
            const payload = {
                ...config,
                porcentaje_impuesto: parseFloat(config.porcentaje_impuesto) / 100
            };
            
            await api.post('/configuracion', payload);
            toast.success("✅ Configuración actualizada correctamente. Los cambios se aplicarán en las próximas ventas.");
            window.location.reload(); // Recargamos para que todo el sistema tome los nuevos datos
        } catch (error) {
            toast.error("Error al guardar: " + (error.response?.data?.error || "Error de conexión"));
        } finally {
            setGuardando(false);
        }
    };

    if (cargando) return <div className="p-10 text-center font-bold text-slate-500 animate-pulse">Cargando ajustes...</div>;

    return (
        <div className="space-y-6 p-4 max-w-4xl mx-auto">
            <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">⚙️ Configuración del Sistema</h2>
                <p className="text-slate-500 text-sm mt-1">Ajusta los datos del negocio y los parámetros financieros.</p>
            </div>

            <form onSubmit={guardarConfiguracion} className="space-y-6">
                {/* TARJETA 1: DATOS DE LA EMPRESA */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 border-b border-slate-100 pb-2">🏢 Datos de la Empresa</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase mb-2">Nombre del Negocio / Razón Social</label>
                            <input required type="text" className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-700" 
                                value={config.nombre_empresa} onChange={(e) => setConfig({...config, nombre_empresa: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase mb-2">RUC</label>
                            <input required type="text" maxLength="11" className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 font-mono font-bold text-slate-700" 
                                value={config.ruc} onChange={(e) => setConfig({...config, ruc: e.target.value})} />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-black text-slate-400 uppercase mb-2">Dirección Completa</label>
                            <input required type="text" className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 text-slate-700" 
                                value={config.direccion} onChange={(e) => setConfig({...config, direccion: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase mb-2">Teléfono de Contacto</label>
                            <input type="text" className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 text-slate-700" 
                                value={config.telefono} onChange={(e) => setConfig({...config, telefono: e.target.value})} />
                        </div>
                    </div>
                </div>

                {/* TARJETA 2: DATOS FINANCIEROS */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 border-b border-slate-100 pb-2">💵 Moneda e Impuestos</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase mb-2">Código Moneda</label>
                            <input required type="text" className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-700 uppercase" 
                                value={config.moneda} onChange={(e) => setConfig({...config, moneda: e.target.value})} placeholder="Ej: PEN" />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase mb-2">Símbolo</label>
                            <input required type="text" className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-700" 
                                value={config.simbolo} onChange={(e) => setConfig({...config, simbolo: e.target.value})} placeholder="Ej: S/" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase mb-2">Nombre del Impuesto</label>
                            <input required type="text" className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-700 uppercase" 
                                value={config.nombre_impuesto} onChange={(e) => setConfig({...config, nombre_impuesto: e.target.value})} placeholder="Ej: IGV" />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase mb-2">Porcentaje (%)</label>
                            <div className="relative">
                                <input required type="number" step="0.1" min="0" className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-700 font-mono" 
                                    value={config.porcentaje_impuesto} onChange={(e) => setConfig({...config, porcentaje_impuesto: e.target.value})} />
                                <span className="absolute right-4 top-3.5 font-black text-slate-400">%</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button type="submit" disabled={guardando} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-50">
                        {guardando ? 'Guardando cambios...' : '💾 Guardar Configuración'}
                    </button>
                </div>
            </form>
        </div>
    );
}