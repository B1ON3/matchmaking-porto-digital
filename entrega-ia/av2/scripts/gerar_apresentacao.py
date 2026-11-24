#!/usr/bin/env python3
"""Gera o deck HTML da AV2 a partir das evidências reais do treino."""

from __future__ import annotations

import html
import json
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
METRICAS = json.loads(
    (RAIZ / "evidencias" / "metricas.json").read_text(encoding="utf-8")
)
SAIDA = RAIZ / "apresentacao" / "Apresentacao_AV2_Matchmaking.html"


def esc(valor: object) -> str:
    return html.escape(str(valor))


def numero(valor: float, casas: int = 3) -> str:
    return f"{valor:.{casas}f}".replace(".", ",")


def cartao(titulo: str, valor: str) -> str:
    return f'<div class="card"><strong>{esc(valor)}</strong><span>{esc(titulo)}</span></div>'


def slide(titulo: str, corpo: str, nota: str = "") -> str:
    rodape = f"<p class='nota'>{esc(nota)}</p>" if nota else ""
    return (
        "<section class='slide'><div class='interno'>"
        f"<p class='kicker'>Projeto Integrador · 2ª AV</p><h2>{esc(titulo)}</h2>{corpo}{rodape}"
        "</div></section>"
    )


def main() -> None:
    estabilidade = METRICAS["estabilidade"]
    comparacao = {item["algoritmo"]: item for item in METRICAS["comparacao_algoritmos"]}
    kmeans = comparacao["KMeans"]["silhueta"]
    ward = comparacao["Agglomerative(ward)"]["silhueta"]
    grupos = METRICAS["comparacao_features"]
    clusters = METRICAS["clusters"]
    perfis = "".join(
        "<tr>"
        f"<td>{esc(item['cluster'])}</td>"
        f"<td>{esc(item['nome'].split(' (cluster')[0].replace(' - ', ' · '))}</td>"
        f"<td>{esc(item['n_investidores'])}</td>"
        f"<td>{esc(item['setores_top'])}</td>"
        "</tr>"
        for item in clusters
    )

    slides = [
        slide(
            "Scores iguais, ordem arbitrária",
            "<p>O score da AV1 combina setor, estágio, ticket e região com pesos inteiros. "
            "Vários investidores empatam e a API devolve uma ordem sem critério de negócio.</p>"
            "<div class='grid'>"
            + cartao("Critérios do score", "4")
            + cartao("Pesos inteiros", "35/25/25/15")
            + cartao("Problema", "empates")
            + "</div>",
            "Decisão apoiada: apenas a ordem dos matches empatados — nunca o score.",
        ),
        slide(
            "Clusterizar para desempatar",
            "<ul>"
            "<li><strong>K-Means não supervisionado</strong> descobre perfis sem rótulos confiáveis.</li>"
            "<li>Classificação supervisionada foi descartada: não há desfechos ACEITO/RECUSADO.</li>"
            "<li>LLM/embeddings foram descartados: os campos já são padronizados.</li>"
            "<li>Uma <strong>árvore substituta</strong> leva o modelo ao backend sem servir Python.</li>"
            "</ul>",
        ),
        slide(
            "Do CSV ao JSON consumido pela API",
            "<div class='fluxo'>"
            "<span>dados.py</span><b>→</b><span>features.py</span><b>→</b><span>selecao.py</span>"
            "<b>→</b><span>modelos.py</span><b>→</b><span>exportar.py</span>"
            "</div>"
            "<p><code>segmentos-match.service.ts</code> valida o JSON com Zod e percorre a árvore; "
            "<code>matching.service.ts</code> reaplica o desempate na resposta final.</p>",
        ),
        slide(
            "400 perfis limpos, 12 features de interesse",
            "<div class='grid'>"
            + cartao("Startups (original)", "1.320")
            + cartao("Investidores únicos", str(METRICAS["registros"]))
            + cartao("Features calculadas", "20")
            + cartao("Features usadas", "12")
            + "</div>"
            "<p>Normalização de setores/estágios, moeda e UF; deduplicação por <code>id_investidor</code>. "
            "Ticket, região e volume ficaram de fora da clusterização.</p>",
        ),
        slide(
            "k = 6 com validação e exportação",
            "<div class='grid'>"
            + cartao("k escolhido", str(METRICAS["k"]))
            + cartao("Silhueta", numero(METRICAS["silhueta_final"], 4))
            + cartao("ARI médio", numero(estabilidade["ari_medio"]))
            + cartao("Fidelidade estimada", numero(METRICAS["fidelidade_arvore"], 3))
            + "</div>"
            "<p>StandardScaler + KMeans(n_init=20, seed=20261006) para k de 2 a 8; "
            "estabilidade em 5 reamostragens; árvore de profundidade 6 com gate de 0,85.</p>",
        ),
        slide(
            "Evidências da camada 2",
            "<table><thead><tr><th>Comparação</th><th>Resultado</th></tr></thead><tbody>"
            f"<tr><td>KMeans vs Agglomerative (silhueta)</td><td>{numero(kmeans, 4)} vs {numero(ward, 4)}</td></tr>"
            f"<tr><td>Perfil vs todas as features (k=5)</td><td>{numero(grupos['perfil_de_interesses'], 4)} vs {numero(grupos['todas_as_features'], 4)}</td></tr>"
            f"<tr><td>ARI (mín.–máx.)</td><td>{numero(estabilidade['ari_min'])} – {numero(estabilidade['ari_max'])}</td></tr>"
            f"<tr><td>Fidelidade estimada da árvore</td><td>{numero(METRICAS['fidelidade_arvore'], 3)}</td></tr>"
            "</tbody></table>",
            "Números moderados: a IA refina a ordenação, não substitui o score da AV1.",
        ),
        slide(
            "Seis segmentos interpretáveis",
            "<table><thead><tr><th>#</th><th>Perfil</th><th>Investidores</th><th>Setores principais</th></tr></thead>"
            f"<tbody>{perfis}</tbody></table>",
        ),
        slide(
            "Ordenação explicável hoje, aprendizado amanhã",
            "<ul>"
            "<li><strong>Hoje:</strong> recomendação ordenada de forma reproduzível e auditável.</li>"
            "<li><strong>Amanhã:</strong> capturar ACEITO/RECUSADO para treinar propensão supervisionada.</li>"
            "<li>Validar o desempate com A/B de taxa de resposta e reuniões agendadas.</li>"
            "<li>Monitorar silhueta/ARI e reexportar se a fidelidade cair abaixo de 0,85.</li>"
            "</ul>",
            "Perguntas? Código, testes e evidências em entrega-ia/av2/.",
        ),
    ]

    css = """
:root{--noite:#14141f;--noite-2:#242433;--areia:#f7f5f2;--txt:#eaeaf0;--muted:#9a9aa8;--verde:#2a9d8f;--laranja:#e4572e}
*{box-sizing:border-box}html,body{margin:0;height:100%;background:var(--noite);color:var(--txt);font-family:'Segoe UI',Roboto,Arial,sans-serif}
.deck{height:100%;display:flex;align-items:center;justify-content:center}
.slide{display:none;width:100%;height:100%}.slide.ativa{display:flex}
.interno{width:min(1000px,90vw);margin:auto;padding:2rem 0}
.kicker{color:var(--verde);font-size:.8rem;letter-spacing:.12em;text-transform:uppercase;margin:0 0 .5rem}
h2{font-size:2.4rem;margin:0 0 1.2rem;line-height:1.1}.slide p,.slide li{font-size:1.05rem;line-height:1.55;color:#d5d5df}
ul,ol{padding-left:1.3rem}li{margin:.4rem 0}strong{color:#fff}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:.7rem;margin:1.2rem 0}
.card{background:var(--noite-2);border:1px solid #3a3a4a;border-radius:10px;padding:1rem}
.card strong{display:block;font-size:1.7rem;color:var(--areia)}.card span{font-size:.78rem;color:var(--muted)}
table{border-collapse:collapse;width:100%;font-size:.92rem;margin-top:.8rem}
th,td{text-align:left;padding:.55rem .6rem;border-bottom:1px solid #3a3a4a}th{color:var(--muted);font-weight:500}
.fluxo{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;margin:1rem 0}
.fluxo span{background:var(--noite-2);border:1px solid #3a3a4a;border-radius:6px;padding:.5rem .7rem;font-size:.85rem}
.fluxo b{color:var(--laranja)}code{background:var(--noite-2);border:1px solid #3a3a4a;border-radius:4px;padding:.1rem .35rem;font-size:.85rem;color:var(--areia)}
.nota{color:var(--muted);font-size:.82rem;margin-top:1rem;border-left:3px solid var(--laranja);padding-left:.7rem}
.nav{position:fixed;bottom:1rem;right:1.5rem;color:var(--muted);font-size:.78rem}
@media print{html,body{height:auto;background:#fff;color:#14141f}.deck{display:block}.slide{display:flex!important;page-break-after:always;height:auto;min-height:90vh}.interno{width:100%;padding:1.5rem}h2,.slide strong{color:#14141f}.slide p,.slide li{color:#33333f}.card{background:#f7f5f2;border-color:#ddd}.card strong{color:#14141f}.fluxo span,code{background:#f7f5f2;border-color:#ddd;color:#14141f}th,td{border-color:#ddd}.nota{color:#555}.nav{display:none}}
@media(max-width:700px){h2{font-size:1.7rem}.grid{grid-template-columns:repeat(2,1fr)}table{font-size:.78rem}}
"""

    js = """
let i=0;const s=[...document.querySelectorAll('.slide')];const n=document.getElementById('n');
function mostrar(){s.forEach((el,k)=>el.classList.toggle('ativa',k===i));n.textContent=`${i+1} / ${s.length}`}
document.addEventListener('keydown',e=>{if(['ArrowRight',' ','PageDown'].includes(e.key)){i=Math.min(i+1,s.length-1);mostrar()}if(['ArrowLeft','PageUp'].includes(e.key)){i=Math.max(i-1,0);mostrar()}});
mostrar();
"""

    pagina = (
        "<!doctype html><html lang='pt-BR'><head><meta charset='utf-8'>"
        "<meta name='viewport' content='width=device-width,initial-scale=1'>"
        "<title>AV2 — IA aplicada ao matchmaking</title>"
        f"<style>{css}</style></head><body><main class='deck'>{''.join(slides)}</main>"
        f"<div class='nav'>← → para navegar · Ctrl+P imprime/PDF · <span id='n'></span></div>"
        f"<script>{js}</script></body></html>"
    )

    SAIDA.parent.mkdir(parents=True, exist_ok=True)
    SAIDA.write_text(pagina, encoding="utf-8")
    print(f"Apresentação gerada: {SAIDA} ({len(slides)} slides)")


if __name__ == "__main__":
    main()
