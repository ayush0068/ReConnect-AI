"""
Combines face + text FAISS candidate search with the remaining factor
scores computed directly from the metadata stored alongside each vector
(age, gender, height, location, timestamp). Returns RAW per-factor scores
only — final weighted overallConfidence is computed in Node.js from the
configurable Settings.ai_weights_v1 table, per the approved architecture
(weighting logic lives outside the ML layer).
"""
import math
from datetime import datetime
from app.index import faiss_manager
from app.services.clothing_service import clothing_similarity


def _age_similarity(age_a, age_b) -> float | None:
    if age_a is None or age_b is None:
        return None
    diff = abs(age_a - age_b)
    return round(max(0.0, 1 - diff / 20), 3)  # 20+ year gap => 0 similarity


def _height_similarity(h_a, h_b) -> float | None:
    if h_a is None or h_b is None:
        return None
    diff = abs(h_a - h_b)
    return round(max(0.0, 1 - diff / 30), 3)  # 30+ cm gap => 0 similarity


def _location_proximity(loc_a, loc_b) -> float | None:
    """Haversine distance normalized to a 0-1 proximity score (closer = higher)."""
    if not loc_a or not loc_b:
        return None
    lat1, lng1 = math.radians(loc_a[1]), math.radians(loc_a[0])
    lat2, lng2 = math.radians(loc_b[1]), math.radians(loc_b[0])
    dlat, dlng = lat2 - lat1, lng2 - lng1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng / 2) ** 2
    distance_km = 2 * 6371 * math.asin(math.sqrt(a))
    return round(max(0.0, 1 - distance_km / 100), 3)  # 100+ km apart => 0 proximity


def _timeline_similarity(ts_a, ts_b) -> float | None:
    if not ts_a or not ts_b:
        return None
    d1 = datetime.fromisoformat(ts_a)
    d2 = datetime.fromisoformat(ts_b)
    days_apart = abs((d1 - d2).days)
    return round(max(0.0, 1 - days_apart / 90), 3)  # 90+ days apart => 0 similarity


def find_candidates(region: str, face_embedding: list[float] | None,
                     text_embedding: list[float] | None, source_metadata: dict,
                     top_k: int = 10) -> list[dict]:
    """
    Searches both the face and text shards for this region, merges results
    by record_id, and attaches every raw factor score we can compute.
    Clothing similarity is filled in by the caller (Node passes both
    records' detected tags — see match_routes.py) since it isn't FAISS-indexed here.
    """
    candidates_by_id: dict[str, dict] = {}

    if face_embedding is not None:
        for hit in faiss_manager.search(region, "face", face_embedding, top_k):
            candidates_by_id.setdefault(hit["record_id"], {"metadata": hit})["faceSimilarity"] = hit["similarity"]

    if text_embedding is not None:
        for hit in faiss_manager.search(region, "text", text_embedding, top_k):
            entry = candidates_by_id.setdefault(hit["record_id"], {"metadata": hit})
            entry["descriptionSimilarity"] = hit["similarity"]
            entry.setdefault("metadata", hit)

    results = []
    for record_id, entry in candidates_by_id.items():
        meta = entry["metadata"]
        factor_scores = {
            "faceSimilarity": entry.get("faceSimilarity"),
            "descriptionSimilarity": entry.get("descriptionSimilarity"),
            "clothingSimilarity": None,  # filled in by caller with tag data from both sides
            "ageSimilarity": _age_similarity(source_metadata.get("age"), meta.get("age")),
            "genderMatch": (
                source_metadata.get("gender") == meta.get("gender")
                if source_metadata.get("gender") and meta.get("gender") else None
            ),
            "heightSimilarity": _height_similarity(source_metadata.get("height"), meta.get("height")),
            "locationProximity": _location_proximity(source_metadata.get("location"), meta.get("location")),
            "timelineSimilarity": _timeline_similarity(source_metadata.get("timestamp"), meta.get("timestamp")),
        }
        results.append({
            "target_person_id": record_id,
            "target_type": meta.get("source_type"),
            "factor_scores": factor_scores,
        })

    return results