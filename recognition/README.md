# Attendance face recognition service

Stateless HTTP service. Detects faces with YuNet, signs them with SFace, and
matches them against a roster the caller supplies. It holds no credentials and
never touches the database.

Both models are Apache/MIT licensed and safe for commercial use, unlike
InsightFace's pretrained packs which are research-only.

## Endpoints

### `POST /embed` — enrollment

Multipart, field name `images` (repeatable). One face per photo; anything else
is rejected rather than guessed at.

```bash
curl -X POST $URL/embed \
  -F "images=@front.jpg" \
  -F "images=@left.jpg" \
  -F "images=@right.jpg"
```

```json
{ "results": [
  { "index": 0, "ok": true,  "faceCount": 1, "faceWidth": 212.0, "vector": [0.02, -0.11, "..."] },
  { "index": 1, "ok": false, "faceCount": 2, "reason": "2 faces found, expected 1" }
]}
```

Store each `vector` as one `FaceSignature` document. Discard the photo.

### `POST /recognize` — attendance

Multipart: `images` (repeatable) plus `roster`, a JSON string.

```bash
curl -X POST $URL/recognize \
  -F "images=@left.jpg" -F "images=@middle.jpg" -F "images=@right.jpg" \
  -F 'roster=[{"userId":"665...","vectors":[[0.02,-0.11,"..."]]}]'
```

```json
{
  "recognised":  [{ "userId": "665...", "confidence": 0.71 }],
  "uncertain":   [{ "candidates": [{ "userId": "665...", "confidence": 0.38 },
                                   { "userId": "667...", "confidence": 0.33 }],
                    "crop": "<base64 jpeg>" }],
  "notDetected": ["669..."],
  "stats": { "imagesProcessed": 3, "facesDetected": 37, "facesUnmatched": 2 }
}
```

Caller maps this onto the existing `Attendance` shape:

```
absentUsers = batch.userIds − recognised − (whatever the teacher confirms)
```

`uncertain` drives the review queue. `crop` is a 112x112 aligned face for the
teacher to look at; it is never persisted by this service.

## Deploy to Cloud Run

```bash
gcloud run deploy attendance-recognition \
  --source recognition \
  --region asia-south1 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 3 \
  --timeout 120 \
  --no-allow-unauthenticated
```

`--min-instances 0` is what keeps this inside the always-free tier. Setting it
to 1 removes free-tier eligibility and bills around the clock; the cold start
does not matter because nothing waits on the result.

`--max-instances 3` caps the damage from a retry loop.

Add a budget alert at ₹100/month. Cloud Run has no hard spending cap, only
alerts.

### Calling it from Next.js

`--no-allow-unauthenticated` means the caller needs a Google-signed identity
token. Either grant your service account the `run.invoker` role and mint a
token, or deploy with `--allow-unauthenticated` plus a shared secret header
checked in `main.py`. The shared-secret route is simpler for the POC; the IAM
route is correct for production.

## Run locally

```bash
cd recognition
docker build -t attendance-recognition .
docker run -p 8080:8080 attendance-recognition
curl localhost:8080/health
```

To expose a local container to Vercel without deploying anywhere:

```bash
cloudflared tunnel --url http://localhost:8080
```

No account or card needed, and you get the whole machine's RAM instead of a
free tier's 512 MB.

## Thresholds

In `main.py`:

| Constant | Default | Meaning |
|---|---|---|
| `AUTO_THRESHOLD` | 0.45 | At or above this, mark present automatically |
| `REVIEW_THRESHOLD` | 0.30 | Between the two, send to the teacher's review queue |
| `MIN_FACE_WIDTH` | 50 | Faces narrower than this many pixels are ignored |

OpenCV documents 0.363 cosine as SFace's same-identity boundary. These
defaults sit either side of it, but **they are guesses until you have labelled
data**. Run shadow mode for two weeks, log every score, then set them from the
distribution you actually see.

A wrong name marked present is far worse than a miss: a miss surfaces in the
review queue, a wrong name is silent. Tune `AUTO_THRESHOLD` upward until false
positives are near zero, and accept a larger review queue in exchange.

## If the build fails on the model download

The `test` assertions mean a bad download fails the build instead of failing at
request time. If that happens, the LFS endpoint or the filenames have moved.
Check the current paths at <https://github.com/opencv/opencv_zoo/tree/main/models>
and update the two URLs; the Hugging Face mirror at
<https://huggingface.co/opencv/opencv_zoo> serves the same files.
