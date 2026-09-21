const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sesiones = [
    { id: 10, usuario_id: 1, estado: 'ABIERTA' },
    { id: 11, usuario_id: 2, estado: 'ABIERTA' },
    { id: 9, usuario_id: 1, estado: 'CERRADA' }
];
function entorno(gastos = []) {
    const prisma = {
        sesionCaja: { findFirst: async ({ where }) => sesiones.find(s => s.usuario_id === where.usuario_id && s.estado === where.estado) || null },
        venta: { aggregate: async () => ({ _sum: { total: 100 } }) },
        gasto: { findMany: async ({ where, select, orderBy }) => {
            assert.deepEqual(Object.keys(where), ['sesion_id']);
            assert.equal(select.descripcion, true);
            assert.equal(orderBy[0].fecha, 'asc');
            return gastos.filter(g => g.sesion_id === where.sesion_id).map(({ id, descripcion, monto, fecha }) => ({ id, descripcion, monto, fecha }));
        } }
    };
    const contexto = { require: () => ({ PrismaClient: function () { return prisma; } }), module: { exports: {} } };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/controllers/cajaController.js'), 'utf8'), contexto);
    return async (usuario = 1) => {
        let respuesta;
        let status = 200;
        await contexto.module.exports.estadoCaja({ usuario: { id: usuario } }, {
            json: data => { respuesta = data; },
            status: code => { status = code; return { json: data => { respuesta = data; } }; }
        });
        if (status !== 200) throw new Error(`HTTP ${status}: ${respuesta.error}`);
        return respuesta;
    };
}
const gasto = (id, monto, sesion_id = 10, fecha = '2026-09-20T18:00:00Z') => ({ id, monto, sesion_id, fecha, descripcion: `Gasto ${id}` });

test('1: sesión abierta sin gastos', async () => {
    const r = await entorno()();
    assert.equal(r.abierta, true);
    assert.equal(r.gastos.length, 0);
    assert.equal(r.totalGastos.toFixed(2), '0.00');
});
test('2: tres gastos suman 35.50', async () => {
    const r = await entorno([gasto(1, 10), gasto(2, 20), gasto(3, 5.5)])();
    assert.equal(r.gastos.length, 3);
    assert.equal(r.totalGastos, 35.5);
});
test('3: excluye gastos de B', async () => {
    const r = await entorno([gasto(1, 10), gasto(2, 80, 11)])();
    assert.equal(r.gastos.length, 1);
    assert.equal(r.totalGastos, 10);
});
test('4: excluye sesión anterior cerrada', async () => {
    const r = await entorno([gasto(1, 10), gasto(2, 80, 9)])();
    assert.equal(r.gastos.length, 1);
    assert.equal(r.totalGastos, 10);
});
test('5: incluye ambos lados de medianoche de Perú', async () => {
    const r = await entorno([gasto(1, 10, 10, '2026-09-21T04:30:00Z'), gasto(2, 20, 10, '2026-09-21T05:30:00Z')])();
    assert.equal(r.gastos.length, 2);
    assert.equal(r.totalGastos, 30);
});
test('6: refresco del frontend obtiene el gasto posterior sin cerrar sesión', async () => {
    const gastos = [gasto(1, 10)];
    const consultar = entorno(gastos);
    const fuente = fs.readFileSync(path.join(__dirname, '../../frontend/src/components/CajaVentas.jsx'), 'utf8');
    const funcion = fuente.slice(fuente.indexOf('    const actualizarGastos ='), fuente.indexOf('    const [clientes,'));
    let resumen;
    let error;
    const contexto = {
        api: { get: async ruta => { assert.equal(ruta, '/ventas/caja/estado'); return { data: await consultar() }; } },
        setActualizandoGastos: () => {}, setCajaAbierta: () => {},
        setResumenGastos: data => { resumen = data; }, setErrorGastos: value => { error = value; }
    };
    vm.createContext(contexto);
    vm.runInContext(`${funcion}\nthis.actualizar = actualizarGastos;`, contexto);
    await contexto.actualizar();
    assert.equal(resumen.totalGastos, 10);
    gastos.push(gasto(2, 20));
    await contexto.actualizar();
    assert.equal(resumen.gastos.length, 2);
    assert.equal(resumen.totalGastos, 30);
    assert.equal(error, false);
    contexto.api.get = async () => { throw new Error('sin conexión'); };
    await assert.rejects(contexto.actualizar());
    assert.equal(error, true);
    assert.equal(resumen.gastos.length, 2);
    assert.equal(resumen.totalGastos, 30);
    for (const totalGastos of [NaN, Infinity, null, undefined, 'inválido']) {
        contexto.api.get = async () => ({ data: { abierta: true, gastos: [], totalGastos } });
        await assert.rejects(contexto.actualizar());
        assert.equal(error, true);
        assert.equal(resumen.totalGastos, 30);
        assert.equal(resumen.gastos.length, 2);
    }
});

test('montos inválidos y desbordamiento producen error, nunca un total NaN o cero ficticio', async () => {
    for (const monto of [NaN, Infinity, -Infinity, undefined, null, 'inválido']) {
        await assert.rejects(entorno([gasto(1, 10), gasto(2, monto)])(), /HTTP 500.*monto inválido/);
    }
    await assert.rejects(entorno([gasto(1, Number.MAX_VALUE), gasto(2, Number.MAX_VALUE)])(), /HTTP 500.*total no es válido/);
});

test('cierre refresca antes de confirmar y no continúa si el refresco falla', async () => {
    const fuente = fs.readFileSync(path.join(__dirname, '../../frontend/src/components/CajaVentas.jsx'), 'utf8');
    const funcion = fuente.slice(fuente.indexOf('    const handleCerrarCajaFormal ='), fuente.indexOf('    const guardarClienteRapido ='));
    const eventos = [];
    const contexto = {
        actualizarGastos: async () => { eventos.push('refresco'); return { abierta: true, totalGastos: 35.5 }; },
        window: {
            confirm: mensaje => { eventos.push(mensaje); return false; },
            prompt: () => { throw new Error('No debe pedir efectivo'); }
        },
        toast: { error: mensaje => eventos.push(mensaje) },
        api: { post: () => { throw new Error('No debe cerrar'); } }
    };
    vm.createContext(contexto);
    vm.runInContext(`${funcion}\nthis.cerrar = handleCerrarCajaFormal;`, contexto);
    await contexto.cerrar();
    assert.equal(eventos[0], 'refresco');
    assert.match(eventos[1], /S\/ 35\.50/);
    eventos.length = 0;
    contexto.actualizarGastos = async () => { throw new Error('sin conexión'); };
    await contexto.cerrar();
    assert.deepEqual(eventos, ['No se pudieron actualizar los gastos. Reintenta antes de cerrar.']);
});
test('sin sesión abierta devuelve lista vacía y cero', async () => {
    const r = await entorno([gasto(1, 10)])(3);
    assert.equal(r.abierta, false);
    assert.equal(r.gastos.length, 0);
    assert.equal(r.totalGastos, 0);
});
