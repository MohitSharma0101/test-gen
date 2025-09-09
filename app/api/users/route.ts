import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbUtils";
import User, { TUser } from "@/models/User";
import { parse } from "csv-parse/sync";
import Counter from "@/models/Counter";
import { nextError, nextSuccess } from "@/lib/nextUtils";

export const POST = async (request: NextRequest) => {
  try {
    let file: File | null = null;
    let batchIds: string[] = [];
    let users: Partial<TUser>[] = [];

    // detect request type
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      // ✅ CSV flow
      const formData = await request.formData();
      file = formData.get("file") as File;
      batchIds = JSON.parse((formData.get("batchIds") as string) || "[]");

      if (!file) {
        return nextError("CSV file is required.");
      }

      const csvText = await file.text();
      const records = parse(csvText, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      users = records.map((row: any) => ({
        name: row.name,
        phone: row.phone,
        fatherName: row.father_name,
        motherName: row.mother_name,
        parentPhone: row.parent_phone,
        school: row.school,
        email: row.email,
        dob: row.dob,
      }));
    } else if (contentType.includes("application/json")) {
      // ✅ Single user flow
      const body = await request.json();
      const user = body?.user ?? null;
      batchIds = body?.batchIds ?? [];

      if (!user) {
        return nextError("User object is required.");
      }

      users = [user];
    } else {
      return nextError("Unsupported content type.");
    }

    // Common validations
    if (!Array.isArray(batchIds) || batchIds.length === 0) {
      return nextError("At least one batch ID is required.");
    }

    if (users.length === 0) {
      return nextError("No valid users provided.");
    }

    await dbConnect();

    // Shared logic
    const counter = await Counter.findByIdAndUpdate(
      { _id: "userId" },
      { $inc: { seq: users.length } },
      { new: true, upsert: true }
    );

    const start = counter.seq - users.length + 1;

    const usersWithIds = users.map((u, i) => ({
      ...u,
      userId: `U${(start + i).toString().padStart(3, "0")}`,
      batchIds: batchIds,
    }));

    const createdUsers = await User.insertMany(usersWithIds);
    const userIds = createdUsers.map((u) => u._id);

    return nextSuccess({
      status: "success",
      insertedUsers: createdUsers.length,
      assignedToBatches: batchIds.length,
      userIds,
    });
  } catch (err: any) {
    return nextError(err.message);
  }
};

export const GET = async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const batchId = searchParams.get("batchId");

  try {
    await dbConnect();

    const filter: Record<string, any> = {};
    if (batchId) {
      filter.batchIds = batchId;
    }

    const users = await User.find(filter)
      .sort({ name: 1 })
      .populate("batchIds", "name fees _id");

    return NextResponse.json({ users }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", error: err.message ?? "Something went wrong" },
      { status: 500 }
    );
  }
};

export const PUT = async (request: NextRequest) => {
  try {
    const { _id, ...user } = (await request.json()) as TUser;

    if (!_id) {
      return NextResponse.json(
        { status: "error", error: "user id is required." },
        { status: 500 }
      );
    }

    await dbConnect();

    const result = await User.updateOne({ _id }, { ...user });

    return NextResponse.json(
      { status: "success", user: result },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", error: err.message ?? "Something went wrong" },
      { status: 500 }
    );
  }
};
