const { calcularHorda } = require('../horda');

describe('Algoritmo de Asedio - calcularHorda', () => {
  
  // Fecha de referencia fija para todos los tests, simulando "hoy".
  const fechaReferencia = new Date('2025-01-10T12:00:00.000Z');

  test('Caso 0: Tarea fallada hoy debe generar 0 enemigos', () => {
    const fechaFallo = new Date('2025-01-10T10:00:00.000Z');
    const horda = calcularHorda(fechaFallo, fechaReferencia);
    expect(horda).toEqual({ exploradores: 0, orcos: 0, urukhai: 0 });
  });

  test('Caso 1: Tarea fallada hace 3 días debe generar 3 Exploradores, 1 Orco, 0 Uruk-Hai', () => {
    const fechaFallo = new Date('2025-01-07T10:00:00.000Z'); // 3 días antes
    const horda = calcularHorda(fechaFallo, fechaReferencia);
    expect(horda).toEqual({ exploradores: 3, orcos: 1, urukhai: 0 });
  });

  test('Caso 2: Tarea fallada hace 6 días debe generar 6 Exploradores, 2 Orcos, 1 Uruk-Hai', () => {
    const fechaFallo = new Date('2025-01-04T10:00:00.000Z'); // 6 días antes
    const horda = calcularHorda(fechaFallo, fechaReferencia);
    expect(horda).toEqual({ exploradores: 6, orcos: 2, urukhai: 1 });
  });

  test('Debe manejar fechas en formato ISO string', () => {
    const fechaFallo = '2025-01-05T12:00:00.000Z'; // 5 días antes
    const horda = calcularHorda(fechaFallo, fechaReferencia);
    expect(horda).toEqual({ exploradores: 5, orcos: 1, urukhai: 1 });
  });

});
