// Figures in question markdown are the largest thing the app downloads.
// uploadImage only re-encodes files over 5 MB, so a 2-4 MB phone photo is
// stored and served at full resolution - one of those is ~60 s on a 0.4 Mbps
// link, which dwarfs every other request the app makes.
//
// Nothing has to be re-uploaded: Cloudinary resizes and re-encodes from the URL,
// so rewriting the delivery URL fixes images that are already stored.

// Wide enough for an A4 column at 2x, small enough to be a few tens of KB
const DELIVERY_WIDTH = 1000;

// f_auto picks webp/avif when the browser accepts it, q_auto picks the quality,
// c_limit never enlarges a smaller original.
const TRANSFORM = `f_auto,q_auto,c_limit,w_${DELIVERY_WIDTH}`;

// Only a src attribute is rewritten, never the whole document: a question whose
// text happens to show a Cloudinary URL should still read the way it was typed.
// src="<cloud>/image/upload/<maybe transforms>/<version>/<public id>"
const CLOUDINARY_SRC =
  /(\ssrc=["'])(https?:\/\/res\.cloudinary\.com\/[^/"'\s]+\/image\/upload\/)([^"']*)(["'])/g;

// Cloudinary's transform parameters are a known set. Matching any "xx_" prefix
// instead would treat a folder called "my_folder" as a transform and skip the
// image, so every comma separated part has to be a real parameter.
const PARAMS = new Set([
  "a", "ac", "af", "ar", "b", "bo", "br", "c", "co", "cs", "d", "dl", "dn",
  "dpr", "du", "e", "eo", "f", "fl", "fn", "g", "h", "if", "ki", "l", "o", "p",
  "pg", "q", "r", "so", "t", "u", "vc", "vs", "w", "x", "y", "z",
]);

// An already transformed URL is left alone: a second transform segment stacks on
// the first and could re-compress what we already sized.
const hasTransform = (path: string) => {
  const firstSegment = path.split("/")[0];
  if (!firstSegment || !firstSegment.includes("_")) return false;
  return firstSegment
    .split(",")
    .every((part) => PARAMS.has(part.slice(0, part.indexOf("_"))));
};

export const optimizeCloudinaryUrls = (html: string) =>
  html.replace(
    CLOUDINARY_SRC,
    (_m, attr: string, prefix: string, path: string, quote: string) =>
      hasTransform(path)
        ? `${attr}${prefix}${path}${quote}`
        : `${attr}${prefix}${TRANSFORM}/${path}${quote}`
  );

// The markdown renderer emits a bare <img src alt>, so figures below the fold
// are fetched immediately and have no intrinsic size to lay out against.
export const deferImages = (html: string) =>
  html.replace(/<img\s/g, '<img loading="lazy" decoding="async" ');

export const optimizeImages = (html: string) =>
  deferImages(optimizeCloudinaryUrls(html));
