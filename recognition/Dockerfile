FROM python:3.11-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# The models live in opencv_zoo under git-lfs, so we fetch them from the LFS
# media endpoint rather than raw.githubusercontent.com, which hands back a
# ~130 byte pointer file instead. The size assertions below exist because a
# pointer file loads without error and then fails at request time with a
# confusing OpenCV message, so we would rather break the build here.
RUN mkdir -p /app/models \
    && curl -fsSL -o /app/models/face_detection_yunet_2023mar.onnx \
       https://media.githubusercontent.com/media/opencv/opencv_zoo/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx \
    && curl -fsSL -o /app/models/face_recognition_sface_2021dec.onnx \
       https://media.githubusercontent.com/media/opencv/opencv_zoo/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx \
    && test "$(stat -c%s /app/models/face_detection_yunet_2023mar.onnx)" -gt 50000 \
    && test "$(stat -c%s /app/models/face_recognition_sface_2021dec.onnx)" -gt 10000000

COPY main.py .

ENV PORT=8080
EXPOSE 8080

CMD exec uvicorn main:app --host 0.0.0.0 --port ${PORT}
