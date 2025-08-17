import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbUtils";
import User from "@/models/User";
import Batch from "@/models/Batch"; // Assuming you have this model
import { parse } from "csv-parse/sync";
import Counter from "@/models/Counter";

export const POST = async (request: NextRequest) => {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const batchIds = JSON.parse((formData.get("batchIds") as string) || "[]");

    if (!file) {
      return NextResponse.json(
        { status: "error", error: "CSV file is required." },
        { status: 400 }
      );
    }
    if (!Array.isArray(batchIds) || batchIds.length === 0) {
      return NextResponse.json(
        { status: "error", error: "At least one batch ID is required." },
        { status: 400 }
      );
    }

    const csvText = await file.text();

    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const users = records.map((row: any) => ({
      name: row.name,
      phone: row.phone,
      fatherName: row.father_name,
      motherName: row.mother_name,
      parentPhone: row.parent_phone,
      school: row.school,
      email: row.email,
      dob: row.dob,
    }));

    if (users.length === 0) {
      return NextResponse.json(
        { status: "error", error: "No valid users found in CSV." },
        { status: 400 }
      );
    }

    await dbConnect();

    const counter = await Counter.findByIdAndUpdate(
      { _id: "userId" },
      { $inc: { seq: users.length } }, // increment by count
      { new: true, upsert: true }
    );

    let start = counter.seq - users.length + 1;

    const usersWithIds = users.map((user, i) => ({
      ...user,
      userId: `U${(start + i).toString().padStart(3, "0")}`,
    }));

    const createdUsers = await User.insertMany(usersWithIds);

    const userIds = createdUsers.map((u) => u._id);

    await Batch.updateMany(
      { _id: { $in: batchIds } },
      { $addToSet: { userIds: { $each: userIds } } } // avoid duplicates
    );

    return NextResponse.json(
      {
        status: "success",
        insertedUsers: createdUsers.length,
        assignedToBatches: batchIds.length,
        userIds,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", error: err.message ?? "Something went wrong" },
      { status: 500 }
    );
  }
};

export const GET = async () => {
  try {
    await dbConnect();
    const users = await User.find().sort({ userId: -1 });
    return NextResponse.json({ users }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", error: err.message ?? "Something went wrong" },
      { status: 500 }
    );
  }
};
