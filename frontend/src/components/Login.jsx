import { useState } from 'react';
import { toast } from 'sonner';
import api from '../services/api'; // Tu axios configurado

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [mostrarPassword, setMostrarPassword] = useState(false); // 👈 Estado para el ojito

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await api.post('/auth/login', { email, password });
            localStorage.setItem('token', data.token);
            localStorage.setItem('usuario', JSON.stringify(data.usuario));
            window.location.href = '/'; // Redirección limpia
        } catch (error) {
            toast.error(error.response?.data?.error || 'Credenciales incorrectas');
        } finally {
            setLoading(false);
        }
    };

    // 👇 Función para el mensaje de contraseña olvidada
    const handleOlvidePassword = () => {
        toast.info(
            '📞 Comunícate con el administrador del sistema para restablecer tu contraseña\n\n o a su número personal',
            {
                duration: 6000,
                style: {
                    background: '#1e293b',
                    color: '#fff',
                    fontSize: '13px',
                    borderRadius: '16px',
                },
            }
        );
    };

    return (
        <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-slate-50 font-sans">
            {/* Lado Izquierdo: Formulario */}
            <div className="flex flex-col justify-center px-8 sm:px-16 md:px-24 bg-white shadow-2xl z-10">
                <div className="max-w-md w-full mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <span className="text-3xl">🧵</span>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight mt-3">
                            Telas System
                        </h2>
                        <p className="text-sm text-slate-500 mt-2">
                            Ingresa tus credenciales para acceder al punto de venta y almacén.
                        </p>
                    </div>

                    {/* Formulario */}
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                Correo Electrónico
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all placeholder:text-slate-400"
                                placeholder="ejemplo@correo.com"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                Contraseña
                            </label>
                            <div className="relative">
                                <input
                                    type={mostrarPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all placeholder:text-slate-400 pr-12"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setMostrarPassword(!mostrarPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {mostrarPassword ? (
                                        // 👁️ Ojo abierto (visible)
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    ) : (
                                        // 👁️ Ojo cerrado (oculto)
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* 👇 Enlace de "¿Olvidaste tu contraseña?" */}
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={handleOlvidePassword}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                            >
                                ¿Olvidaste tu contraseña?
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-slate-900 text-white font-bold py-3.5 px-4 rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-950/10 active:scale-[0.99] transform disabled:opacity-50"
                        >
                            {loading ? 'Validando...' : 'Iniciar Sesión'}
                        </button>
                    </form>

                    {/* Footer del Formulario */}
                    <p className="text-center text-xs text-slate-400 mt-8">
                        &copy; {new Date().getFullYear()} Telas System. Todos los derechos reservados.
                    </p>
                </div>
            </div>

            {/* Lado Derecho: Imagen / Banner Estético */}
            <div className="hidden md:flex flex-col justify-between p-12 bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 relative overflow-hidden">
                {/* Elemento geométrico decorativo */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -ml-20 -mb-20"></div>

                <div>
                    <span className="text-white/60 text-xs font-bold tracking-widest uppercase bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
                        Ayacucho, Perú
                    </span>
                </div>

                <div className="z-10">
                    <h3 className="text-4xl font-extrabold text-white leading-tight max-w-lg">
                        Control total de tus inventarios, metros y cajas en tiempo real.
                    </h3>
                    <p className="text-slate-400 text-sm mt-4 max-w-sm">
                        Optimizado para el cuadre diario rápido sin descuadres ni papeleos.
                    </p>
                </div>

                <div className="text-xs text-white/40">
                    Versión v1.2 (Estable)
                </div>
            </div>
        </div>
    );
}