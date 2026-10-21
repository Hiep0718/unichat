"""Validated RAG wire types and immutable source provenance."""

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SourceVersion(BaseModel):
    """Document identity supplied only by the Core authorization boundary."""

    model_config = ConfigDict(extra="forbid")
    documentId: UUID
    ingestionVersion: int = Field(ge=1, strict=True)
    contentHash: str = Field(pattern=r"^[a-f0-9]{64}$")
    fileName: str = Field(min_length=1, max_length=255)


class SourceDependency(BaseModel):
    """Version-bound source dependency carried by a history/summary record."""

    documentId: UUID
    ingestionVersion: int = Field(ge=1, strict=True)
    contentHash: str = Field(pattern=r"^[a-f0-9]{64}$")


class HistoryMessage(BaseModel):
    """History is untrusted content; assistant context requires current dependencies."""

    role: Literal["user", "assistant", "USER", "ASSISTANT"]
    content: str = Field(min_length=1, max_length=12000)
    sources: list[SourceDependency] = Field(default_factory=list, max_length=1000)


class RetrievalAnswerRequest(BaseModel):
    """Core-only request; omitted generation policy is deliberately fail closed."""

    model_config = ConfigDict(extra="forbid")
    workspaceId: UUID
    allowedDocumentIds: list[UUID] = Field(max_length=1000)
    question: str = Field(min_length=3, max_length=2000)
    strategyVersion: str = Field(default="v1.0", min_length=1, max_length=40)
    requestId: str = Field(min_length=1, max_length=100)
    operationId: UUID | None = None
    cloudAllowed: bool | None = Field(default=None, strict=True)
    permissionVersion: int | None = Field(default=None, ge=0, strict=True)
    workspaceVersion: int | None = Field(default=None, ge=0, strict=True)
    sourceFingerprint: str | None = Field(default=None, max_length=128)
    fingerprint: str | None = Field(default=None, max_length=128)
    sources: list[SourceVersion] = Field(default_factory=list, max_length=1000)
    allowExternalKnowledge: bool = Field(default=False, strict=True)
    conversationHistory: list[HistoryMessage] = Field(default_factory=list, max_length=20)
    conversationSummary: str | None = Field(default=None, max_length=5000)
    summarySources: list[SourceDependency] = Field(default_factory=list, max_length=1000)


class CitationItem(BaseModel):
    """An actual retrieved chunk and its validated current document version."""

    citationId: str
    documentId: str
    chunkId: str
    ingestionVersion: int
    contentHash: str
    fileName: str
    locator: str
    excerpt: str
    score: float


class FactualClaim(BaseModel):
    """A complete displayed statement and its explicit evidence references."""

    model_config = ConfigDict(extra="forbid")
    text: str = Field(min_length=1, max_length=6000)
    citationIds: list[str] = Field(default_factory=list, max_length=100)


class AnswerSection(BaseModel):
    """All displayed substantive content must be represented by its claims."""

    model_config = ConfigDict(extra="forbid")
    type: Literal["DOCUMENT", "EXTERNAL"]
    claims: list[FactualClaim] = Field(min_length=1, max_length=100)
    content: str = Field(default="", max_length=15000)


class GeneratedAnswer(BaseModel):
    """The only accepted generator output; answer prose is built by the server."""

    model_config = ConfigDict(extra="forbid")
    sections: list[AnswerSection] = Field(min_length=1, max_length=20)


class RetrievalAnswerResponse(BaseModel):
    """Validated private result; only Core can commit/complete a public operation."""

    decision: str
    intent: str
    strategyVersion: str
    configHash: str | None = None
    evidenceScore: float = 0.0
    operationId: str | None = None
    knowledgeMode: Literal["STRICT", "EXPANDED"] = "STRICT"
    sections: list[AnswerSection] = Field(default_factory=list)
    answer: str | None = None
    provider: str | None = None
    citations: list[CitationItem] = Field(default_factory=list)
    refusalCode: str | None = None
    refusalReason: str | None = None
    requestId: str
    compactedSummary: str | None = None
    summarySources: list[SourceDependency] = Field(default_factory=list)
    singleSourceWarning: bool = False
    warningMessage: str | None = None
