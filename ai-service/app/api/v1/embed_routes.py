from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.core.security import verify_service_token
from app.services.face_service import embed_face
from app.services.text_service import embed_text
from app.services.clothing_service import detect_clothing
from app.index import faiss_manager

router = APIRouter(dependencies=[Depends(verify_service_token)])


class RecordMetadata(BaseModel):
    """
    Minimal denormalized fields stored alongside the vector so matching
    can compute factor scores without calling back to MongoDB.
    """
    age: Optional[float] = None
    gender: Optional[str] = None
    height: Optional[float] = None
    location: Optional[list[float]] = None  # [lng, lat]
    timestamp: Optional[str] = None         # ISO 8601 — lastSeenAt or foundAt


class EmbedFaceRequest(BaseModel):
    image_url: str
    region: str
    record_id: str
    source_type: str  # 'MissingPerson' | 'FoundPerson'
    metadata: RecordMetadata


class EmbedResponse(BaseModel):
    vector_id: str | None


@router.post("/embed/face", response_model=EmbedResponse)
async def embed_face_route(payload: EmbedFaceRequest):
    embedding = embed_face(payload.image_url)
    if embedding is None:
        raise HTTPException(status_code=422, detail="No face detected in the provided image")

    vector_id = faiss_manager.upsert(
        region=payload.region,
        vector_type="face",
        record_id=payload.record_id,
        source_type=payload.source_type,
        embedding=embedding,
        metadata=payload.metadata.model_dump(),
    )
    return EmbedResponse(vector_id=vector_id)


class EmbedTextRequest(BaseModel):
    text: str
    region: str
    record_id: str
    source_type: str
    metadata: RecordMetadata


@router.post("/embed/text", response_model=EmbedResponse)
async def embed_text_route(payload: EmbedTextRequest):
    embedding = embed_text(payload.text)

    vector_id = faiss_manager.upsert(
        region=payload.region,
        vector_type="text",
        record_id=payload.record_id,
        source_type=payload.source_type,
        embedding=embedding,
        metadata=payload.metadata.model_dump(),
    )
    return EmbedResponse(vector_id=vector_id)


class DetectClothingRequest(BaseModel):
    image_url: str


class DetectClothingResponse(BaseModel):
    tags: list[dict]


@router.post("/embed/clothing", response_model=DetectClothingResponse)
async def detect_clothing_route(payload: DetectClothingRequest):
    """
    Clothing isn't stored in FAISS (no shared embedding space needed —
    see clothing_service.clothing_similarity, which compares tag sets
    directly). This just returns detected tags for Node to store on the
    record and pass back in later /match/search calls.
    """
    tags = detect_clothing(payload.image_url)
    return DetectClothingResponse(tags=tags)


class RemoveVectorResponse(BaseModel):
    success: bool


@router.delete("/embed/{vector_id}", response_model=RemoveVectorResponse)
async def remove_vector(vector_id: str):
    faiss_manager.remove(vector_id)
    return RemoveVectorResponse(success=True)