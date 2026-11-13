-- Pequeños grandes artistas — Descripciones de las 7 salas (sin el grado: ya se ve en la cabecera)
-- Se corre A MANO en el SQL Editor de Supabase (no se ejecuta desde la app ni desde ningún script).
-- Cada frase va en desc_a y desc_b queda vacío, igual que cuando se guarda desde el panel docente.

update public.salas set desc_a = 'Guardianes del Reino Minúsculo, forjadores de la pequeña fauna en trazo, color y volumen.', desc_b = '', updated_at = now() where id = 1;
update public.salas set desc_a = 'Protectores del Follaje Nativo y Señores de las Bestias Aladas, nacidos de la tinta y de los cuentos antiguos.', desc_b = '', updated_at = now() where id = 2;
update public.salas set desc_a = 'Custodios de los Árboles Nativos y Exploradores de la Selva Misionera, señores del relieve y de la magia desplegable.', desc_b = '', updated_at = now() where id = 3;
update public.salas set desc_a = 'Cartógrafos del Barrio y de las Calles, guardianes de las estatuas de piedra transformadas en relieve.', desc_b = '', updated_at = now() where id = 4;
update public.salas set desc_a = 'Titanes del Movimiento y de la Materia, señores que otorgan danza y vida a los huesos en mundos imaginarios.', desc_b = '', updated_at = now() where id = 5;
update public.salas set desc_a = 'Sabios del Delta y Defensores de la Tierra, forjadores de relieves en cartón y guardianes del grabado ecológico.', desc_b = '', updated_at = now() where id = 6;
update public.salas set desc_a = 'Maestros de la Perspectiva y Herederos del Muro, caballeros del esténcil y discípulos de la rebelión urbana.', desc_b = '', updated_at = now() where id = 7;
