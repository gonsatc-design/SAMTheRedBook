/**
 * @jest-environment jsdom
 */
require('@testing-library/jest-dom');
const { screen } = require('@testing-library/dom');

// --- Funciones del Frontend (adaptadas para testing) ---

function actualizarNivelSombra(tareas) {
    const totalEnemigos = tareas.reduce((sum, tarea) => {
        const horda = tarea.horda || { exploradores: 0, orcos: 0, urukhai: 0 };
        return sum + horda.exploradores + horda.orcos + horda.urukhai;
    }, 0);

    let nivelSombra = 0;
    if (totalEnemigos >= 1 && totalEnemigos <= 5) nivelSombra = 1;
    else if (totalEnemigos >= 6 && totalEnemigos <= 15) nivelSombra = 2;
    else if (totalEnemigos > 15) nivelSombra = 3;
    return nivelSombra;
}

function mostrarRespuestaSam(container, mensajes) {
    const samReplyContainer = document.createElement('div');
    samReplyContainer.setAttribute('data-testid', 'sam-reply');
    mensajes.forEach(msg => {
        const p = document.createElement('p');
        p.textContent = `"${msg.reply}"`;
        samReplyContainer.appendChild(p);
    });
    container.prepend(samReplyContainer);
}

// Extraemos y adaptamos la función de renderizado para que sea testeable
function renderizarTareas(container, tareas) {
    container.innerHTML = '';
    
    tareas.forEach(tarea => {
        const horda = tarea.horda || { exploradores: 0, orcos: 0, urukhai: 0 };
        
        const card = document.createElement('div');
        card.className = "task-card"; // Clase simple para el test
        card.innerHTML = `
            <div>
                <h3>${tarea.titulo_epico}</h3>
                <div class="horde-container" data-testid="horde-${tarea.id}">
                    <span class="${horda.orcos > 0 ? 'animate-pulse-agressive' : 'opacity-20'}">
                        👹 <span data-testid="orcos-count">${horda.orcos}</span>
                    </span>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

describe('HUD de Asedio - Renderizado de Hordas', () => {

    test('El DOM debe mostrar el icono y número exacto de orcos', () => {
        // 1. Preparación (Arrange)
        // Creamos un contenedor en el DOM virtual
        document.body.innerHTML = '<main id="taskContainer"></main>';
        const taskContainer = document.getElementById('taskContainer');

        // Creamos los datos de prueba que simulan la respuesta del backend
        const mockTasks = [
            { id: 'task-1', titulo_epico: 'Defender el Abismo de Helm', horda: { exploradores: 10, orcos: 3, urukhai: 1 } }
        ];

        // 2. Actuación (Act)
        // Ejecutamos la función que queremos probar
        renderizarTareas(taskContainer, mockTasks);

        // 3. Verificación (Assert)
        // Usamos screen de Testing Library para encontrar elementos como lo haría un usuario
        const orcBadge = screen.getByTestId('horde-task-1');
        const orcCount = screen.getByTestId('orcos-count');
        
        // Verificamos que el contador de orcos es visible y muestra "3"
        expect(orcCount).toBeInTheDocument();
        expect(orcCount).toHaveTextContent('3');

        // Verificamos que el icono tiene la clase de animación porque el contador > 0
        const orcIconContainer = orcBadge.querySelector('span');
        expect(orcIconContainer).toHaveClass('animate-pulse-agressive');
        expect(orcIconContainer).not.toHaveClass('opacity-20');
    });

    test('El icono de orco debe estar opaco si el contador es 0', () => {
        // Arrange
        document.body.innerHTML = '<main id="taskContainer"></main>';
        const taskContainer = document.getElementById('taskContainer');
        const mockTasks = [
            { id: 'task-2', titulo_epico: 'Paseo por La Comarca', horda: { exploradores: 0, orcos: 0, urukhai: 0 } }
        ];

        // Act
        renderizarTareas(taskContainer, mockTasks);

        // Assert
        const orcBadge = screen.getByTestId('horde-task-2');
        const orcIconContainer = orcBadge.querySelector('span');

        // Verificamos que el icono está atenuado y NO tiene la animación
        expect(orcIconContainer).toHaveClass('opacity-20');
        expect(orcIconContainer).not.toHaveClass('animate-pulse-agressive');
    });

    test('El DOM debe mostrar el reply de Sam al crear una gesta', async () => {
        // Arrange
        document.body.innerHTML = `
            <main id="taskContainer"></main>
            <input type="text" id="chatInput">
        `;
        const taskContainer = document.getElementById('taskContainer');
        const chatInput = document.getElementById('chatInput');
        
        // Mock de la respuesta del fetch a /api/briefing
        const mockReply = "¡Claro que sí, Señor Frodo! ¡Una carga menos en el camino!";
        
        // Act
        // Simulamos la respuesta de la función que acabamos de implementar
        mostrarRespuestaSam(taskContainer, [{ reply: mockReply }]);

        // Assert
        const replyElement = await screen.findByTestId('sam-reply');
        expect(replyElement).toBeInTheDocument();
        expect(replyElement).toHaveTextContent(mockReply);
    });
});

function actualizarPalantir(container, prediction) {
    const orb = container.querySelector('#palantirOrb');
    const alerta = container.querySelector('#palantirAlerta');
    const sugerencia = container.querySelector('#palantirSugerencia');

    const { probabilidad_fallo, alerta: msgAlerta, sugerencia: msgSugerencia } = prediction;
    
    alerta.textContent = msgAlerta;
    sugerencia.textContent = `"${msgSugerencia}"`;

    orb.className = "w-8 h-8 rounded-full border-2 border-white/20 flex items-center justify-center cursor-pointer palantir-orb";
    
    if (probabilidad_fallo <= 30) {
        orb.classList.add('bg-blue-500');
    } else if (probabilidad_fallo <= 70) {
        orb.classList.add('bg-amber-500');
    } else {
        orb.classList.add('bg-red-600');
    }
}

describe('Visualización del Palantír (HUD)', () => {
    test('Alerta Roja: El orbe debe ponerse rojo y mostrar mensaje de peligro', () => {
        // Arrange
        document.body.innerHTML = `
            <div id="palantirContainer">
                <div id="palantirOrb"></div>
                <div id="palantirSuggestion">
                    <p id="palantirAlerta"></p>
                    <p id="palantirSugerencia"></p>
                </div>
            </div>
        `;
        const container = document.body;
        const mockPrediction = {
            probabilidad_fallo: 85,
            alerta: "Peligro Inminente",
            sugerencia: "Refuerza las defensas."
        };

        // Act
        actualizarPalantir(container, mockPrediction);

        // Assert
        const orb = container.querySelector('#palantirOrb');
        const alerta = container.querySelector('#palantirAlerta');
        
        expect(orb).toHaveClass('bg-red-600');
        expect(orb).not.toHaveClass('bg-blue-500');
        expect(alerta).toHaveTextContent("Peligro Inminente");
    });

    test('Cielo Despejado: El orbe debe ser azul', () => {
        // Arrange
        document.body.innerHTML = `
            <div id="palantirContainer">
                <div id="palantirOrb"></div>
                <div id="palantirSuggestion">
                    <p id="palantirAlerta"></p>
                    <p id="palantirSugerencia"></p>
                </div>
            </div>
        `;
        const container = document.body;
        const mockPrediction = {
            probabilidad_fallo: 10,
            alerta: "Todo en orden",
            sugerencia: "Continúa así."
        };

        // Act
        actualizarPalantir(container, mockPrediction);

        // Assert
        const orb = container.querySelector('#palantirOrb');
        expect(orb).toHaveClass('bg-blue-500');
    });
});

describe('Efecto de Sombra Global', () => {
    test('Debe devolver nivel 0 si no hay enemigos', () => {
        const tasks = [{ horda: { exploradores: 0, orcos: 0, urukhai: 0 } }];
        expect(actualizarNivelSombra(tasks)).toBe(0);
    });

    test('Debe devolver nivel 1 para 1-5 enemigos', () => {
        const tasks = [{ horda: { exploradores: 5, orcos: 0, urukhai: 0 } }];
        expect(actualizarNivelSombra(tasks)).toBe(1);
    });

    test('Debe devolver nivel 2 para 6-15 enemigos', () => {
        const tasks = [{ horda: { exploradores: 10, orcos: 5, urukhai: 0 } }];
        expect(actualizarNivelSombra(tasks)).toBe(2);
    });

    test('Debe devolver nivel 3 para más de 15 enemigos', () => {
        const tasks = [{ horda: { exploradores: 10, orcos: 5, urukhai: 1 } }];
        expect(actualizarNivelSombra(tasks)).toBe(3);
    });
});
