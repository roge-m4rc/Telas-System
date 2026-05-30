import { useState, useEffect } from 'react';
import { obtenerUsuarios, crearUsuario, cambiarEstadoUsuario, actualizarUsuario } from '../services/api';

export default function PanelAdmin() {
    const [usuarios, setUsuarios] = useState([]);
    const [cargando, setCargando] = useState(true);
    
    const [mostrarModal, setMostrarModal] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);

    const [formulario, setFormulario] = useState({
        id: null,
        nombre: '',
        email: '',
        password: '',
        rol: 'Vendedor'
    });

    const cargarUsuarios = async () => {
        setCargando(true);
        try {
            const data = await obtenerUsuarios();
            setUsuarios(data);
        } catch (error) {
            console.error("Error al cargar usuarios:", error);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => { cargarUsuarios(); }, []);

    const abrirModalCrear = () => {
        setModoEdicion(false);
        setFormulario({ id: null, nombre: '', email: '', password: '', rol: 'Vendedor' });
        setMostrarModal(true);
    };

    const abrirModalEditar = (usuario) => {
        setModoEdicion(true);
        setFormulario({
            id: usuario.id,
            nombre: usuario.nombre,
            email: usuario.email,
            password: '',
            rol: usuario.rol?.nombre || 'Vendedor'
        });
        setMostrarModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (modoEdicion) {
                await actualizarUsuario(formulario.id, formulario);
                alert("✅ Usuario actualizado con éxito");
            } else {
                await crearUsuario(formulario);
                alert("✅ Usuario creado con éxito");
            }
            setMostrarModal(false);
            cargarUsuarios();
        } catch (error) {
            alert("Error: " + (error.response?.data?.error || "Error de conexión"));
        }
    };

    const toggleEstado = async (id, estadoActual) => {
        const accion = estadoActual ? 'desactivar' : 'activar';
        if (!window.confirm(`¿Estás seguro de ${accion} a este usuario?`)) return;

        try {
            await cambiarEstadoUsuario(id, !estadoActual);
            cargarUsuarios();
        } catch (error) {
            alert("Error al cambiar estado");
        }
    };

    return (
        <div className="space-y-4 sm:space-y-6 max-w-full mx-auto p-4 sm:p-6">
            {/* CABECERA RESPONSIVA */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-6 rounded-3xl shadow-sm border border-slate-100">
                <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">👥 Gestión de Personal</h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">Administra los accesos y roles de tu equipo.</p>
                </div>
                <button onClick={abrirModalCrear} className="w-full sm:w-auto bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">
                    ➕ Nuevo Empleado
                </button>
            </div>

            {/* TABLA CON SCROLL HORIZONTAL */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-wider">
                            <tr>
                                <th className="p-3 sm:p-5 border-b border-slate-100">📛 Nombre</th>
                                <th className="p-3 sm:p-5 border-b border-slate-100">📧 Email</th>
                                <th className="p-3 sm:p-5 border-b border-slate-100">👔 Rol</th>
                                <th className="p-3 sm:p-5 border-b border-slate-100">📌 Estado</th>
                                <th className="p-3 sm:p-5 border-b border-slate-100 text-right">⚡ Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="text-xs sm:text-sm">
                            {cargando ? (
                                <tr>
                                    <td colSpan="5" className="p-10 text-center text-slate-400 font-bold animate-pulse">
                                        Cargando usuarios...
                                    </td>
                                </tr>
                            ) : usuarios.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-10 text-center text-slate-400 italic">
                                        No hay usuarios registrados
                                    </td>
                                </tr>
                            ) : (
                                usuarios.map((u) => (
                                    <tr key={u.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${!u.activo && 'opacity-60 bg-slate-50'}`}>
                                        <td className="p-3 sm:p-5 font-bold text-slate-700 break-words max-w-[150px]">{u.nombre}</td>
                                        <td className="p-3 sm:p-5 text-slate-500 break-words max-w-[180px]">{u.email}</td>
                                        <td className="p-3 sm:p-5">
                                            <span className={`inline-block px-2 sm:px-3 py-1 rounded-lg text-[10px] sm:text-xs font-black whitespace-nowrap ${
                                                u.rol?.nombre === 'Administrador' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                            }`}>
                                                {u.rol?.nombre || 'Vendedor'}
                                            </span>
                                        </td>
                                        <td className="p-3 sm:p-5">
                                            <span className={`inline-block px-2 sm:px-3 py-1 rounded-lg text-[10px] sm:text-xs font-black whitespace-nowrap ${
                                                u.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                                {u.activo ? '🟢 Activo' : '🔴 Inactivo'}
                                            </span>
                                        </td>
                                        <td className="p-3 sm:p-5 text-right">
                                            <div className="flex justify-end gap-2 flex-wrap">
                                                <button 
                                                    onClick={() => abrirModalEditar(u)} 
                                                    className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-bold text-[10px] sm:text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all whitespace-nowrap"
                                                >
                                                    ✏️ Editar
                                                </button>
                                                
                                                {u.id !== 1 && (
                                                    <button 
                                                        onClick={() => toggleEstado(u.id, u.activo)} 
                                                        className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-bold text-[10px] sm:text-xs transition-all whitespace-nowrap ${
                                                            u.activo ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                                        }`}
                                                    >
                                                        {u.activo ? '🔻 Dar de Baja' : '🔄 Reactivar'}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL RESPONSIVO */}
            {mostrarModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl p-5 sm:p-8 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg sm:text-xl font-black text-slate-800 mb-5 sm:mb-6">
                            {modoEdicion ? '✏️ Editar Empleado' : '✨ Nuevo Empleado'}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase mb-2">📛 Nombre Completo</label>
                                <input required type="text" className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 text-sm" 
                                    value={formulario.nombre} onChange={e => setFormulario({...formulario, nombre: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase mb-2">📧 Email</label>
                                <input required type="email" className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 text-sm" 
                                    value={formulario.email} onChange={e => setFormulario({...formulario, email: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase mb-2">
                                    🔐 Contraseña {modoEdicion && <span className="text-slate-400 font-normal lowercase">(Deja vacío para no cambiarla)</span>}
                                </label>
                                <input type="password" minLength="6" required={!modoEdicion} className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 text-sm" 
                                    value={formulario.password} onChange={e => setFormulario({...formulario, password: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase mb-2">👔 Rol</label>
                                <select className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-700 text-sm"
                                    value={formulario.rol} onChange={e => setFormulario({...formulario, rol: e.target.value})}>
                                    <option value="Vendedor">🟢 Vendedor</option>
                                    <option value="Administrador">🔵 Administrador</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setMostrarModal(false)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors text-sm">
                                    ❌ Cancelar
                                </button>
                                <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 text-sm">
                                    {modoEdicion ? '💾 Actualizar' : '✅ Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}