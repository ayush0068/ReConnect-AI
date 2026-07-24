from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from app.core.security import verify_service_token
from app.core.config import settings
from app.services.matching_service import find_candidates
from app.services.clothing_service import clothing_similarity

router = APIRouter(dependencies=[Depends(verify_service_token)])

MODEL_VERSION = "facenet-vggface2_minilm-l6-v2_yolov8n"


class SourceMetadata(BaseModel):
    age: Optional[float] = None
    gender: Optional[str] = None
    height: Optional[float] = None
    location: Optional[list[float]] = None
    timestamp: Optional[str] = None
    clothing_tags: Optional[list[dict]] = None


class MatchSearchRequest(BaseModel):
    region: str
    face_embedding: Optional[list[float]] = None
    text_embedding: Optional[list[float]] = None
    source_metadata: SourceMetadata
    top_k: int = settings.default_top_k


class MatchCandidate(BaseModel):
    target_person_id: str
    target_type: str
    factor_scores: dict


class MatchSearchResponse(BaseModel):
    candidates: list[MatchCandidate]
    model_version: str


@router.post("/match/search", response_model=MatchSearchResponse)
async def match_search(payload: MatchSearchRequest):
    """
    Node calls this with whichever embeddings + metadata it already has
    for the source record (a newly registered MissingPerson or FoundPerson).
    Raw per-factor scores come back for every candidate found in the
    region's face/text FAISS shards — Node then applies the configurable
    weight table (Settings.ai_weights_v1) to compute overallConfidence
    and persists the result to AIResults.
    """
    source_meta = payload.source_metadata.model_dump()

    candidates = find_candidates(
        region=payload.region,
        face_embedding=payload.face_embedding,
        text_embedding=payload.text_embedding,
        source_metadata=source_meta,
        top_k=payload.top_k,
    )

    # Clothing similarity requires both sides' detected tags, which aren't
    # stored in FAISS metadata (kept lightweight/numeric there) — Node
    # passes the source's tags here, and we'd need the candidate's tags
    # too. For now this assumes Node stores clothing_tags in the same
    # metadata dict passed to /embed/face — a straightforward extension
    # once you're ready to wire it end-to-end.
    source_tags = source_meta.get("clothing_tags") or []
    for candidate in candidates:
        candidate_tags = candidate["factor_scores"].get("_clothing_tags", [])
        candidate["factor_scores"]["clothingSimilarity"] = clothing_similarity(source_tags, candidate_tags)
        candidate["factor_scores"].pop("_clothing_tags", None)

    return MatchSearchResponse(
        candidates=[MatchCandidate(**c) for c in candidates],
        model_version=MODEL_VERSION,
    )