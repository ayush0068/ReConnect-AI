"""
Manages regional FAISS shards with incremental updates, per the approved
architecture: "Avoid rebuilding the complete vector index after every
registration."

FAISS itself only stores vectors + integer IDs — it has no concept of your
record schema. So alongside each .index file we keep a small sidecar JSON
mapping {faiss_id: metadata} where metadata is the minimal denormalized
data needed to (a) know which MissingPerson/FoundPerson a vector belongs
to, and (b) compute non-face/text factor scores (age, gender, height,
location, timestamp) without calling back to MongoDB — keeping this
service genuinely stateless-except-for-the-index, as designed.
"""
import os
import json
import threading
import numpy as np
import faiss

from app.core.config import settings

_locks: dict[str, threading.Lock] = {}
_lock_guard = threading.Lock()


def _shard_lock(shard_key: str) -> threading.Lock:
    with _lock_guard:
        if shard_key not in _locks:
            _locks[shard_key] = threading.Lock()
        return _locks[shard_key]


def _shard_paths(region: str, vector_type: str) -> tuple[str, str]:
    os.makedirs(settings.faiss_index_dir, exist_ok=True)
    key = f"{region}_{vector_type}"
    index_path = os.path.join(settings.faiss_index_dir, f"{key}.index")
    meta_path = os.path.join(settings.faiss_index_dir, f"{key}_meta.json")
    return index_path, meta_path


def _load_shard(region: str, vector_type: str, dim: int):
    index_path, meta_path = _shard_paths(region, vector_type)

    if os.path.isfile(index_path):
        index = faiss.read_index(index_path)
    else:
        # IndexFlatIP + normalized vectors = cosine similarity search.
        # Wrapped in IndexIDMap so we can use our own integer IDs
        # (needed for incremental upsert/removal by ID).
        index = faiss.IndexIDMap(faiss.IndexFlatIP(dim))

    if os.path.isfile(meta_path):
        with open(meta_path, "r", encoding="utf-8") as f:
            meta = json.load(f)
    else:
        meta = {"next_id": 0, "records": {}}  # records: {faiss_id(str): {...}}

    return index, meta


def _save_shard(region: str, vector_type: str, index, meta: dict):
    index_path, meta_path = _shard_paths(region, vector_type)
    faiss.write_index(index, index_path)
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f)


def upsert(region: str, vector_type: str, record_id: str, source_type: str,
           embedding: list[float], metadata: dict) -> str:
    """
    Adds (or replaces) a vector for a given record in its regional shard.
    Returns a vector_id string (e.g. "IN-NCR07:face:42") — this is what
    gets stored back in MongoDB's embeddingRefs, never the raw vector.
    """
    shard_key = f"{region}_{vector_type}"
    with _shard_lock(shard_key):
        vec = np.array(embedding, dtype="float32")
        vec = vec / (np.linalg.norm(vec) + 1e-8)  # normalize for cosine-via-inner-product
        dim = vec.shape[0]

        index, meta = _load_shard(region, vector_type, dim)

        # If this record already has a vector in this shard, remove the old one first.
        existing_faiss_id = next(
            (int(fid) for fid, rec in meta["records"].items() if rec["record_id"] == record_id),
            None,
        )
        if existing_faiss_id is not None:
            index.remove_ids(np.array([existing_faiss_id], dtype="int64"))
            del meta["records"][str(existing_faiss_id)]

        faiss_id = meta["next_id"]
        meta["next_id"] += 1

        index.add_with_ids(vec.reshape(1, -1), np.array([faiss_id], dtype="int64"))
        meta["records"][str(faiss_id)] = {
            "record_id": record_id,
            "source_type": source_type,
            **metadata,
        }

        _save_shard(region, vector_type, index, meta)

        return f"{region}:{vector_type}:{faiss_id}"


def remove(vector_id: str):
    """Removes a vector by the ID string returned from upsert()."""
    region, vector_type, faiss_id_str = vector_id.split(":")
    faiss_id = int(faiss_id_str)
    shard_key = f"{region}_{vector_type}"

    with _shard_lock(shard_key):
        index_path, meta_path = _shard_paths(region, vector_type)
        if not os.path.isfile(index_path):
            return
        index = faiss.read_index(index_path)
        index.remove_ids(np.array([faiss_id], dtype="int64"))

        with open(meta_path, "r", encoding="utf-8") as f:
            meta = json.load(f)
        meta["records"].pop(faiss_id_str, None)

        _save_shard(region, vector_type, index, meta)


def search(region: str, vector_type: str, embedding: list[float], top_k: int = 10) -> list[dict]:
    """
    Returns up to top_k nearest candidates as:
        [{"record_id", "source_type", "similarity", **metadata}, ...]
    sorted by similarity descending. Empty list if the shard doesn't exist
    yet (e.g. first-ever registration in a region).
    """
    index_path, meta_path = _shard_paths(region, vector_type)
    if not os.path.isfile(index_path):
        return []

    vec = np.array(embedding, dtype="float32")
    vec = vec / (np.linalg.norm(vec) + 1e-8)

    index = faiss.read_index(index_path)
    with open(meta_path, "r", encoding="utf-8") as f:
        meta = json.load(f)

    if index.ntotal == 0:
        return []

    k = min(top_k, index.ntotal)
    similarities, ids = index.search(vec.reshape(1, -1), k)

    results = []
    for sim, faiss_id in zip(similarities[0], ids[0]):
        if faiss_id == -1:
            continue
        record = meta["records"].get(str(faiss_id))
        if record is None:
            continue
        results.append({**record, "similarity": float(sim)})

    return results