import { useState } from 'react';
import { loginUsuario } from '../services/api';

export default function Login({ onLoginExitoso }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const manejarIngreso = async (e) => {
    e.preventDefault();
    setError(''); // Limpiamos errores previos

    try {
      const data = await loginUsuario({ email, password });
      
      // Guardamos la "llave" y los datos del usuario en la memoria del navegador
      localStorage.setItem('token', data.token);
      localStorage.setItem('usuario', JSON.stringify(data.usuario));
      
      // Le avisamos a la App principal que el login fue un éxito
      onLoginExitoso(data.usuario);
    } catch (err) {
      setError(err); // Mostramos el error del backend (ej: "Contraseña incorrecta")
    }
  };

  return (
    <div className="min-h-screen bg-gray-200 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md border-t-8 border-blue-600">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-2">🔐 Acceso al Sistema</h2>
        <p className="text-center text-gray-500 mb-8">Gestión de Inventario de Telas</p>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
            {error}
          </div>
        )}

        <form onSubmit={manejarIngreso} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Correo Electrónico</label>
            <input 
              type="email" required
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-3 focus:border-blue-500"
              placeholder="admin@telas.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Contraseña</label>
            <input 
              type="password" required
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-3 focus:border-blue-500"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit"
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 font-bold text-lg"
          >
            Iniciar Sesión
          </button>
        </form>
      </div>
    </div>
  );
}