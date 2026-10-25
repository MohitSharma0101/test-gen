"""Face recognition service for attendance.

Two endpoints:
  POST /embed      images                  -> one face signature per image (enrollment)
  POST /recognize  images + roster vectors -> who was seen (attendance)

The service is stateless and holds no credentials. The caller sends the
batch's enrolled signatures with each request, so this container never
needs database access.
"""

import base64
import io
import json
import os
from typing import Any, Dict, List

import cv2
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from PIL import Image, ImageOps
from pydantic import BaseModel, ValidationError

# /app/models in the container; override when running directly with uvicorn.
MODEL_DIR = os.environ.get("MODEL_DIR", "/app/models")
DETECTOR_PATH = f"{MODEL_DIR}/face_detection_yunet_2023mar.onnx"
RECOGNIZER_PATH = f"{MODEL_DIR}/face_recognition_sface_2021dec.onnx"

# SFace cosine similarity. OpenCV documents 0.363 as the same-identity
# boundary, so we auto-mark comfortably above it and review the band just
# below. Both need retuning once there is real labelled data.
AUTO_THRESHOLD = 0.45
REVIEW_THRESHOLD = 0.30

# A face narrower than this has too few pixels to identify reliably.
MIN_FACE_WIDTH = 50

# Detector confidence, NMS overlap, and the cap on faces per image.
DETECT_SCORE = 0.7
DETECT_NMS = 0.3
DETECT_TOP_K = 5000

app = FastAPI(title="Attendance face recognition")

detector = cv2.FaceDetectorYN.create(
    DETECTOR_PATH, "", (320, 320), DETECT_SCORE, DETECT_NMS, DETECT_TOP_K
)
recognizer = cv2.FaceRecognizerSF.create(RECOGNIZER_PATH, "")


class RosterEntry(BaseModel):
    userId: str
    vectors: List[List[float]]


def load_image(raw: bytes) -> np.ndarray:
    """Decode an upload to BGR, honouring EXIF rotation.

    Phone photos carry their orientation in EXIF rather than in the pixel
    data. cv2.imdecode ignores it, which silently hands the detector
    sideways faces, so we decode through Pillow instead.
    """
    try:
        pil = Image.open(io.BytesIO(raw))
        pil = ImageOps.exif_transpose(pil).convert("RGB")
    except Exception as exc:
        raise HTTPException(400, f"Could not read image: {exc}")
    return cv2.cvtColor(np.array(pil), cv2.COLOR_RGB2BGR)


def extract_faces(image: np.ndarray) -> List[Dict[str, Any]]:
    """Detect, align and sign every usable face in one image."""
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
    return float(recognizer.match(stored, feature, cv2.FaceRecognizerSF_FR_COSINE))


def crop_to_base64(crop: np.ndarray) -> str:
    ok, buffer = cv2.imencode(".jpg", crop, [cv2.IMWRITE_JPEG_QUALITY, 80])
    if not ok:
        return ""
    return base64.b64encode(buffer).decode("ascii")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/embed")
async def embed(images: List[UploadFile] = File(...)):
    """Turn enrollment photos into signatures, one face per photo.

    A photo with no face, or more than one, is rejected rather than guessed
    at, so a bystander never ends up enrolled as the student.
    """
    results = []
    for index, upload in enumerate(images):
        faces = extract_faces(load_image(await upload.read()))

        if len(faces) != 1:
            results.append(
                {
                    "index": index,
                    "ok": False,
                    "faceCount": len(faces),
                    "reason": "no face found"
                    if not faces
                    else f"{len(faces)} faces found, expected 1",
                }
            )
            continue

        results.append(
            {
                "index": index,
                "ok": True,
                "faceCount": 1,
                "faceWidth": faces[0]["width"],
                "vector": faces[0]["feature"].flatten().tolist(),
            }
        )

    return {"results": results}


@app.post("/recognize")
async def recognize(
    images: List[UploadFile] = File(...),
    roster: str = Form(...),
):
    """Match the faces in a class photo set against that batch's roster.

    roster is JSON: [{"userId": "...", "vectors": [[...], ...]}, ...]
    """
    try:
        entries = [RosterEntry(**entry) for entry in json.loads(roster)]
    except (json.JSONDecodeError, ValidationError, TypeError) as exc:
        raise HTTPException(400, f"Invalid roster: {exc}")

    if not entries:
        raise HTTPException(400, "Roster is empty")

    faces: List[Dict[str, Any]] = []
    for upload in images:
        faces.extend(extract_faces(load_image(await upload.read())))

    if not faces:
        return {
            "recognised": [],
            "uncertain": [],
            "notDetected": [entry.userId for entry in entries],
            "stats": {"imagesProcessed": len(images), "facesDetected": 0},
        }

    # Best similarity between each student's enrolled signatures and each
    # detected face. Taking the max over a student's set, rather than an
    # average, is what makes multi-photo enrollment pay off.
    scores = np.zeros((len(entries), len(faces)), dtype=np.float32)
    for s_index, entry in enumerate(entries):
        stored = [
            np.asarray(vector, dtype=np.float32).reshape(1, -1)
            for vector in entry.vectors
        ]
        if not stored:
            continue
        for f_index, face in enumerate(faces):
            scores[s_index, f_index] = max(
                similarity(vector, face["feature"]) for vector in stored
            )

    # Greedy one-to-one assignment, strongest match first. One face cannot
    # be two students, and one student cannot be two faces, so a confident
    # pairing removes both from contention.
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
                    "userId": entries[s_index].userId,
                    "confidence": round(match["score"], 4),
                }
            )
            continue

        # Below the auto bar: hand the teacher the face and the two most
        # likely names rather than committing to a guess.
        face_index = match["face"]
        ranked = np.argsort(-scores[:, face_index])[:2]
        uncertain.append(
            {
                "candidates": [
                    {
                        "userId": entries[int(i)].userId,
                        "confidence": round(float(scores[int(i), face_index]), 4),
                    }
                    for i in ranked
                ],
                "crop": crop_to_base64(faces[face_index]["crop"]),
                # Returned so a teacher's correction can be stored as a new
                # signature. Classroom conditions make these the most useful
                # training data available, which is what lifts accuracy over
                # the first few weeks.
                "vector": faces[face_index]["feature"].flatten().tolist(),
            }
        )

    identified = {item["userId"] for item in recognised}
    pending = {
        candidate["userId"] for item in uncertain for candidate in item["candidates"]
    }

    return {
        "recognised": recognised,
        "uncertain": uncertain,
        "notDetected": [
            entry.userId
            for entry in entries
            if entry.userId not in identified and entry.userId not in pending
        ],
        "stats": {
            "imagesProcessed": len(images),
            "facesDetected": len(faces),
            "facesUnmatched": len(faces) - len(claimed_faces),
        },
    }
