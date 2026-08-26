from __future__ import annotations

import re
import unicodedata
from enum import IntEnum


class CategoryIndexV1(IntEnum):
    INCOME = 1
    RESERVE = 2
    HOUSING = 3
    UTILITIES = 4
    FOOD = 5
    TRANSPORT = 6
    EDUCATION = 7
    HEALTH = 8
    PET = 9
    LEISURE = 10
    PERSONAL_CARE = 11
    SHOPPING = 12
    DEBT = 13
    ACTIVE_DEBT = 14
    TAXES = 15
    INVESTMENTS = 16
    OTHER = 17
    INTERPERSONAL = 18


CATEGORY_TITLES_V1: dict[int, str] = {
    CategoryIndexV1.INCOME: "Renda",
    CategoryIndexV1.RESERVE: "Reserva",
    CategoryIndexV1.HOUSING: "Moradia",
    CategoryIndexV1.UTILITIES: "Utilidades",
    CategoryIndexV1.FOOD: "Alimentação",
    CategoryIndexV1.TRANSPORT: "Transporte",
    CategoryIndexV1.EDUCATION: "Educação",
    CategoryIndexV1.HEALTH: "Saúde",
    CategoryIndexV1.PET: "Pet",
    CategoryIndexV1.LEISURE: "Lazer",
    CategoryIndexV1.PERSONAL_CARE: "Cuidados pessoais",
    CategoryIndexV1.SHOPPING: "Compras",
    CategoryIndexV1.DEBT: "Dívidas",
    CategoryIndexV1.ACTIVE_DEBT: "Dívida ativa",
    CategoryIndexV1.TAXES: "Impostos",
    CategoryIndexV1.INVESTMENTS: "Investimentos",
    CategoryIndexV1.OTHER: "Outros",
    CategoryIndexV1.INTERPERSONAL: "Interpessoal",
}

CATEGORY_ALIASES_V1: dict[str, int] = {
    "renda": CategoryIndexV1.INCOME,
    "receita": CategoryIndexV1.INCOME,
    "receitas": CategoryIndexV1.INCOME,
    "reserva": CategoryIndexV1.RESERVE,
    "moradia": CategoryIndexV1.HOUSING,
    "aluguel": CategoryIndexV1.HOUSING,
    "utilidades": CategoryIndexV1.UTILITIES,
    "alimentacao": CategoryIndexV1.FOOD,
    "transporte": CategoryIndexV1.TRANSPORT,
    "educacao": CategoryIndexV1.EDUCATION,
    "saude": CategoryIndexV1.HEALTH,
    "despesas com saude": CategoryIndexV1.HEALTH,
    "pet": CategoryIndexV1.PET,
    "lazer": CategoryIndexV1.LEISURE,
    "lazer e entretenimento": CategoryIndexV1.LEISURE,
    "entretenimento": CategoryIndexV1.LEISURE,
    "cuidados pessoais": CategoryIndexV1.PERSONAL_CARE,
    "cuidados_pessoais": CategoryIndexV1.PERSONAL_CARE,
    "assinaturas": CategoryIndexV1.PERSONAL_CARE,
    "compras": CategoryIndexV1.SHOPPING,
    "compras pessoais": CategoryIndexV1.SHOPPING,
    "dividas": CategoryIndexV1.DEBT,
    "divida ativa": CategoryIndexV1.ACTIVE_DEBT,
    "impostos": CategoryIndexV1.TAXES,
    "investimentos": CategoryIndexV1.INVESTMENTS,
    "aportes": CategoryIndexV1.INVESTMENTS,
    "outros": CategoryIndexV1.OTHER,
    "interpessoal": CategoryIndexV1.INTERPERSONAL,
}

ESSENTIAL_CATEGORY_INDEXES_V1 = frozenset(
    {
        CategoryIndexV1.INCOME,
        CategoryIndexV1.RESERVE,
        CategoryIndexV1.HOUSING,
        CategoryIndexV1.UTILITIES,
        CategoryIndexV1.FOOD,
        CategoryIndexV1.TRANSPORT,
        CategoryIndexV1.EDUCATION,
        CategoryIndexV1.HEALTH,
        CategoryIndexV1.PET,
    }
)
"""Bootstrap defaults only; runtime `categories.essential` values override them."""


def normalize_category_v1(value: str) -> str:
    normalized = unicodedata.normalize("NFD", str(value or "").lower())
    without_marks = "".join(
        character
        for character in normalized
        if unicodedata.category(character) != "Mn"
    )
    words_only = re.sub(r"[^a-z0-9\s_]", " ", without_marks)
    return re.sub(r"\s+", " ", words_only).strip()


def category_index_v1(value: str) -> int | None:
    return CATEGORY_ALIASES_V1.get(normalize_category_v1(value))


def category_title_v1(index: int) -> str:
    return CATEGORY_TITLES_V1.get(int(index), f"Categoria {index}")


def is_essential_category_v1(index: int) -> bool:
    return int(index) in ESSENTIAL_CATEGORY_INDEXES_V1
