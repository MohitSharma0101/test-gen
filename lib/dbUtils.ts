import mongoose from "mongoose";
const { DB_PASSWORD, DB_USER } = process.env;

const dbURL = `mongodb+srv://${DB_USER}:${DB_PASSWORD}@cluster0.nfwacai.mongodb.net/?retryWrites=true&w=majority`;

// once
export const dbConnect = async () => {
  try {
    await mongoose.connect(dbURL);
    console.log("connected to db");
  } catch (err) {
    console.log(err);
  }
};
