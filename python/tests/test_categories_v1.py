from enfinia_runtime.categories.v1 import (
    CATEGORY_TITLES_V1,
    CategoryIndexV1,
    category_index_v1,
    category_title_v1,
    is_essential_category_v1,
)


def test_category_contract_has_stable_indexes_and_aliases() -> None:
    assert len(CATEGORY_TITLES_V1) == 18
    assert category_index_v1("Alimentação") == CategoryIndexV1.FOOD
    assert category_index_v1("despesas com saúde") == CategoryIndexV1.HEALTH
    assert category_index_v1("APORTES") == CategoryIndexV1.INVESTMENTS
    assert category_index_v1("unknown") is None


def test_category_titles_and_essentiality_are_canonical() -> None:
    assert category_title_v1(CategoryIndexV1.PERSONAL_CARE) == "Cuidados pessoais"
    assert category_title_v1(999) == "Categoria 999"
    assert is_essential_category_v1(CategoryIndexV1.HOUSING) is True
    assert is_essential_category_v1(CategoryIndexV1.LEISURE) is False
