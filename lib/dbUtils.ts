import mongoose from "mongoose";
const { DB_PASSWORD, DB_USER } = process.env;

const dbURL = `mongodb+srv://${DB_USER}:${DB_PASSWORD}@cluster0.nfwacai.mongodb.net/?retryWrites=true&w=majority`;

let cachedClient: mongoose.Mongoose | null = null;

// once
export const dbConnect = async () => {
  try {
    if (!cachedClient) {
      cachedClient = await mongoose.connect(dbURL);
    }
    console.log("connected to db");
    return cachedClient;
  } catch (err) {
    console.log(err);
  }
};
