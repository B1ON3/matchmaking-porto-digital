import json
from pathlib import Path

import pytest

import scripts.exportar as exportar


def test_exportar_rejeita_fidelidade_baixa(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setattr(exportar, "avaliar_fidelidade", lambda *_args, **_kwargs: 0.5)

    with pytest.raises(ValueError, match="(?i)fidelidade"):
        exportar.exportar_integracao(
            saida=tmp_path / "segmentos.json", diretorio_metricas=tmp_path
        )


def test_exportar_gera_json_valido(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setattr(exportar, "avaliar_fidelidade", lambda *_args, **_kwargs: 1.0)
    caminho = tmp_path / "segmentos.json"

    resultado = exportar.exportar_integracao(saida=caminho, diretorio_metricas=tmp_path)

    dados = json.loads(caminho.read_text(encoding="utf-8"))
    assert resultado["fidelidade"] == 1.0
    assert dados["versao"]
    assert len(dados["features"]) == 12
    assert len(dados["segmentos"]) > 1
    assert "classe" in dados["arvore"] or "limite" in dados["arvore"]
    assert all(
        setor in dados["aliases"] or isinstance(setor, str)
        for setor in dados["setores_principais"]
    )


def test_metricas_nao_vazam_caminhos_absolutos_nem_corrompem_motivo() -> None:
    metricas = json.loads(
        (exportar.RAIZ / "evidencias" / "metricas.json").read_text(encoding="utf-8")
    )

    fonte = metricas["fonte"]
    for chave, valor in fonte.items():
        assert "\\" not in valor, f"{chave} não pode conter caminho do Windows"
        assert not valor.startswith("entrega-ia/av2/"), (
            f"{chave} não é um caminho de evidência"
        )
    assert "esquema incompatível" in fonte.get("motivo", "")


def test_serializar_arvore_usa_nomes_das_features() -> None:
    from sklearn.tree import DecisionTreeClassifier

    X = __import__("pandas").DataFrame({"a": [0.0, 1.0], "b": [0.0, 1.0]})
    arvore = DecisionTreeClassifier(max_depth=1, random_state=42).fit(X, [0, 1])

    serializada = exportar.serializar_arvore(arvore, ["a", "b"])

    assert "feature" in serializada
    assert serializada["feature"] in {"a", "b"}
    assert "esquerda" in serializada and "direita" in serializada
