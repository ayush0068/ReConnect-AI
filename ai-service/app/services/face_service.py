"""
Real face embedding extraction — replaces the earlier stub.
Uses the same pretrained model you already validated with
test_face_embedding.py / compare_faces.py, now wired into the app
as a reusable, lazily-loaded singleton (models are expensive to load,
so we load once per process, not per request).
"""
import io
import requests
import torch
from PIL import Image
from facenet_pytorch import MTCNN, InceptionResnetV1

_device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
_mtcnn = None
_model = None


def _get_models():
    global _mtcnn, _model
    if _model is None:
        _mtcnn = MTCNN(image_size=160, margin=20, device=_device)
        _model = InceptionResnetV1(pretrained='vggface2').eval().to(_device)
    return _mtcnn, _model


def _load_image_from_url(image_url: str) -> Image.Image:
    resp = requests.get(image_url, timeout=10)
    resp.raise_for_status()
    return Image.open(io.BytesIO(resp.content)).convert('RGB')


def embed_face(image_url: str) -> list[float] | None:
    """
    Downloads the image from its Cloudinary URL, detects the face,
    and returns a 512-dim embedding as a plain list (JSON-serializable,
    and what faiss_manager.py expects for indexing).
    Returns None if no face is detected.
    """
    mtcnn, model = _get_models()
    img = _load_image_from_url(image_url)

    face_tensor = mtcnn(img)
    if face_tensor is None:
        return None

    with torch.no_grad():
        embedding = model(face_tensor.unsqueeze(0).to(_device))

    return embedding[0].cpu().tolist()