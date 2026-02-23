-- INSERCIÓN DE LOGROS (42+)
INSERT INTO global_achievements (id, name, description, icon, requirement_type, requirement_value) VALUES
-- Misiones
('tasks_1', 'Primer Paso', 'Completa tu primera misión.', '🦶', 'tasks', 1),
('tasks_10', 'Aventurero Local', 'Completa 10 misiones.', '📜', 'tasks', 10),
('tasks_25', 'Héroe de la Comarca', 'Completa 25 misiones.', '🍺', 'tasks', 25),
('tasks_50', 'Guardia de la Ciudad', 'Completa 50 misiones.', '🛡️', 'tasks', 50),
('tasks_100', 'Capitán de Rango', 'Completa 100 misiones.', '⚔️', 'tasks', 100),
('tasks_250', 'General de los Ejércitos', 'Completa 250 misiones.', '🚩', 'tasks', 250),
('tasks_500', 'Leyenda de la Tercera Edad', 'Completa 500 misiones.', '🌟', 'tasks', 500),

-- Salud
('salud_5', 'Vigía de la Salud', 'Completa 5 misiones de Salud.', '💚', 'salud', 5),
('salud_20', 'Sanador de Imladris', 'Completa 20 misiones de Salud.', '🌿', 'salud', 20),
('salud_50', 'Fuerza de Beorn', 'Completa 50 misiones de Salud.', '🐻', 'salud', 50),

-- Estudio/Trabajo
('estudio_10', 'Escriba de Minas Tirith', 'Completa 10 misiones de Estudio.', '📖', 'estudio', 10),
('estudio_30', 'Maestre de Sabiduría', 'Completa 30 misiones de Estudio.', '🧙', 'estudio', 30),
('trabajo_20', 'Constructor de Erebor', 'Completa 20 misiones de Trabajo.', '⚒️', 'trabajo', 20),
('trabajo_50', 'Señor del Yunque', 'Completa 50 misiones de Trabajo.', '💎', 'trabajo', 50),

-- Daño (Raid)
('damage_1k', 'Pequeña Espina', 'Inflige 1,000 de daño a Sauron.', '🗡️', 'damage', 1000),
('damage_10k', 'Guerrero del Oeste', 'Inflige 10,000 de daño a Sauron.', '🔥', 'damage', 10000),
('damage_50k', 'Azote de la Sombra', 'Inflige 50,000 de daño a Sauron.', '💥', 'damage', 50000),
('damage_100k', 'Héroe de los Pueblos Libres', 'Inflige 100,000 de daño a Sauron.', '🦅', 'damage', 100000),

-- Oro
('gold_100', 'Bolsa de Monedas', 'Acumula 100 de oro.', '💰', 'gold', 100),
('gold_1k', 'Cofre de Plata', 'Acumula 1,000 de oro.', '🪙', 'gold', 1000),
('gold_5k', 'Tesoro de Smaug', 'Acumula 5,000 de oro.', '🐉', 'gold', 5000),

-- Nivel
('level_10', 'Ascenso del Héroe', 'Llega al nivel 10.', '🆙', 'level', 10),
('level_25', 'Maestro de Armas', 'Llega al nivel 25.', '👑', 'level', 25),
('level_50', 'Inmortal en Cantares', 'Llega al nivel 50.', '🌈', 'level', 50)
ON CONFLICT (id) DO NOTHING;
