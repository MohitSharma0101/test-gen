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

// One subject's share of the paper: its chapters, how many questions it
// contributes, and filters of its own when they differ from the rest.
export type TGenerateSection = {
  subject?: string;
  chapterIds: string[];
  maxQuestions: number;
  marks?: number;
  tags?: string[];
  unusedOnly?: boolean;
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

export type TGeneratedSectionResult = {
  subject?: string;
  requested: number;
  picked: number;
  short: boolean;
  depth: TChapterDepth[];
};

const MAX_QUESTIONS = 300;
const MAX_CHAPTERS = 120;
const MAX_SECTIONS = 8;

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

    const matchFor = (section: (typeof usable)[number]) => {
      const query: any = { chapter: { $in: section.objectIds } };
      if (section.marks) query.mark = Number(section.marks);
      if (section.tags?.length) query.tags = { $in: section.tags };
      if (section.unusedOnly) query.timesUsed = 0;
      return query;
    };

    await dbConnect();

    // One aggregation per subject, run together. A $facet would be a single
    // round trip, but its branches cannot use an index - measured, it collection
    // scans all of the questions and takes ~690 ms, where these run on the
    // chapter index as covered scans and come back in ~35 ms for the lot.
    // Only ids are collected: pulling the text of thousands of candidates to
    // then keep ninety of them is the expensive way round.
    const grouped = await Promise.all(
      usable.map((section) =>
        Question.aggregate<any>([
          { $match: matchFor(section) },
          {
            $group: countOnly
              ? { _id: "$chapter", n: { $sum: 1 } }
              : { _id: "$chapter", ids: { $push: "$_id" } },
          },
        ])
      )
    );

    const groupsFor = (index: number): any[] => grouped[index] ?? [];

    if (countOnly) {
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

    usable.forEach((section, index) => {
      const pools: TChapterPool[] = groupsFor(index).map((g) => ({
        chapter: String(g._id),
        ids: (g.ids ?? []).map((id: any) => String(id)),
      }));

      const wanted = Number(section.maxQuestions) || 0;
      const { ids, depth, short } = selectQuestions({
        pools,
        maxQuestions: wanted,
        seed: sectionSeed(usedSeed, index),
        exclude: Array.from(taken),
      });

      ids.forEach((id) => taken.add(id));
      // Subjects stay in their own block rather than interleaving: a paper is
      // read, and sat, one subject at a time.
      orderedIds.push(...ids);
      sectionResults.push({
        subject: section.subject,
        requested: wanted,
        picked: ids.length,
        short,
        depth,
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
