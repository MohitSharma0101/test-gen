import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbUtils";
import Batch, { TBatch } from "@/models/Batch";
import User from "@/models/User"; // needed for populate

export const POST = async (request: NextRequest) => {
  try {
    const { name } = (await request.json()) as TBatch;

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

    const result = await Batch.create({ name });

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
    const { _id, name, userIds } = (await request.json()) as TBatch;

    if (!_id) {
      return NextResponse.json(
        { status: "error", error: "Batch id is required." },
        { status: 500 }
      );
    }

    await dbConnect();

    const result = await Batch.updateOne({ _id }, { name, userIds });

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
        select: "name phone dob parentPhone",
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
