"""
Clothing/object detection using YOLOv8.
Returns a list of detected labels + confidence, used two ways:
  1. Stored as tags on the record (for humans reviewing a case)
  2. Compared between two records via simple tag-overlap (Jaccard similarity)
     in matching_service.py — a full embedding-based clothing similarity is
     a reasonable future upgrade, but tag overlap is a solid, explainable
     first version (fits the explainability requirement well: "clothing
     match: shared 'red shirt', 'backpack'" is easy for a reviewer to read).
"""
import os
import io
import requests
from ultralytics import YOLO
from PIL import Image

_model = None
_FINE_TUNED_PATH = "runs/detect/clothing-finetuned/weights/best.pt"
_BASE_WEIGHTS = "yolov8n.pt"


def _get_model():
    global _model
    if _model is None:
        weights = _FINE_TUNED_PATH if os.path.isfile(_FINE_TUNED_PATH) else _BASE_WEIGHTS
        print(f"[clothing_service] loading weights from: {weights}")
        _model = YOLO(weights)
    return _model


def detect_clothing(image_url: str, confidence_threshold: float = 0.4) -> list[dict]:
    """
    Returns detected items as [{"label": "backpack", "confidence": 0.87}, ...]
    """
    model = _get_model()
    resp = requests.get(image_url, timeout=10)
    resp.raise_for_status()
    img = Image.open(io.BytesIO(resp.content)).convert('RGB')

    results = model.predict(img, conf=confidence_threshold, verbose=False)
    detections = []
    for result in results:
        for box in result.boxes:
            label = result.names[int(box.cls[0])]
            confidence = float(box.conf[0])
            detections.append({"label": label, "confidence": round(confidence, 3)})

    return detections


def clothing_similarity(tags_a: list[dict], tags_b: list[dict]) -> float:
    """
    Jaccard similarity between two sets of detected labels.
    Simple, explainable, and a reasonable v1 — swap for embedding-based
    similarity later if tag overlap proves too coarse.
    """
    set_a = {t["label"] for t in tags_a}
    set_b = {t["label"] for t in tags_b}
    if not set_a and not set_b:
        return 0.0
    intersection = set_a & set_b
    union = set_a | set_b
    return round(len(intersection) / len(union), 3) if union else 0.0