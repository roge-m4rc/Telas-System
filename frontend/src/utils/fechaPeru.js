const formateadorPeru = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
});

// Obtiene el día comercial sin modificar el instante recibido.
export const obtenerFechaPeru = (fecha) => {
    if (fecha === null || fecha === undefined) return null;
    const date = fecha instanceof Date ? fecha : new Date(fecha);
    if (Number.isNaN(date.getTime())) return null;

    const partes = formateadorPeru.formatToParts(date);
    const obtenerParte = (tipo) => partes.find(parte => parte.type === tipo).value;
    return `${obtenerParte('year')}-${obtenerParte('month')}-${obtenerParte('day')}`;
};

export const obtenerFechaLocalPeru = () => obtenerFechaPeru(new Date());
