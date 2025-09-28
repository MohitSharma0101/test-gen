import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbUtils";
import Batch, { TBatch } from "@/models/Batch";
import User from "@/models/User"; // needed for populate
import { nextError, nextSuccess } from "@/lib/nextUtils";

export const POST = async (request: NextRequest) => {
  try {
    const { name, fee, userIds = [] } = await request.json();

    if (!name) {
      return nextError("Batch name is required.");
    }

    await dbConnect();

    // Create the new batch
    const newBatch = await Batch.create({ name, fee });

    // If users are provided, add this batch to them
    if (userIds.length > 0) {
      await User.updateMany(
        { _id: { $in: userIds } },
        { $addToSet: { batchIds: newBatch._id } } // avoids duplicates
      );
    }

    return nextSuccess({ status: "success" });
  } catch (err: any) {
    return nextError(err.message);
  }
};

export const PUT = async (request: NextRequest) => {
  try {
    const { _id, name, fee, usersToAdd, usersToRemove } = await request.json();

    if (!_id) {
      return nextError("Batch id is required.");
    }

    await dbConnect();

    // Update batch details (but no longer storing userIds inside Batch)
    await Batch.updateOne({ _id }, { name, fee });

    // Add batch to users
    if (usersToAdd && usersToAdd.length > 0) {
      await User.updateMany(
        { _id: { $in: usersToAdd } },
        { $addToSet: { batchIds: _id } } // prevents duplicates
      );
    }

    // Remove batch from users
    if (usersToRemove && usersToRemove.length > 0) {
      await User.updateMany(
        { _id: { $in: usersToRemove } },
        { $pull: { batchIds: _id } }
      );
    }

    return nextSuccess({ status: "success" });
  } catch (err: any) {
    return nextError(err.message);
  }
};

export const GET = async (request: NextRequest) => {
  try {
    await dbConnect();

    const searchParams = request.nextUrl.searchParams;
    const withCount = searchParams.get("withCount") === "true";

    // Fetch all batches
    const batches = (await Batch.find()
      .sort({ createdAt: -1 })
      .lean()) as unknown as TBatch[];

    if (!withCount) {
      // return batches without student count
      return NextResponse.json({ batches }, { status: 200 });
    }

    // Fetch student counts grouped by batchId
    const counts = await User.aggregate([
      { $unwind: "$batchIds" },
      { $group: { _id: "$batchIds", totalStudents: { $sum: 1 } } },
    ]);

    // Convert counts array → Map for O(1) lookups
    const countMap = new Map<string, number>();
    counts.forEach((c) => countMap.set(c._id.toString(), c.totalStudents));

    // Attach student count to each batch
    const result = batches.map((batch) => ({
      ...batch,
      totalStudents: countMap.get(batch._id.toString()) ?? 0,
    }));

    return NextResponse.json({ batches: result }, { status: 200 });
  } catch (err: any) {
    return nextError(err.message);
  }
};
