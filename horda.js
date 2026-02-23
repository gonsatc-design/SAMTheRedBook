const MILISEGUNDOS_POR_DIA = 1000 * 60 * 60 * 24;

/**
 * Calcula la composición de una horda de enemigos basándose en el tiempo transcurrido.
 * @param {string | Date} fechaFallo - La fecha en que la tarea fue marcada como fallida.
 * @param {Date} fechaReferencia - La fecha "actual" contra la que se calcula.
 * @param {number} reduccionMultiplier - Factor de reducción (0.0 a 1.0).
 * @param {number} furyMultiplier - Multiplicador de "Furia" (ej: 1.5 si el boss está enfurecido).
 * @returns {{exploradores: number, orcos: number, urukhai: number}}
 */
function calcularHorda(fechaFallo, fechaReferencia, reduccionMultiplier = 0, furyMultiplier = 1.0) {
  const fechaInicio = new Date(fechaFallo);
  const diasTranscurridos = Math.floor((fechaReferencia - fechaInicio) / MILISEGUNDOS_POR_DIA);

  if (diasTranscurridos <= 0) {
    return { exploradores: 0, orcos: 0, urukhai: 0 };
  }

  // Factor de mitigación: 1 - reduccion
  const factor = Math.max(0, 1 - reduccionMultiplier);

  const exploradores = Math.floor(diasTranscurridos * factor * furyMultiplier);
  const orcos = Math.floor((diasTranscurridos / 3) * factor * furyMultiplier);
  const urukhai = Math.floor((diasTranscurridos / 5) * factor * furyMultiplier);

  return { exploradores, orcos, urukhai };
}

module.exports = { calcularHorda };
