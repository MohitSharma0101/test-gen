import { NextRequest } from "next/server";
import { dbConnect } from "@/lib/dbUtils";
import Batch, { TBatch } from "@/models/Batch";
import User from "@/models/User"; // needed for populate
import { nextError, nextSuccess } from "@/lib/nextUtils";

export const POST = async (request: NextRequest) => {
  try {
    const { name } = (await request.json()) as TBatch;

    if (!name) {
      return nextError("Batch name is required.", 400);
    }

    await dbConnect();
    const result = await Batch.create({ name });

    return nextSuccess({ batches: result }, 200);
  } catch (err: any) {
    return nextError(err.message);
  }
};

export const PUT = async (request: NextRequest) => {
  try {
    const { _id, name, userIds } = (await request.json()) as TBatch;

    if (!_id) {
      return nextError("Batch id is required.", 400);
    }

    await dbConnect();
    const result = await Batch.updateOne({ _id }, { name, userIds });

    return nextSuccess({ batches: result }, 200);
  } catch (err: any) {
    return nextError(err.message);
  }
};

export const GET = async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const shouldPopulateUsers = searchParams.get("populateUsers");

    await dbConnect();
    const batchesReq = Batch.find().sort({ createdAt: -1 });

    if (shouldPopulateUsers) {
      batchesReq.populate({
        path: "userIds",
        model: User,
        select: "name phone dob parentPhone",
        options: { sort: { name: 1 } }, // Sort users by name ascending
      });
    }

    const batches = await batchesReq;
    return nextSuccess({ batches }, 200);
  } catch (err: any) {
    return nextError(err.message);
  }
};
