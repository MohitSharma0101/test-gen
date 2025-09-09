import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbUtils";
import Batch from "@/models/Batch";
import User from "@/models/User"; // needed for populate

export const POST = async (request: NextRequest) => {
  try {
    const { name, fee, userIds } = await request.json();

    if (!name) {
      return NextResponse.json(
        {
          status: "error",
          error: "Batch name is required.",
        },
        { status: 500 }
      );
    }

    await dbConnect();

    const result = await Batch.create({ name, fee, userIds });

    return NextResponse.json(
      { status: "success", batches: result },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", error: err.message ?? "Something went wrong" },
      { status: 500 }
    );
  }
};

export const PUT = async (request: NextRequest) => {
  try {
    const { _id, name, fee, userIds } = await request.json();

    if (!_id) {
      return NextResponse.json(
        { status: "error", error: "Batch id is required." },
        { status: 500 }
      );
    }

    await dbConnect();

    const result = await Batch.updateOne({ _id }, { name, fee, userIds });

    return NextResponse.json(
      { status: "success", batches: result },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", error: err.message ?? "Something went wrong" },
      { status: 500 }
    );
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
        select: "name parentPhone",
        options: { sort: { name: 1 } }, // Sort users by name ascending
      });
    }
    const batches = await batchesReq;
    return NextResponse.json({ batches }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", error: err.message ?? "Something went wrong" },
      { status: 500 }
    );
  }
};
