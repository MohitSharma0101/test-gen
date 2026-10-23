// Picking questions for a generated paper. No AI: the constraints the teacher
// gives narrow the pool, then the pick is random within it.
//
// The randomness is seeded so the same seed gives the same paper back, and a
// fresh seed gives a different one from the same chapters. The seed travels
// with the response, so "regenerate" is just a new seed and a paper worth
// keeping can be reproduced.

export type TChapterPool = {
  chapter: string;
  ids: string[];
};

export type TChapterDepth = {
  chapter: string;
  available: number;
  picked: number;
};

// mulberry32: a small seeded PRNG. Nothing here needs crypto-grade randomness,
// only a repeatable shuffle.
const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Fisher-Yates, on a copy
const shuffle = <T>(items: T[], next: () => number): T[] => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

export const randomSeed = () => Math.floor(Math.random() * 0xffffffff);

// Each section draws from its own stream, derived from the paper's one seed, so
// a whole multi-subject paper still comes back from a single stored number -
// and adding a subject does not reshuffle the ones before it.
export const sectionSeed = (seed: number, index: number) =>
  (Math.imul(seed ^ (index + 1), 2654435761) >>> 0);

type SelectInput = {
  pools: TChapterPool[];
  maxQuestions: number;
  seed: number;
  // Ids that must not be picked, e.g. the questions already in set A when
  // generating set B, or the questions of a paper being re-taken
  exclude?: string[];
};

export type SelectResult = {
  ids: string[];
  depth: TChapterDepth[];
  // Fewer questions than asked for: every chapter ran out
  short: boolean;
};

// Each chapter gets an equal share of the paper. A chapter that cannot fill its
// share hands the remainder back, and the chapters that still have questions
// left take it on - so a thin chapter costs the paper nothing, and no chapter is
// drained while another still has questions going spare.
export const selectQuestions = ({
  pools,
  maxQuestions,
  seed,
  exclude = [],
}: SelectInput): SelectResult => {
  const next = rng(seed);
  const blocked = new Set(exclude);

  // Shuffled once per chapter, then drawn from the front. Drawing in rounds
  // keeps the paper spread across chapters even when it ends up short.
  //
  // Sorted by chapter first: the pools arrive in whatever order the aggregation
  // happened to group them, and the chapters draw from one shared random
  // stream, so without a fixed order the same seed would give a different
  // paper each time and "same seed, same paper" would not hold.
  const queues = [...pools]
    .sort((a, b) => (a.chapter < b.chapter ? -1 : a.chapter > b.chapter ? 1 : 0))
    .map((pool) => ({
      chapter: pool.chapter,
      available: pool.ids.filter((id) => !blocked.has(id)),
      taken: [] as string[],
    }));
  queues.forEach((q) => {
    q.available = shuffle(q.available, next);
  });

  const target = Math.max(0, Math.floor(maxQuestions));
  let picked = 0;

  // Round-robin over the chapters that still have something to give. One pass
  // per question keeps the share even without having to compute quotas.
  while (picked < target) {
    const withStock = queues.filter((q) => q.taken.length < q.available.length);
    if (withStock.length === 0) break;
    for (const q of withStock) {
      if (picked >= target) break;
      q.taken.push(q.available[q.taken.length]);
      picked++;
    }
  }

  // Interleave so the paper does not run chapter by chapter in blocks
  const ids: string[] = [];
  const deepest = Math.max(0, ...queues.map((q) => q.taken.length));
  for (let round = 0; round < deepest; round++) {
    for (const q of queues) {
      if (q.taken[round]) ids.push(q.taken[round]);
    }
  }

  return {
    ids,
    depth: queues.map((q) => ({
      chapter: q.chapter,
      available: q.available.length,
      picked: q.taken.length,
    })),
    short: ids.length < target,
  };
};
