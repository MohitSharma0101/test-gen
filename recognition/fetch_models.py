"""Download the YuNet and SFace models.

The Dockerfile does this with curl at build time. This script is the
equivalent for running the service directly with uvicorn.

    python fetch_models.py            # -> ./models
    MODEL_DIR=/somewhere python fetch_models.py
"""

import os
import sys
import urllib.request

# opencv_zoo keeps these under git-lfs, so raw.githubusercontent.com returns a
# ~130 byte pointer file. The media endpoint serves the real content. A pointer
# file loads without error and then fails confusingly at request time, hence
# the minimum sizes below.
MODELS = [
    (
        "face_detection_yunet_2023mar.onnx",
        "https://media.githubusercontent.com/media/opencv/opencv_zoo/main/"
        "models/face_detection_yunet/face_detection_yunet_2023mar.onnx",
        50_000,
    ),
    (
        "face_recognition_sface_2021dec.onnx",
        "https://media.githubusercontent.com/media/opencv/opencv_zoo/main/"
        "models/face_recognition_sface/face_recognition_sface_2021dec.onnx",
        10_000_000,
    ),
]

target_dir = os.environ.get("MODEL_DIR", "models")
os.makedirs(target_dir, exist_ok=True)

failed = False
for name, url, min_bytes in MODELS:
    path = os.path.join(target_dir, name)

    if os.path.exists(path) and os.path.getsize(path) >= min_bytes:
        print(f"ok (cached)  {name}  {os.path.getsize(path):,} bytes")
        continue

    print(f"downloading  {name}")
    try:
        urllib.request.urlretrieve(url, path)
    except Exception as exc:
        print(f"FAILED       {name}: {exc}")
        failed = True
        continue

    size = os.path.getsize(path)
    if size < min_bytes:
        print(
            f"FAILED       {name}: got {size:,} bytes, expected at least "
            f"{min_bytes:,}. Likely a git-lfs pointer rather than the model."
        )
        os.remove(path)
        failed = True
    else:
        print(f"ok           {name}  {size:,} bytes")

if failed:
    print(
        "\nIf a download failed, the paths may have moved. Check\n"
        "  https://github.com/opencv/opencv_zoo/tree/main/models\n"
        "or use the mirror at https://huggingface.co/opencv/opencv_zoo",
        file=sys.stderr,
    )
    sys.exit(1)

print(f"\nmodels ready in {os.path.abspath(target_dir)}")
