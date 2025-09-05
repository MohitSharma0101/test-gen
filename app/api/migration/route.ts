import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbUtils";
import Batch from "@/models/Batch";
import User from "@/models/User";

export const GET = async () => {
  try {
    await dbConnect();

    // Fetch all batches with their userIds
    const batches = await Batch.find({}, "_id userIds");

    // Update users with batchIds
    for (const batch of batches) {
      if (!batch.userIds?.length) continue;

      await User.updateMany(
        { _id: { $in: batch.userIds } },
        { $addToSet: { batchIds: batch._id } } // avoids duplicates
      );
    }

    return NextResponse.json(
      { status: "success", message: "BatchIds migrated to Users ✅" },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", error: err.message ?? "Something went wrong" },
      { status: 500 }
    );
  }
};
