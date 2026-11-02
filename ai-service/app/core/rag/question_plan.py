"""Bounded, source-independent answer facets and retrieval query variants."""

import unicodedata
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

MAX_PLAN_FACETS = 4
MAX_QUERY_VARIANTS = 2
BoundedQuery = Annotated[
    str, StringConstraints(min_length=3, max_length=2000, strip_whitespace=True)
]


class AnswerFacet(BaseModel):
    """One independently answerable part of the user's question."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    facet_id: str = Field(
        alias="facetId", min_length=1, max_length=32, pattern=r"^[a-z][a-z0-9_-]*$"
    )
    query: BoundedQuery
    query_variants: list[BoundedQuery] = Field(
        default_factory=list, alias="queryVariants", max_length=MAX_QUERY_VARIANTS
    )

    @model_validator(mode="after")
    def validate_query_variants(self) -> "AnswerFacet":
        """Reject repeated variants and variants identical to the primary query."""
        queries = [self.query, *self.query_variants]
        normalized = [_normalize_query(query) for query in queries]
        if len(normalized) != len(set(normalized)):
            raise ValueError("Facet queries must be unique.")
        return self


class QuestionPlan(BaseModel):
    """Validated model proposal; it neither grants source access nor contains evidence."""

    model_config = ConfigDict(extra="forbid")

    facets: list[AnswerFacet] = Field(min_length=1, max_length=MAX_PLAN_FACETS)

    @model_validator(mode="after")
    def validate_facet_ids(self) -> "QuestionPlan":
        """Require stable, unique facet identifiers for later coverage mapping."""
        identifiers = [facet.facet_id for facet in self.facets]
        if len(identifiers) != len(set(identifiers)):
            raise ValueError("Facet identifiers must be unique.")
        return self


def _normalize_query(query: str) -> str:
    return " ".join(unicodedata.normalize("NFC", query).casefold().split())
