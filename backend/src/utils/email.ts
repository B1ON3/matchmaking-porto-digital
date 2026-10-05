import { z } from 'zod';

// email e case-insensitive por natureza, mas o postgres compara texto de
// forma case-sensitive. sem normalizar, quem cadastrou com "Maria@Email.com"
// recebia 401 ao entrar com "maria@email.com". o trim tambem evita que um
// espaco acidental no formulario vire um 401 inexplicavel.
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('email invalido');
