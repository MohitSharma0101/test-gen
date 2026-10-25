"""POST /api/recognize — match faces in class photos against a batch roster.

The roster's signatures are sent with the request, so this function holds no
credentials and never reaches the database. It also scopes matching to one
batch rather than the whole school, which is both faster and markedly more
accurate since there are far fewer people to confuse someone with.
"""

import json
from typing import Any, Dict, List

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile

from _face import check_secret, extract_faces, load_image, match_roster

app = FastAPI()


@app.post("/api/recognize")
@app.post("/")
async def recognize(
    request: Request,
    images: List[UploadFile] = File(...),
    roster: str = Form(...),
):
    if not check_secret(request.headers):
        raise HTTPException(401, "Invalid face service secret")

    try:
        entries: List[Dict[str, Any]] = json.loads(roster)
    except json.JSONDecodeError as exc:
        raise HTTPException(400, f"Invalid roster: {exc}")

    if not isinstance(entries, list) or not entries:
        raise HTTPException(400, "Roster is empty")
    for entry in entries:
        if not isinstance(entry, dict) or "userId" not in entry:
            raise HTTPException(400, "Each roster entry needs a userId")

    faces: List[Dict[str, Any]] = []
    for upload in images:
        try:
            faces.extend(extract_faces(load_image(await upload.read())))
        except Exception as exc:
            raise HTTPException(400, f"Could not read a photo: {exc}")

    if not faces:
        return {
            "recognised": [],
            "uncertain": [],
            "notDetected": [entry["userId"] for entry in entries],
            "stats": {"imagesProcessed": len(images), "facesDetected": 0},
        }

    recognised, uncertain, not_detected, claimed = match_roster(faces, entries)

    return {
        "recognised": recognised,
        "uncertain": uncertain,
        "notDetected": not_detected,
        "stats": {
            "imagesProcessed": len(images),
            "facesDetected": len(faces),
            "facesUnmatched": len(faces) - claimed,
        },
    }


@app.get("/api/recognize")
@app.get("/")
def health():
    # Also the warm-up target: this loads the models into the instance.
    from _face import get_models

    get_models()
    return {"status": "ok"}
