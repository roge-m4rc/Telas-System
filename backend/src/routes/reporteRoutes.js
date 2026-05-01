const { obtenerResumenGeneral } = require('../controllers/reporteController');


router.get('/dashboard/resumen', obtenerResumenGeneral);