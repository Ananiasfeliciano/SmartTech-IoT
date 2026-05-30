import { z } from 'zod';

export const recordSchema = z.object({
  titulo: z.string().min(1, 'Título é obrigatório').max(200, 'Título muito longo'),
  cliente: z.string().min(1, 'Cliente é obrigatório'),
  categoria: z.string().min(1, 'Categoria é obrigatória'),
  status: z.string().min(1, 'Status é obrigatório'),
  prioridade: z.string().min(1, 'Prioridade é obrigatória'),
  responsavel: z.string().min(1, 'Responsável é obrigatório'),
  data: z
    .string()
    .min(1, 'Data é obrigatória')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido (YYYY-MM-DD)'),
  valor: z.number().min(0, 'Valor não pode ser negativo'),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  contato: z.string().optional(),
  local: z.string().optional(),
  codigo: z.string().optional(),
});

export type RecordFormData = z.infer<typeof recordSchema>;

/** Valida um registro e retorna a primeira mensagem de erro, ou null se válido. */
export function validateRecord(data: Partial<RecordFormData>): string | null {
  const result = recordSchema.safeParse(data);
  if (!result.success) {
    return result.error.issues[0]?.message ?? 'Dados inválidos';
  }
  return null;
}
