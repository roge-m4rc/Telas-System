import { useEffect } from 'react';

export default function GuardiaInactividad() {
    useEffect(() => {
        let tiempoInactivo;

        // Tiempo límite: 10 minutos (600,000 milisegundos)
        const TIEMPO_LIMITE = 600000; 

        const cerrarSesion = () => {
            // Borramos el usuario de la memoria
            localStorage.removeItem('usuario');
            localStorage.removeItem('token');
            
            // Forzamos la recarga para que el sistema lo expulse al Login
            window.location.href = '/login'; 
        };

        const reiniciarTemporizador = () => {
            clearTimeout(tiempoInactivo);
            tiempoInactivo = setTimeout(cerrarSesion, TIEMPO_LIMITE);
        };

        // Escuchamos cualquier movimiento del usuario
        window.addEventListener('mousemove', reiniciarTemporizador);
        window.addEventListener('keydown', reiniciarTemporizador);
        window.addEventListener('click', reiniciarTemporizador);
        window.addEventListener('scroll', reiniciarTemporizador);

        // Arrancamos el contador por primera vez
        reiniciarTemporizador();

        // Limpieza cuando el componente se destruye
        return () => {
            clearTimeout(tiempoInactivo);
            window.removeEventListener('mousemove', reiniciarTemporizador);
            window.removeEventListener('keydown', reiniciarTemporizador);
            window.removeEventListener('click', reiniciarTemporizador);
            window.removeEventListener('scroll', reiniciarTemporizador);
        };
    }, []);

    return null; // Este componente es invisible, solo vigila en las sombras 🥷
}