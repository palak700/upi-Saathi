"""QR Safety Guardian: image-based QR decoding with OpenCV + pyzbar and an
EasyOCR fallback. Heavy dependencies are imported lazily so the API still
boots when the vision stack is not installed on the host.
"""

import base64
import io
from typing import Optional

from .config import get_settings

settings = get_settings()


def decode_qr_image(image_bytes: bytes) -> list[str]:
    """Return every string found in a QR code inside the image bytes."""
    payloads: list[str] = []

    # 1. OpenCV + pyzbar (fast, reliable for clean codes).
    try:
        import cv2
        from pyzbar import pyzbar

        array = np_from_bytes(image_bytes)
        if array is not None:
            gray = cv2.cvtColor(array, cv2.COLOR_BGR2GRAY)
            for decoded in pyzbar.decode(gray):
                text = decoded.data.decode("utf-8", errors="ignore").strip()
                if text:
                    payloads.append(text)
    except Exception:
        pass

    # 2. EasyOCR fallback for noisy or photographed codes.
    if not payloads and settings.ocr_enabled:
        try:
            import easyocr

            reader = easyocr.Reader(["en"], gpu=False, verbose=False)
            results = reader.readtext(image_bytes_to_pil(image_bytes), detail=0)
            for text in results:
                cleaned = str(text).strip()
                if cleaned and ("upi://" in cleaned or "@" in cleaned or len(cleaned) > 6):
                    payloads.append(cleaned)
        except Exception:
            pass

    return payloads


def decode_qr_base64(image_b64: str) -> list[str]:
    raw = base64.b64decode(image_b64)
    return decode_qr_image(raw)


def upi_payload_from_image(image_bytes: bytes) -> Optional[str]:
    """Return the first UPI-style payload inside an image, if any."""
    for text in decode_qr_image(image_bytes):
        if "upi://" in text.lower() or "@" in text:
            return text
    return None


def image_bytes_to_pil(data: bytes):
    from PIL import Image

    return Image.open(io.BytesIO(data))


def np_from_bytes(data: bytes):
    import numpy as np

    arr = np.frombuffer(data, dtype=np.uint8)
    return cv2_decode(arr)


def cv2_decode(arr):
    import cv2

    return cv2.imdecode(arr, cv2.IMREAD_COLOR)