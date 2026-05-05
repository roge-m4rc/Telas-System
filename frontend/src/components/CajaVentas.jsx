import { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

export default function CajaVentas({ productos, onVentaRealizada }) {
    const [cajaAbierta, setCajaAbierta] = useState(true); 
    const [cargandoCaja, setCargandoCaja] = useState(true);
    const [montoInicial, setMontoInicial] = useState('');

    const [clientes, setClientes] = useState([]);
    const [clienteId, setClienteId] = useState('');
    const [carrito, setCarrito] = useState([]);
    const [ticket, setTicket] = useState(null);
    const [busqueda, setBusqueda] = useState('');
    const [metodoPago, setMetodoPago] = useState('EFECTIVO');

    const [config, setConfig] = useState({
        nombre_empresa: 'Cargando...',
        ruc: '...',
        direccion: 'Ayacucho, Perú',
        simbolo: 'S/',
        porcentaje_impuesto: 0.18,
        nombre_impuesto: 'IGV'
    });

    const [mostrarModalCliente, setMostrarModalCliente] = useState(false);
    const [nuevoCliente, setNuevoCliente] = useState({ nombre: '', documento: '', telefono: '' });

    useEffect(() => {
        const iniciarCaja = async () => {
            try {
                const [resCaja, resClientes, resConfig] = await Promise.all([
                    api.get('/ventas/caja/estado').catch(() => ({ data: { abierta: false } })),
                    api.get('/clientes').catch(() => ({ data: [] })),
                    api.get('/configuracion').catch(() => ({ data: null }))
                ]);

                setCajaAbierta(!!resCaja.data?.abierta);
                setClientes(resClientes.data || []);
                
                if (resConfig.data) {
                    setConfig(resConfig.data);
                }
            } catch (error) {
                console.error("Error inicializando componentes", error);
            } finally {
                setCargandoCaja(false);
            }
        };
        iniciarCaja();
    }, []);

    const handleAbrirCaja = async (e) => {
        e.preventDefault();
        try {
            await api.post('/ventas/caja/abrir', { monto_inicial: parseFloat(montoInicial) || 0 });
            setCajaAbierta(true);
            toast.success("Caja abierta exitosamente! Buen turno.");
        } catch (error) {
            toast.error("Error al abrir caja: " + (error.response?.data?.error || ""));
        }
    };

    // PDF DEL CIERRE DE TURNO
    const generarPDFCierre = (r) => {
        const doc = new jsPDF();
        const pageWidth = 210;
        let y = 15;

        // Header
        doc.setFillColor(30, 41, 59);
        doc.rect(0, 0, pageWidth, 30, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('CIERRE DE TURNO', pageWidth / 2, 22, { align: 'center' });
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generado: ${new Date().toLocaleString('es-PE')}`, pageWidth / 2, 28, { align: 'center' });

        y = 38;

        // Info General
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('INFORMACION DEL TURNO', 15, y);
        y += 6;
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        
        const infoItems = [
            ['Vendedor:', r.vendedor || '---'],
            ['Fecha:', new Date(r.fecha).toLocaleString('es-PE')],
            ['Fondo Inicial:', `S/ ${(r.fondoInicial || 0).toFixed(2)}`],
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
        doc.setDrawColor(200);
        doc.line(15, y, pageWidth - 15, y);
        y += 8;

        // EFECTIVO EN CAJA
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('EFECTIVO EN CAJA', 15, y);
        y += 6;

        const linea = (label, valor, isBold = false, color = [80, 80, 80]) => {
            doc.setTextColor(...color);
            doc.setFont('helvetica', isBold ? 'bold' : 'normal');
            doc.text(label, 20, y);
            doc.setTextColor(0);
            if (isBold) doc.setFont('helvetica', 'bold');
            doc.text(String(valor), pageWidth - 20, y, { align: 'right' });
            y += 5;
        };

        linea('Fondo Inicial:', `S/ ${(r.fondoInicial || 0).toFixed(2)}`);
        linea('+ Ventas Efectivo:', `S/ ${(r.ventasEfectivo || 0).toFixed(2)}`, false, [22, 163, 74]);
        linea('- Gastos:', `S/ ${(r.gastos || 0).toFixed(2)}`, false, [220, 38, 38]);
        
        y += 1;
        doc.setDrawColor(200);
        doc.line(20, y - 2, pageWidth - 20, y - 2);
        y += 4;
        
        linea('EFECTIVO ESPERADO:', `S/ ${(r.montoEsperado || 0).toFixed(2)}`, true, [37, 99, 235]);
        linea('EFECTIVO REAL:', `S/ ${(r.montoReal || 0).toFixed(2)}`, true, [0, 0, 0]);
        
        y += 2;
        const diferencia = (r.montoReal || 0) - (r.montoEsperado || 0);
        
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

        doc.setDrawColor(200);
        doc.line(15, y, pageWidth - 15, y);
        y += 8;

        // VENTAS DIGITALES
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('VENTAS DIGITALES (No van a caja fisica)', 15, y);
        y += 6;

        const totalDigitales = (r.ventasYape || 0) + (r.ventasVisa || 0);

        linea('Yape / Plin:', `S/ ${(r.ventasYape || 0).toFixed(2)}`, false, [124, 58, 237]);
        linea('Visa / Tarjeta:', `S/ ${(r.ventasVisa || 0).toFixed(2)}`, false, [124, 58, 237]);
        
        y += 1;
        doc.setDrawColor(200);
        doc.line(20, y - 2, pageWidth - 20, y - 2);
        y += 4;
        
        linea('TOTAL DIGITAL:', `S/ ${totalDigitales.toFixed(2)}`, true, [124, 58, 237]);

        y += 8;
        doc.setDrawColor(200);
        doc.line(15, y, pageWidth - 15, y);
        y += 8;

        // RESUMEN DEL DIA
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('RESUMEN DEL DIA', 15, y);
        y += 8;

        linea('Ventas Efectivo:', `S/ ${(r.ventasEfectivo || 0).toFixed(2)}`);
        linea('Ventas Digitales:', `S/ ${totalDigitales.toFixed(2)}`);
        linea('Gastos:', `S/ ${(r.gastos || 0).toFixed(2)}`, false, [220, 38, 38]);
        
        y += 1;
        doc.setDrawColor(30, 41, 59);
        doc.setLineWidth(0.5);
        doc.line(20, y - 2, pageWidth - 20, y - 2);
        y += 5;
        
        linea('TOTAL VENDIDO:', `S/ ${(r.totalVendido || 0).toFixed(2)}`, true, [30, 41, 59]);

        // Footer
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.setFont('helvetica', 'normal');
        doc.text(`Documento generado por: ${r.vendedor} | Sistema de Inventario`, pageWidth / 2, 285, { align: 'center' });

        doc.save(`Cierre_Turno_${r.vendedor}_${new Date().toLocaleDateString('es-PE').replace(/\//g, '-')}.pdf`);
    };

    const handleCerrarCajaFormal = async () => {
        const confirmar = window.confirm("Estas seguro de finalizar tu turno?");
        if (!confirmar) return;

        const montoFisico = window.prompt("Ingresa el dinero total en EFECTIVO que tienes en la caja fisica ahora mismo:", "0");
        if (montoFisico === null) return; 

        try {
            const res = await api.post('/ventas/caja/cerrar', { monto_final: parseFloat(montoFisico) }); 
            setCajaAbierta(false);
            const r = res.data.resumen;

            generarPDFCierre(r);
            toast.success("Turno cerrado - PDF descargado");
        } catch (error) {
            toast.warning("Error al cerrar caja: " + (error.response?.data?.error || "Revisa la conexion."));
        }
    };

    const guardarClienteRapido = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/clientes', nuevoCliente);
            setClientes([...clientes, res.data]);
            setClienteId(res.data.id);
            setMostrarModalCliente(false);
            setNuevoCliente({ nombre: '', documento: '', telefono: '' });
            toast.success("Cliente registrado al instante.");
        } catch (error) {
            toast.error("Error al guardar el nuevo cliente.");
        }
    };

    const productosFiltrados = productos.filter(p => 
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) && p.stock > 0
    );

    const agregarRapido = (producto) => {
        const cantStr = window.prompt(`Cuantos metros de ${producto.nombre}? (Stock: ${producto.stock}m)`, "1");
        if (!cantStr) return; 
        const cantFloat = parseFloat(cantStr);
        if (isNaN(cantFloat) || cantFloat <= 0) return toast.error("Cantidad invalida");
        if (cantFloat > producto.stock) return toast.warning(`Solo quedan ${producto.stock}m!`);

        const itemExistente = carrito.find(item => item.id === producto.id);
        if (itemExistente) {
            const nuevaCantidad = itemExistente.cantidad + cantFloat;
            if (nuevaCantidad > producto.stock) return toast.warning("Supera el stock disponible.");
            setCarrito(carrito.map(item =>
                item.id === producto.id 
                    ? { ...item, cantidad: nuevaCantidad, subtotal: nuevaCantidad * item.precio_unit } 
                    : item
            ));
        } else {
            setCarrito([...carrito, {
                id: producto.id, nombre: producto.nombre, precio_unit: producto.precio,
                cantidad: cantFloat, subtotal: cantFloat * producto.precio
            }]);
        }
    };

    const quitarDelCarrito = (id) => setCarrito(carrito.filter(item => item.id !== id));
    
    const porcIGV = config?.porcentaje_impuesto ?? 0.18;
    const totalFinal = carrito.reduce((suma, item) => suma + item.subtotal, 0);
    const subtotalDesglosado = totalFinal / (1 + porcIGV);
    const igvDesglosado = totalFinal - subtotalDesglosado;

    const confirmarVenta = async () => {
        if (carrito.length === 0) return toast.warning("El carrito esta vacio.");
        const payload = {
            cliente_id: clienteId ? parseInt(clienteId) : null,
            metodo_pago: metodoPago,
            productos: carrito.map(item => ({ id: item.id, cantidad: item.cantidad, precio_unit: item.precio_unit }))
        };
        try {
            const respuesta = await api.post('/ventas', payload); 
            const clienteSeleccionado = clientes.find(c => c.id === parseInt(clienteId));
            
            setTicket({
                nroVenta: respuesta.data.venta?.id || Date.now(),
                fecha: new Date().toLocaleString(),
                cliente: clienteSeleccionado ? clienteSeleccionado.nombre : 'Publico en General',
                dni: clienteSeleccionado?.documento || '---',
                productos: [...carrito],
                subtotal: subtotalDesglosado,
                igv: igvDesglosado,
                total: totalFinal,
                metodo: metodoPago
            });
            
            setCarrito([]);
            setClienteId('');
            setMetodoPago('EFECTIVO');
            onVentaRealizada(); 
            toast.success("Venta registrada correctamente.");
        } catch (error) {
            toast.error("Error al registrar venta. " + (error.response?.data?.error || ""));
        }
    };

    const imprimirTicket = () => {
        const contenido = document.getElementById("ticket-oculto").innerHTML;
        const ventanaImpresion = window.open('', '_blank', 'width=400,height=600');
        
        ventanaImpresion.document.write(`
            <html>
                <head>
                    <title>Ticket B001-${String(ticket.nroVenta).padStart(6, '0')}</title>
                    <style>
                        @page { margin: 0; }
                        body { 
                            font-family: 'Courier New', Courier, monospace; 
                            font-size: 12px; 
                            margin: 0; 
                            padding: 10px; 
                            width: 80mm; 
                            color: black;
                        }
                        .text-center { text-align: center; }
                        .text-right { text-align: right; }
                        .font-bold { font-weight: bold; }
                        .mb-1 { margin-bottom: 4px; }
                        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                        th { border-bottom: 1px dashed black; padding-bottom: 4px; text-align: left;}
                        td { padding: 4px 0; vertical-align: top;}
                        .divisor { border-bottom: 1px dashed black; margin: 10px 0; }
                    </style>
                </head>
                <body>
                    ${contenido}
                </body>
            </html>
        `);
        ventanaImpresion.document.close();
        ventanaImpresion.focus();
        
        setTimeout(() => {
            ventanaImpresion.print();
            ventanaImpresion.close();
        }, 250);
    };

    if (cargandoCaja) {
        return (
            <div className="p-10 text-center flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="font-bold text-slate-500">Verificando seguridad de caja...</p>
            </div>
        );
    }

    if (cajaAbierta === false || cajaAbierta === null) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] bg-slate-50 rounded-3xl border-2 border-dashed border-slate-300 m-4 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center">
                    <span className="text-6xl mb-4 block">🔐</span>
                    <h2 className="text-2xl font-black text-slate-800">Caja Cerrada</h2>
                    <p className="text-sm text-slate-500 mb-6">Debes aperturar tu turno para poder realizar ventas hoy.</p>
                    <form onSubmit={handleAbrirCaja} className="space-y-4">
                        <div className="text-left">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 font-mono">Dinero Inicial (S/)</label>
                            <input 
                                type="number" step="0.1" min="0" required autoFocus
                                placeholder="Ej: 50.00"
                                className="w-full border-2 border-slate-200 p-4 rounded-xl font-mono text-xl focus:border-blue-500 outline-none transition-colors"
                                value={montoInicial}
                                onChange={(e) => setMontoInicial(e.target.value)}
                            />
                        </div>
                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black p-4 rounded-xl shadow-lg transition-all transform active:scale-95">
                            ABRIR CAJA Y EMPEZAR
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row gap-6 relative">
            
            <div className="w-full lg:w-2/3 flex flex-col gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <h2 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2">Buscar Tela</h2>
                    <input 
                        type="text" placeholder="Ej: Lino, Seda, color..." 
                        value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                        className="w-full p-4 text-lg border-2 border-blue-100 bg-blue-50/30 rounded-xl focus:border-blue-500 outline-none transition-all" autoFocus
                    />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto pb-4 pr-2">
                    {productosFiltrados.map(p => (
                        <button key={p.id} onClick={() => agregarRapido(p)} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all text-left flex flex-col justify-between h-32 active:scale-95">
                            <div>
                                <h3 className="font-bold text-slate-800 line-clamp-2 leading-tight">{p.nombre}</h3>
                                <p className="text-[10px] text-slate-400 uppercase mt-1">Stock: {p.stock}m</p>
                            </div>
                            <div className="text-lg font-black text-blue-600 mt-2">
                                {config?.simbolo || 'S/'} {p.precio.toFixed(2)}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            <div className="w-full lg:w-1/3">
                <div className="bg-white rounded-2xl shadow-lg border-t-8 border-slate-800 flex flex-col h-[700px] sticky top-6">
                    <div className="p-5 border-b border-slate-100 bg-slate-50 rounded-t-xl flex justify-between items-start">
                        <div>
                            <h2 className="text-lg font-black text-slate-800">Caja Actual</h2>
                            <button onClick={handleCerrarCajaFormal} className="text-[11px] bg-red-100 text-red-600 px-3 py-1 rounded-md font-bold hover:bg-red-200 mt-1">
                                Finalizar Turno
                            </button>
                        </div>
                        <div className="mt-1 w-full max-w-[180px]">
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Cliente</label>
                            <div className="flex gap-2">
                                <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="flex-1 p-2 border border-slate-300 rounded-lg text-sm bg-white font-bold text-slate-700">
                                    <option value="">Publico en General</option>
                                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                </select>
                                <button onClick={() => setMostrarModalCliente(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded-lg font-bold shadow">+</button>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 bg-slate-100/50">
                        {carrito.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                <span className="text-4xl mb-2">🛒</span>
                                <p className="text-sm font-medium">Carrito vacio</p>
                            </div>
                        ) : (
                            <ul className="space-y-3">
                                {carrito.map((item, idx) => (
                                    <li key={idx} className="bg-white p-3 rounded-lg shadow-sm border border-slate-100 flex justify-between items-center">
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-slate-800 line-clamp-1">{item.nombre}</p>
                                            <p className="text-xs text-slate-500">
                                                {item.cantidad}m x {config?.simbolo || 'S/'} {item.precio_unit.toFixed(2)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-black text-slate-700">
                                                {config?.simbolo || 'S/'} {item.subtotal.toFixed(2)}
                                            </span>
                                            <button onClick={() => quitarDelCarrito(item.id)} className="text-red-400 hover:text-red-600 font-black px-2">x</button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="p-5 border-t border-slate-200 bg-white rounded-b-2xl">
                        <div className="mb-4">
                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block text-center">Metodo de Pago</label>
                            <div className="flex gap-2">
                                {['EFECTIVO', 'YAPE', 'VISA'].map(m => (
                                    <button
                                        key={m} onClick={() => setMetodoPago(m)}
                                        className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all border ${
                                            metodoPago === m ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                        }`}
                                    >
                                        {m === 'YAPE' ? 'YAPE/PLIN' : m === 'VISA' ? 'VISA' : 'EFECTIVO'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-1 mb-4 border-t border-slate-100 pt-3">
                            <div className="flex justify-between text-sm text-slate-500 font-medium">
                                <span>Subtotal</span>
                                <span>{config?.simbolo || 'S/'} {subtotalDesglosado.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-slate-500 font-medium">
                                <span>{config?.nombre_impuesto || 'IGV'} ({(porcIGV * 100).toFixed(0)}%)</span>
                                <span>{config?.simbolo || 'S/'} {igvDesglosado.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-2xl font-black text-slate-900 pt-2 border-t border-slate-100 mt-2">
                                <span>TOTAL</span>
                                <span className="text-blue-600">{config?.simbolo || 'S/'} {totalFinal.toFixed(2)}</span>
                            </div>
                        </div>
                        <button onClick={confirmarVenta} disabled={carrito.length === 0} className={`w-full py-4 rounded-xl font-black text-lg transition-all ${carrito.length > 0 ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-200 active:scale-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
                            COBRAR {config?.simbolo || 'S/'} {totalFinal.toFixed(2)}
                        </button>
                    </div>
                </div>
            </div>

            {mostrarModalCliente && (
                <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm animate-fadeIn">
                        <h2 className="text-2xl font-black text-slate-800 mb-6">Nuevo Cliente</h2>
                        <form onSubmit={guardarClienteRapido} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre Completo</label>
                                <input required type="text" className="w-full border-2 border-slate-100 p-3 rounded-xl focus:border-blue-500 outline-none font-bold text-slate-700" value={nuevoCliente.nombre} onChange={(e) => setNuevoCliente({...nuevoCliente, nombre: e.target.value})}/>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">DNI / RUC</label>
                                <input type="text" className="w-full border-2 border-slate-100 p-3 rounded-xl focus:border-blue-500 outline-none font-bold text-slate-700 font-mono" value={nuevoCliente.documento} onChange={(e) => setNuevoCliente({...nuevoCliente, documento: e.target.value})}/>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Telefono</label>
                                <input type="text" className="w-full border-2 border-slate-100 p-3 rounded-xl focus:border-blue-500 outline-none font-bold text-slate-700 font-mono" value={nuevoCliente.telefono} onChange={(e) => setNuevoCliente({...nuevoCliente, telefono: e.target.value})}/>
                            </div>
                            <div className="flex gap-3 mt-8 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setMostrarModalCliente(false)} className="w-1/2 bg-slate-100 text-slate-600 font-bold p-3 rounded-xl hover:bg-slate-200 transition-colors">Cancelar</button>
                                <button type="submit" className="w-1/2 bg-blue-600 text-white font-black p-3 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {ticket && (
                <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-8 relative flex flex-col font-mono text-sm">
                        <div className="text-center mb-4 border-b-2 border-dashed border-gray-300 pb-4">
                            <h2 className="text-2xl font-black text-gray-800 uppercase tracking-widest">{config?.nombre_empresa || 'SISTEMA'}</h2>
                            <p className="text-gray-500 text-xs mt-1 font-bold">RUC: {config?.ruc || '---'}</p>
                            <p className="text-gray-500 text-xs font-bold">{config?.direccion || 'Ayacucho, Peru'}</p>
                            <h3 className="text-lg font-black mt-3">BOLETA ELECTRONICA</h3>
                            <p className="font-bold text-slate-700">B001-{String(ticket.nroVenta).padStart(6, '0')}</p>
                        </div>
                        <div className="mb-4 text-xs text-left space-y-1 font-bold text-slate-600">
                            <p><span className="text-slate-400">Fecha:</span> {ticket.fecha}</p>
                            <p><span className="text-slate-400">Cliente:</span> {ticket.cliente}</p>
                            <p><span className="text-slate-400">Doc:</span> {ticket.dni}</p>
                            <p><span className="text-slate-400">Pago:</span> {ticket.metodo}</p>
                        </div>
                        <div className="border-t-2 border-b-2 border-dashed border-gray-300 py-3 mb-4">
                            <table className="w-full text-xs text-left font-bold text-slate-700">
                                <thead>
                                    <tr><th className="pb-2 text-slate-400">Cant.</th><th className="pb-2 text-slate-400">Desc.</th><th className="pb-2 text-right text-slate-400">Imp.</th></tr>
                                </thead>
                                <tbody>
                                    {ticket.productos.map((p, i) => (
                                        <tr key={i}>
                                            <td className="py-1">{p.cantidad}m</td>
                                            <td className="py-1 pr-2 truncate max-w-[120px]">{p.nombre}</td>
                                            <td className="py-1 text-right">{config?.simbolo || 'S/'} {p.subtotal.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="text-right text-xs space-y-1 mb-6 font-bold text-slate-600">
                            <p>SUBTOTAL: {config?.simbolo || 'S/'} {ticket.subtotal.toFixed(2)}</p>
                            <p>{config?.nombre_impuesto || 'IGV'} ({(porcIGV * 100).toFixed(0)}%): {config?.simbolo || 'S/'} {ticket.igv.toFixed(2)}</p>
                            <p className="text-xl font-black mt-3 border-t-2 border-slate-800 pt-3 text-slate-900">
                                TOTAL: {config?.simbolo || 'S/'} {ticket.total.toFixed(2)}
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setTicket(null)} className="w-1/2 bg-slate-100 p-3 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors">Siguiente Venta</button>
                            <button onClick={imprimirTicket} className="w-1/2 bg-blue-600 text-white p-3 rounded-xl font-black shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">Imprimir</button>
                        </div>
                    </div>
                </div>
            )}

            {ticket && (
                <div id="ticket-oculto" className="hidden">
                    <div className="text-center">
                        <h2 className="font-bold text-xl mb-1">${config?.nombre_empresa || 'SISTEMA'}</h2>
                        <div className="mb-1">RUC: ${config?.ruc || '---'}</div>
                        <div className="mb-1">${config?.direccion || 'Ayacucho, Peru'}</div>
                        <div className="divisor"></div>
                        <h3 className="font-bold mb-1">BOLETA ELECTRONICA</h3>
                        <div className="font-bold mb-2">B001-${String(ticket.nroVenta).padStart(6, '0')}</div>
                        <div className="divisor"></div>
                    </div>
                    <div className="text-left mb-2">
                        <div className="mb-1"><span className="font-bold">FECHA :</span> ${ticket.fecha}</div>
                        <div className="mb-1"><span className="font-bold">CLIENTE:</span> ${ticket.cliente}</div>
                        <div className="mb-1"><span className="font-bold">DNI/RUC:</span> ${ticket.dni}</div>
                        <div className="mb-1"><span className="font-bold">METODO :</span> ${ticket.metodo}</div>
                    </div>
                    <div className="divisor"></div>
                    <table>
                        <thead>
                            <tr>
                                <th>CANT</th>
                                <th>DESCRIPCION</th>
                                <th className="text-right">IMPORTE</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${ticket.productos.map(p => `
                                <tr>
                                    <td>${p.cantidad}m</td>
                                    <td>${p.nombre}</td>
                                    <td class="text-right">${config?.simbolo || 'S/'} ${p.subtotal.toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div className="divisor"></div>
                    <div className="text-right mb-4">
                        <div className="mb-1">SUBTOTAL: ${config?.simbolo || 'S/'} ${ticket.subtotal.toFixed(2)}</div>
                        <div className="mb-1">${config?.nombre_impuesto || 'IGV'}: ${config?.simbolo || 'S/'} ${ticket.igv.toFixed(2)}</div>
                        <div class="font-bold text-xl mt-2">TOTAL: ${config?.simbolo || 'S/'} ${ticket.total.toFixed(2)}</div>
                    </div>
                    <div className="text-center mt-2">
                        <div className="font-bold mb-1">*** GRACIAS POR SU COMPRA ***</div>
                        <div>Vuelva pronto</div>
                    </div>
                </div>
            )}
        </div>
    );
}