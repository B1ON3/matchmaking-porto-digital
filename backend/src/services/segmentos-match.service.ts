// Consome o modelo substituto exportado pela AV2 (K-Means + árvore de decisão).
// O objetivo é apenas desempatar matches com o mesmo score: nenhum score,
// reason ou details é alterado aqui.
import { z } from 'zod';

import segmentosBrutos from '../content/segmentos-matchmaking.json';

type NoArvore = { classe: number } | { feature: string; limite: number; esquerda: NoArvore; direita: NoArvore };

const noArvoreSchema: z.ZodType<NoArvore> = z.lazy(() =>
  z.union([
    z.object({ classe: z.number().int().nonnegative() }).strict(),
    z
      .object({
        feature: z.string().min(1),
        limite: z.number(),
        esquerda: noArvoreSchema,
        direita: noArvoreSchema,
      })
      .strict(),
  ]),
);

const FEATURES_ESPERADAS: readonly string[] = [
  'setor_tecnologia',
  'setor_financeiro',
  'setor_saude',
  'setor_educacao',
  'setor_agro',
  'setor_criativa',
  'setor_outros',
  'n_setores',
  'estagio_inicial',
  'estagio_seed',
  'estagio_expansao',
  'n_estagios',
];

const segmentosSchema = z
  .object({
    versao: z.string().min(1),
    modelo: z.string().min(1),
    k: z.number().int().positive(),
    fidelidade: z.number().min(0).max(1),
    features: z.array(z.string().min(1)).min(1),
    aliases: z.record(z.string(), z.string()),
    setores_principais: z.array(z.string()),
    arvore: noArvoreSchema,
    segmentos: z
      .array(
        z
          .object({
            id: z.number().int().nonnegative(),
            nome: z.string(),
            setores: z.array(z.string()),
            estagios: z.array(z.string()),
            descricao: z.string(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict()
  .superRefine((conteudo, ctx) => {
    const ids = new Set(conteudo.segmentos.map((segmento) => segmento.id));
    if (conteudo.k !== conteudo.segmentos.length || ids.size !== conteudo.segmentos.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'k deve corresponder à quantidade de segmentos com IDs únicos',
        path: ['k'],
      });
    }

    const declaradas = new Set(conteudo.features);
    const esperadas = new Set(FEATURES_ESPERADAS);
    if (declaradas.size !== esperadas.size || [...esperadas].some((nome) => !declaradas.has(nome))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'features deve conter exatamente as 12 features de perfil de interesses',
        path: ['features'],
      });
    }

    const conferir = (no: NoArvore): void => {
      if ('classe' in no) {
        if (!ids.has(no.classe)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `classe da árvore não declarada nos segmentos: ${no.classe}`,
            path: ['arvore'],
          });
        }
        return;
      }
      if (!declaradas.has(no.feature)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `feature da árvore não declarada: ${no.feature}`,
          path: ['arvore'],
        });
      }
      conferir(no.esquerda);
      conferir(no.direita);
    };
    conferir(conteudo.arvore);
  });

export type DadosSegmentos = z.infer<typeof segmentosSchema>;

export interface InvestidorParaSegmento {
  sectorInterest: string;
  stageInterest: string;
  ticketMin: number;
  ticketMax: number;
  state: string;
  perfilRisco?: number;
  experienciaAnos?: number;
  investimentosRealizados?: number;
  modeloNegocio?: string;
}

export interface ContextoSegmento {
  investidor: InvestidorParaSegmento;
  setorStartup: string;
  chaveDesempate?: string;
}

export const BONUS_SEGMENTO = 3;

const dados: DadosSegmentos = segmentosSchema.parse(segmentosBrutos);
const principais = new Set(dados.setores_principais);

export function validarSegmentos(entrada: unknown): DadosSegmentos {
  return segmentosSchema.parse(entrada);
}

function normalizarCategoria(valor: string): string {
  const semAcento = valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const limpo = semAcento.toLowerCase().replace(/\s+/g, ' ').trim();
  if (['', 'n/d', 'nan', 'none', 'null', '-'].includes(limpo)) {
    return '';
  }
  return dados.aliases[limpo] ?? limpo;
}

function lista(valor: string): string[] {
  return valor
    .split(/[,;/|]/)
    .map((parte) => normalizarCategoria(parte))
    .filter((parte) => parte.length > 0);
}

// As mesmas 12 features usadas no treino da AV2, na ordem de `features`.
function valoresDasFeatures(investidor: InvestidorParaSegmento): Record<string, number> {
  const setores = lista(investidor.sectorInterest);
  const estagios = lista(investidor.stageInterest);

  return {
    setor_tecnologia: setores.includes('tecnologia') ? 1 : 0,
    setor_financeiro: setores.includes('fintech') ? 1 : 0,
    setor_saude: setores.includes('saude') ? 1 : 0,
    setor_educacao: setores.includes('educacao') ? 1 : 0,
    setor_agro: setores.includes('agro') ? 1 : 0,
    setor_criativa: setores.includes('economia criativa') ? 1 : 0,
    setor_outros: setores.some((setor) => !principais.has(setor)) ? 1 : 0,
    n_setores: new Set(setores).size,
    estagio_inicial: estagios.some((etapa) => etapa === 'ideacao' || etapa === 'pre-seed') ? 1 : 0,
    estagio_seed: estagios.includes('seed') ? 1 : 0,
    estagio_expansao: estagios.some((etapa) => etapa === 'serie a' || etapa === 'serie b') ? 1 : 0,
    n_estagios: new Set(estagios).size,
  };
}

function classeDoNo(no: NoArvore, valores: Record<string, number>): number {
  if ('classe' in no) {
    return no.classe;
  }
  const valor = valores[no.feature] ?? 0;
  return classeDoNo(valor <= no.limite ? no.esquerda : no.direita, valores);
}

export function segmentoDoInvestidor(investidor: InvestidorParaSegmento): number {
  const classe = classeDoNo(dados.arvore, valoresDasFeatures(investidor));
  if (!dados.segmentos.some((segmento) => segmento.id === classe)) {
    throw new Error(`segmento ${classe} ausente no modelo validado`);
  }
  return classe;
}

export function bonusPorSegmento(segmentoId: number, setorStartup: string): number {
  const segmento = dados.segmentos.find((item) => item.id === segmentoId);
  if (!segmento) {
    return 0;
  }
  const alvos = lista(setorStartup);
  return segmento.setores.some((setor) => alvos.includes(normalizarCategoria(setor))) ? BONUS_SEGMENTO : 0;
}

/**
 * Ordena por score decrescente; scores iguais são desempatados pela afinidade
 * entre o segmento do investidor e o setor da startup. Ordem estável e sem
 * mutação do array recebido.
 */
export function reordenarMatches<T extends { score: number }>(
  itens: readonly T[],
  contexto: (item: T) => ContextoSegmento,
): T[] {
  const avaliados = itens.map((item, indice) => {
    const info = contexto(item);
    return {
      item,
      indice,
      chave: info.chaveDesempate ?? '',
      bonus: bonusPorSegmento(segmentoDoInvestidor(info.investidor), info.setorStartup),
    };
  });

  return avaliados
    .sort(
      (a, b) =>
        b.item.score - a.item.score || b.bonus - a.bonus || a.chave.localeCompare(b.chave) || a.indice - b.indice,
    )
    .map((avaliado) => avaliado.item);
}
