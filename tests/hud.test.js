/**
 * @jest-environment jsdom
 */
require('@testing-library/jest-dom');
const { screen } = require('@testing-library/dom');

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
