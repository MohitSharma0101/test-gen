"""POST /api/embed — turn enrollment photos into face signatures.

One face per photo. A photo with none, or more than one, is rejected rather
than guessed at, so a bystander never ends up enrolled as the student.
"""

import os
import sys
from typing import List

from fastapi import FastAPI, File, HTTPException, Request, UploadFile

# The entrypoint is imported from the task root, so this file's own folder is
# not on the import path and a bare `from _face import ...` raises
# ModuleNotFoundError at runtime.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from _face import check_secret, extract_faces, load_image  # noqa: E402

app = FastAPI()


@app.post("/api/embed")
@app.post("/")
async def embed(request: Request, images: List[UploadFile] = File(...)):
    if not check_secret(request.headers):
        raise HTTPException(401, "Invalid face service secret")

    results = []
    for index, upload in enumerate(images):
        try:
            faces = extract_faces(load_image(await upload.read()))
        except Exception as exc:
            results.append(
                {"index": index, "ok": False, "faceCount": 0, "reason": str(exc)}
            )
            continue

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


@app.get("/api/embed")
@app.get("/")
def health():
    # Also the warm-up target: this loads the models into the instance.
    from _face import get_models

    get_models()
    return {"status": "ok"}
