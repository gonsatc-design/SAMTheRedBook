const MILISEGUNDOS_POR_DIA = 1000 * 60 * 60 * 24;

/**
 * Calcula la composición de una horda de enemigos basándose en el tiempo transcurrido.
 * @param {string | Date} fechaFallo - La fecha en que la tarea fue marcada como fallida (ISO string o Date object).
 * @param {Date} fechaReferencia - La fecha "actual" contra la que se calcula (para time mocking).
 * @returns {{exploradores: number, orcos: number, urukhai: number}} - El conteo de cada tipo de enemigo.
 */
function calcularHorda(fechaFallo, fechaReferencia) {
  const fechaInicio = new Date(fechaFallo);
  const diasTranscurridos = Math.floor((fechaReferencia - fechaInicio) / MILISEGUNDOS_POR_DIA);

  if (diasTranscurridos <= 0) {
    return { exploradores: 0, orcos: 0, urukhai: 0 };
  }

  const exploradores = diasTranscurridos;
  const orcos = Math.floor(diasTranscurridos / 3);
  const urukhai = Math.floor(diasTranscurridos / 5);

  return { exploradores, orcos, urukhai };
}

module.exports = { calcularHorda };
