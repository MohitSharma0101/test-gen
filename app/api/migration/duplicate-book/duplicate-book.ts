import { Types } from "mongoose";
import Book, { TBook } from "@/models/Book";
import Chapter, { TChapter } from "@/models/Chapter";
import Question from "@/models/Question";

type DuplicateBookOptions = {
  sourceBookId: string;
  destinationCourse: string;
  destinationSubject: string;
};

export async function duplicateBook({
  sourceBookId,
  destinationCourse,
  destinationSubject,
}: DuplicateBookOptions) {
  // 1️⃣ Load source book
  const sourceBook = await Book.findById(sourceBookId).lean<TBook>();
  if (!sourceBook) throw new Error("Source book not found");

  // 2️⃣ Create new duplicated Book (books are few, no need for bulk)
  const newBook = await Book.create({
    title: `${sourceBook.title}*`,
    course: destinationCourse,
    subject: destinationSubject,
  });

  const newBookId = newBook._id as Types.ObjectId;

  // 3️⃣ Load all chapters of source book
  const oldChapters = await Chapter.find({ book: sourceBookId }).lean<
    TChapter[]
  >();

  // To map old chapter → new chapter
  const chapterIdMap = new Map<string, Types.ObjectId>();

  // 4️⃣ Prepare bulk chapter inserts
  const chapterBulkOps = oldChapters.map((ch) => {
    const newId = new Types.ObjectId();
    chapterIdMap.set(ch._id.toString(), newId);

    return {
      insertOne: {
        document: {
          _id: newId,
          title: ch.title,
          order: ch.order,
          course: destinationCourse,
          subject: destinationSubject,
          book: newBookId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    };
  });

  if (chapterBulkOps.length > 0) {
    await Chapter.bulkWrite(chapterBulkOps);
  }

  // 5️⃣ Load all old questions for these chapters
  const oldChapterIds = oldChapters.map((c) => c._id);
  const oldQuestions = await Question.find({
    chapter: { $in: oldChapterIds },
  }).lean();

  // 6️⃣ Prepare bulk question inserts
  const questionBulkOps = oldQuestions.map((q) => ({
    insertOne: {
      document: {
        text: q.text,
        ans: q.ans,
        mark: q.mark,
        tags: q.tags,
        timesUsed: q.timesUsed,
        chapter: chapterIdMap.get(q.chapter.toString()),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  }));

  if (questionBulkOps.length > 0) {
    await Question.bulkWrite(questionBulkOps);
  }

  return {
    newBookId,
    chaptersCreated: chapterBulkOps.length,
    questionsCreated: questionBulkOps.length,
  };
}
