import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { getAccount } from "@/lib/auth";
import { dbConnect } from "@/lib/dbUtils";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import Question, { TQuestion } from "@/models/Question";
import "@/models/Chapter";
import {
  randomSeed,
  sectionSeed,
  selectQuestions,
  type TChapterDepth,
  type TChapterPool,
} from "@/lib/paperGen";

// "At least 5 of this subject's questions must be Numerical." A quota, not a
// filter: the rest of the subject's share is drawn from everything.
export type TGenerateRequirement = {
  tag: string;
  count: number;
};

// One subject's share of the paper: its chapters, how many questions it
// contributes, and filters of its own when they differ from the rest.
export type TGenerateSection = {
  subject?: string;
  chapterIds: string[];
  maxQuestions: number;
  marks?: number;
  // A hard filter on the whole section. The generate page no longer sets it -
  // it uses `requirements` - but swapping one question still asks for a
  // replacement carrying the tag the original was there to satisfy.
  tags?: string[];
  unusedOnly?: boolean;
  requirements?: TGenerateRequirement[];
};

export type TGeneratePaperRequest = {
  sections: TGenerateSection[];
  // Repeat an earlier generation exactly
  seed?: number;
  // Questions to keep out, for a second set or a retest
  excludeQuestionIds?: string[];
  // Only report how many questions the filters leave, without picking any
  countOnly?: boolean;
};

export type TGeneratedRequirementResult = {
  tag: string;
  requested: number;
  picked: number;
};

export type TGeneratedSectionResult = {
  subject?: string;
  requested: number;
  picked: number;
  short: boolean;
  depth: TChapterDepth[];
  requirements?: TGeneratedRequirementResult[];
};

const MAX_QUESTIONS = 300;
const MAX_CHAPTERS = 120;
const MAX_SECTIONS = 8;
const MAX_REQUIREMENTS = 6;

export const POST = async (request: NextRequest) => {
  try {
    // The middleware is meant to cover every /api route, but it lets a request
    // with no token through at all, so this route checks for itself.
    const account = await getAccount();
    if (!account) {
      return nextError("Please log in to generate a paper.", 401);
    }

    let body: TGeneratePaperRequest;
    try {
      body = await request.json();
    } catch {
      return nextError("Invalid request", 400);
    }

    const { seed, excludeQuestionIds, countOnly } = body ?? {};
    const sections = Array.isArray(body?.sections) ? body.sections : [];

    if (sections.length === 0) {
      return nextError("Select at least one chapter.", 400);
    }
    if (sections.length > MAX_SECTIONS) {
      return nextError(`A paper can have at most ${MAX_SECTIONS} subjects.`, 400);
    }

    // An aggregation pipeline is handed to the driver as-is: unlike `find`,
    // Mongoose does not cast it against the schema, so a chapter id has to be
    // an ObjectId here or it is compared against the stored ObjectIds as a
    // string and matches nothing.
    const prepared = sections.map((section) => ({
      ...section,
      objectIds: (section.chapterIds ?? [])
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id)),
    }));

    const usable = prepared.filter((section) => section.objectIds.length > 0);
    if (usable.length === 0) {
      return nextError("Select at least one chapter.", 400);
    }

    const totalChapters = usable.reduce((sum, s) => sum + s.objectIds.length, 0);
    if (totalChapters > MAX_CHAPTERS) {
      return nextError(`Select at most ${MAX_CHAPTERS} chapters in total.`, 400);
    }

    const totalWanted = usable.reduce((sum, s) => sum + (Number(s.maxQuestions) || 0), 0);
    if (!countOnly) {
      if (totalWanted < 1) {
        return nextError("Enter how many questions the paper should have.", 400);
      }
      if (totalWanted > MAX_QUESTIONS) {
        return nextError(`A paper can have at most ${MAX_QUESTIONS} questions.`, 400);
      }
    }

    const matchFor = (section: (typeof usable)[number], tag?: string) => {
      const query: any = { chapter: { $in: section.objectIds } };
      if (section.marks) query.mark = Number(section.marks);
      if (tag) query.tags = tag;
      else if (section.tags?.length) query.tags = { $in: section.tags };
      if (section.unusedOnly) query.timesUsed = 0;
      return query;
    };

    // A section's own pool, plus one pool per tag it must include. The tagged
    // pools are drawn from first; whatever the section still owes is taken
    // from the main pool afterwards.
    const requirementsOf = (section: (typeof usable)[number]) =>
      (section.requirements ?? [])
        .filter((r) => r?.tag && Number(r.count) > 0)
        .slice(0, MAX_REQUIREMENTS);

    await dbConnect();

    // One aggregation per subject plus one per tag quota, run together. A
    // $facet would be a single round trip, but its branches cannot use an
    // index - measured, it collection scans all of the questions and takes
    // ~690 ms, where these run on the chapter index and come back in ~35 ms
    // for the lot. Only ids are collected: pulling the text of thousands of
    // candidates to then keep ninety of them is the expensive way round.
    const plan = usable.flatMap((section, index) => [
      { index, tag: undefined as string | undefined, section },
      ...requirementsOf(section).map((r) => ({ index, tag: r.tag, section })),
    ]);

    const results = await Promise.all(
      plan.map((entry) =>
        Question.aggregate<any>([
          { $match: matchFor(entry.section, entry.tag) },
          {
            $group: countOnly
              ? { _id: "$chapter", n: { $sum: 1 } }
              : { _id: "$chapter", ids: { $push: "$_id" } },
          },
        ])
      )
    );

    const lookup = new Map<string, any[]>();
    plan.forEach((entry, i) => lookup.set(`${entry.index}|${entry.tag ?? ""}`, results[i] ?? []));
    const groupsFor = (index: number, tag?: string): any[] =>
      lookup.get(`${index}|${tag ?? ""}`) ?? [];

    if (countOnly) {
      // Every tag's supply in one pass per subject, so the quota picker can
      // show how many Numerical questions there are before one is asked for.
      // Unwinding is cheaper here than a query per tag, and this runs only
      // for counts, never when a paper is actually generated.
      const tagSupply = await Promise.all(
        usable.map((section) =>
          Question.aggregate<{ _id: string; n: number }>([
            { $match: matchFor(section) },
            { $unwind: "$tags" },
            { $match: { tags: { $nin: ["", null] } } },
            { $group: { _id: "$tags", n: { $sum: 1 } } },
          ])
        )
      );

      const perSection = usable.map((section, index) => {
        const groups = groupsFor(index);
        return {
          subject: section.subject,
          available: groups.reduce((sum, g) => sum + g.n, 0),
          requested: Number(section.maxQuestions) || 0,
          perChapter: groups.map((g) => ({
            chapter: String(g._id),
            available: g.n,
          })),
          // Counted per tag as well: hardly any question in the bank carries
          // one, so "5 Numerical" is unsatisfiable in most chapters and the
          // page has to be able to say so before the paper is generated.
          requirements: requirementsOf(section).map((r) => ({
            tag: r.tag,
            requested: Number(r.count) || 0,
            available: groupsFor(index, r.tag).reduce((sum, g) => sum + g.n, 0),
          })),
          tagCounts: (tagSupply[index] ?? []).map((t) => ({
            tag: String(t._id),
            available: t.n,
          })),
        };
      });

      return nextSuccess({
        available: perSection.reduce((sum, s) => sum + s.available, 0),
        sections: perSection,
        // Flattened for the chapter tree, which does not care which section a
        // chapter belongs to
        perChapter: perSection.flatMap((s) => s.perChapter),
      });
    }

    const usedSeed =
      Number.isFinite(Number(seed)) && seed ? Number(seed) : randomSeed();

    // Already on the paper, plus anything the caller ruled out. Carried across
    // sections so a chapter sitting in two subjects cannot repeat a question.
    const taken = new Set((excludeQuestionIds ?? []).map(String));
    const orderedIds: string[] = [];
    const sectionResults: TGeneratedSectionResult[] = [];

    const poolsOf = (index: number, tag?: string): TChapterPool[] =>
      groupsFor(index, tag).map((g) => ({
        chapter: String(g._id),
        ids: (g.ids ?? []).map((id: any) => String(id)),
      }));

    usable.forEach((section, index) => {
      const wanted = Number(section.maxQuestions) || 0;
      const requirements = requirementsOf(section);
      const sectionIds: string[] = [];
      const requirementResults: TGeneratedRequirementResult[] = [];

      // The tags this subject must include come first, each from its own pool.
      // A quota that cannot be met takes what there is; the shortfall is not
      // lost, because what the subject still owes is only worked out once
      // these have run.
      requirements.forEach((requirement, order) => {
        const room = Math.max(0, wanted - sectionIds.length);
        const want = Math.min(Number(requirement.count) || 0, room);
        if (want === 0) {
          requirementResults.push({ tag: requirement.tag, requested: 0, picked: 0 });
          return;
        }
        const { ids } = selectQuestions({
          pools: poolsOf(index, requirement.tag),
          maxQuestions: want,
          // Its own stream, so a quota is reproducible and adding one does
          // not reshuffle the quotas before it
          seed: sectionSeed(usedSeed, index * 16 + order + 1),
          exclude: Array.from(taken),
        });
        ids.forEach((id) => taken.add(id));
        sectionIds.push(...ids);
        requirementResults.push({
          tag: requirement.tag,
          requested: Number(requirement.count) || 0,
          picked: ids.length,
        });
      });

      // Then the rest of the subject's share, from everything it may use
      const remaining = Math.max(0, wanted - sectionIds.length);
      const { ids, depth } = selectQuestions({
        pools: poolsOf(index),
        maxQuestions: remaining,
        seed: sectionSeed(usedSeed, index),
        exclude: Array.from(taken),
      });
      ids.forEach((id) => taken.add(id));
      sectionIds.push(...ids);

      // Subjects stay in their own block rather than interleaving: a paper is
      // read, and sat, one subject at a time.
      orderedIds.push(...sectionIds);
      sectionResults.push({
        subject: section.subject,
        requested: wanted,
        picked: sectionIds.length,
        short: sectionIds.length < wanted,
        depth,
        ...(requirementResults.length ? { requirements: requirementResults } : {}),
      });
    });

    if (orderedIds.length === 0) {
      return nextError(
        "No question matches these filters. Widen them or add chapters.",
        404
      );
    }

    const questions = await Question.find({ _id: { $in: orderedIds } })
      .populate("chapter", { subject: 1, course: 1, title: 1 })
      .lean<TQuestion[]>();

    // `find` returns them in whatever order the index gives, so the order the
    // selection decided is reapplied here
    const byId = new Map(questions.map((q) => [String(q._id), q]));
    const ordered = orderedIds.map((id) => byId.get(id)).filter(Boolean) as TQuestion[];

    return nextSuccess({
      questions: ordered,
      seed: usedSeed,
      requested: totalWanted,
      short: sectionResults.some((s) => s.short),
      sections: sectionResults,
      // What each chapter had to offer under these filters, so the page can say
      // why a paper came back smaller than it was asked for
      depth: sectionResults.flatMap((s) => s.depth),
    });
  } catch (err: any) {
    return nextError(err?.message ?? "Could not generate the paper.");
  }
};
