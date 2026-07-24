"""
Real text embedding extraction for free-form descriptions.
Loads the fine-tuned model from train_text_similarity.py if it exists,
otherwise falls back to the pretrained base model — so this works from
day one and automatically picks up improvements once you've fine-tuned.
"""
import os
from sentence_transformers import SentenceTransformer

_model = None
_FINE_TUNED_PATH = "./models/text-similarity-finetuned"
_BASE_MODEL = "all-MiniLM-L6-v2"


def _get_model():
    global _model
    if _model is None:
        model_path = _FINE_TUNED_PATH if os.path.isdir(_FINE_TUNED_PATH) else _BASE_MODEL
        print(f"[text_service] loading model from: {model_path}")
        _model = SentenceTransformer(model_path)
    return _model


def embed_text(text: str) -> list[float]:
    """Returns a fixed-length embedding for a free-form description string."""
    model = _get_model()
    embedding = model.encode(text, normalize_embeddings=True)
    return embedding.tolist()