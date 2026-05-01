import { useState, useEffect } from 'react';
import { obtenerUsuarios, crearUsuario, cambiarEstadoUsuario, actualizarUsuario } from '../services/api'; // Añadimos actualizarUsuario

export default function PanelAdmin() {
    const [usuarios, setUsuarios] = useState([]);
    const [cargando, setCargando] = useState(true);
    
    // Control de Modales
    const [mostrarModal, setMostrarModal] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);

    // Estado unificado para el formulario
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

    // Abrir modal para CREAR
    const abrirModalCrear = () => {
        setModoEdicion(false);
        setFormulario({ id: null, nombre: '', email: '', password: '', rol: 'Vendedor' });
        setMostrarModal(true);
    };

    // Abrir modal para EDITAR
    const abrirModalEditar = (usuario) => {
        setModoEdicion(true);
        setFormulario({
            id: usuario.id,
            nombre: usuario.nombre,
            email: usuario.email,
            password: '', // Lo dejamos vacío para no sobreescribir si no escriben nada
            rol: usuario.rol
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
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-end bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">👥 Gestión de Personal</h2>
                    <p className="text-slate-500 text-sm mt-1">Administra los accesos y roles de tu equipo.</p>
                </div>
                <button onClick={abrirModalCrear} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">
                    + Nuevo Empleado
                </button>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-wider">
                        <tr>
                            <th className="p-5 border-b border-slate-100">Nombre</th>
                            <th className="p-5 border-b border-slate-100">Email</th>
                            <th className="p-5 border-b border-slate-100">Rol</th>
                            <th className="p-5 border-b border-slate-100">Estado</th>
                            <th className="p-5 border-b border-slate-100 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {cargando ? (
                            <tr><td colSpan="5" className="p-10 text-center text-slate-400 font-bold animate-pulse">Cargando...</td></tr>
                        ) : usuarios.map((u) => (
                            <tr key={u.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${!u.activo && 'opacity-60 bg-slate-50'}`}>
                                <td className="p-5 font-bold text-slate-700">{u.nombre}</td>
                                <td className="p-5 text-slate-500">{u.email}</td>
                                <td className="p-5">
                                    <span className={`px-3 py-1 rounded-lg text-xs font-black ${u.rol === 'Administrador' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {u.rol}
                                    </span>
                                </td>
                                <td className="p-5">
                                    <span className={`px-3 py-1 rounded-lg text-xs font-black ${u.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                        {u.activo ? 'Activo' : 'Inactivo'}
                                    </span>
                                </td>
                                <td className="p-5 text-right flex justify-end gap-2">
                                    {/* Botón Editar */}
                                    <button onClick={() => abrirModalEditar(u)} className="px-4 py-2 rounded-lg font-bold text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all">
                                        ✏️ Editar
                                    </button>
                                    
                                    {u.id !== 1 && (
                                        <button onClick={() => toggleEstado(u.id, u.activo)} className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${u.activo ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}>
                                            {u.activo ? 'Dar de Baja' : 'Reactivar'}
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* MODAL UNIFICADO (CREAR / EDITAR) */}
            {mostrarModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
                        <h3 className="text-xl font-black text-slate-800 mb-6">
                            {modoEdicion ? '✏️ Editar Empleado' : '✨ Nuevo Empleado'}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase mb-2">Nombre Completo</label>
                                <input required type="text" className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500" 
                                    value={formulario.nombre} onChange={e => setFormulario({...formulario, nombre: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase mb-2">Email</label>
                                <input required type="email" className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500" 
                                    value={formulario.email} onChange={e => setFormulario({...formulario, email: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase mb-2">
                                    Contraseña {modoEdicion && <span className="text-slate-400 font-normal lowercase">(Deja vacío para no cambiarla)</span>}
                                </label>
                                <input type="password" minLength="6" required={!modoEdicion} className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500" 
                                    value={formulario.password} onChange={e => setFormulario({...formulario, password: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase mb-2">Rol</label>
                                <select className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-700"
                                    value={formulario.rol} onChange={e => setFormulario({...formulario, rol: e.target.value})}>
                                    <option value="Vendedor">Vendedor</option>
                                    <option value="Administrador">Administrador</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setMostrarModal(false)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200">Cancelar</button>
                                <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100">
                                    {modoEdicion ? 'Actualizar' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}