"""Shared face detection and matching, used by the embed and recognize
functions.

The leading underscore keeps Vercel from treating this file as a route.

Models are downloaded to /tmp on cold start rather than bundled, which keeps
each function's bundle well under the size limit and keeps 38 MB of binaries
out of git. /tmp survives between warm invocations, so the download happens
once per instance, not once per request.
"""

import base64
import io
import os
import urllib.request
from typing import Any, Dict, List

import cv2
import numpy as np
from PIL import Image, ImageOps

MODEL_DIR = os.environ.get("MODEL_DIR", "/tmp/face-models")

# opencv_zoo keeps these under git-lfs, so the media endpoint is required:
# raw.githubusercontent.com returns a ~130 byte pointer file instead.
MODELS = {
    "detector": (
        "face_detection_yunet_2023mar.onnx",
        "https://media.githubusercontent.com/media/opencv/opencv_zoo/main/"
        "models/face_detection_yunet/face_detection_yunet_2023mar.onnx",
        50_000,
    ),
    "recognizer": (
        "face_recognition_sface_2021dec.onnx",
        "https://media.githubusercontent.com/media/opencv/opencv_zoo/main/"
        "models/face_recognition_sface/face_recognition_sface_2021dec.onnx",
        10_000_000,
    ),
}

# SFace cosine similarity. OpenCV documents 0.363 as the same-identity
# boundary, so we auto-mark above it and review the band just below. Both
# need retuning once there is real labelled data.
AUTO_THRESHOLD = float(os.environ.get("FACE_AUTO_THRESHOLD", "0.45"))
REVIEW_THRESHOLD = float(os.environ.get("FACE_REVIEW_THRESHOLD", "0.30"))

# A face narrower than this has too few pixels to identify reliably.
MIN_FACE_WIDTH = int(os.environ.get("FACE_MIN_WIDTH", "50"))

DETECT_SCORE = 0.7
DETECT_NMS = 0.3
DETECT_TOP_K = 5000

_detector = None
_recognizer = None


def _ensure_model(name: str) -> str:
    filename, url, min_bytes = MODELS[name]
    path = os.path.join(MODEL_DIR, filename)

    if os.path.exists(path) and os.path.getsize(path) >= min_bytes:
        return path

    os.makedirs(MODEL_DIR, exist_ok=True)
    urllib.request.urlretrieve(url, path)

    # A git-lfs pointer loads without error and then fails confusingly at
    # request time, so a short file is treated as a failed download.
    size = os.path.getsize(path)
    if size < min_bytes:
        os.remove(path)
        raise RuntimeError(
            f"{filename} downloaded as {size} bytes, expected at least "
            f"{min_bytes}. Likely a git-lfs pointer rather than the model."
        )
    return path


def get_models():
    """Load once per instance; warm invocations reuse these."""
    global _detector, _recognizer
    if _detector is None:
        _detector = cv2.FaceDetectorYN.create(
            _ensure_model("detector"),
            "",
            (320, 320),
            DETECT_SCORE,
            DETECT_NMS,
            DETECT_TOP_K,
        )
    if _recognizer is None:
        _recognizer = cv2.FaceRecognizerSF.create(_ensure_model("recognizer"), "")
    return _detector, _recognizer


def check_secret(headers) -> bool:
    """The function URL is public, so a shared secret gates it."""
    expected = os.environ.get("FACE_SECRET")
    if not expected:
        return True  # unset means local development
    return headers.get("x-face-secret") == expected


def load_image(raw: bytes) -> np.ndarray:
    """Decode to BGR, honouring EXIF rotation.

    Phone photos carry orientation in EXIF rather than the pixel data, and
    cv2.imdecode ignores it, which silently hands the detector sideways faces.
    """
    pil = Image.open(io.BytesIO(raw))
    pil = ImageOps.exif_transpose(pil).convert("RGB")
    return cv2.cvtColor(np.array(pil), cv2.COLOR_RGB2BGR)


def extract_faces(image: np.ndarray) -> List[Dict[str, Any]]:
    detector, recognizer = get_models()

    height, width = image.shape[:2]
    detector.setInputSize((width, height))
    _, detections = detector.detect(image)
    if detections is None:
        return []

    faces = []
    for detection in detections:
        face_width = float(detection[2])
        if face_width < MIN_FACE_WIDTH:
            continue
        aligned = recognizer.alignCrop(image, detection)
        feature = recognizer.feature(aligned)
        faces.append(
            {
                "feature": np.asarray(feature, dtype=np.float32).reshape(1, -1),
                "width": face_width,
                "crop": aligned,
            }
        )
    return faces


def similarity(stored: np.ndarray, feature: np.ndarray) -> float:
    _, recognizer = get_models()
    return float(recognizer.match(stored, feature, cv2.FaceRecognizerSF_FR_COSINE))


def crop_to_base64(crop: np.ndarray) -> str:
    ok, buffer = cv2.imencode(".jpg", crop, [cv2.IMWRITE_JPEG_QUALITY, 80])
    return base64.b64encode(buffer).decode("ascii") if ok else ""


def match_roster(faces: List[Dict[str, Any]], entries: List[Dict[str, Any]]):
    """Pair detected faces with roster students.

    Returns (recognised, uncertain, not_detected, claimed_face_count).
    """
    scores = np.zeros((len(entries), len(faces)), dtype=np.float32)
    for s_index, entry in enumerate(entries):
        stored = [
            np.asarray(vector, dtype=np.float32).reshape(1, -1)
            for vector in entry.get("vectors", [])
        ]
        if not stored:
            continue
        for f_index, face in enumerate(faces):
            # Max over a student's set, not an average: that is what makes
            # enrolling several angles pay off.
            scores[s_index, f_index] = max(
                similarity(vector, face["feature"]) for vector in stored
            )

    # Greedy one-to-one assignment, strongest match first. One face cannot be
    # two students and one student cannot be two faces, so a confident pairing
    # removes both from contention.
    order = np.dstack(np.unravel_index(np.argsort(-scores, axis=None), scores.shape))[0]
    claimed_students: Dict[int, Dict[str, Any]] = {}
    claimed_faces = set()

    for s_index, f_index in order:
        score = float(scores[s_index, f_index])
        if score < REVIEW_THRESHOLD:
            break
        if int(s_index) in claimed_students or int(f_index) in claimed_faces:
            continue
        claimed_students[int(s_index)] = {"face": int(f_index), "score": score}
        claimed_faces.add(int(f_index))

    recognised, uncertain = [], []
    for s_index, match in claimed_students.items():
        if match["score"] >= AUTO_THRESHOLD:
            recognised.append(
                {
                    "userId": entries[s_index]["userId"],
                    "confidence": round(match["score"], 4),
                }
            )
            continue

        # Below the auto bar: hand the teacher the face and the likeliest names
        # rather than committing to a guess.
        face_index = match["face"]
        ranked = np.argsort(-scores[:, face_index])[:2]
        uncertain.append(
            {
                "candidates": [
                    {
                        "userId": entries[int(i)]["userId"],
                        "confidence": round(float(scores[int(i), face_index]), 4),
                    }
                    for i in ranked
                ],
                "crop": crop_to_base64(faces[face_index]["crop"]),
                # Returned so a teacher's correction can be stored as a new
                # signature taken in real classroom conditions.
                "vector": faces[face_index]["feature"].flatten().tolist(),
            }
        )

    identified = {item["userId"] for item in recognised}
    pending = {
        candidate["userId"] for item in uncertain for candidate in item["candidates"]
    }
    not_detected = [
        entry["userId"]
        for entry in entries
        if entry["userId"] not in identified and entry["userId"] not in pending
    ]

    return recognised, uncertain, not_detected, len(claimed_faces)
