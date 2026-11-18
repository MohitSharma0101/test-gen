import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

export const generateToken = async (account: any) => {
  return await new SignJWT({
    id: account._id.toString(),
    username: account.username,
    role: account.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    // Same lifetime as the session cookie (lib/session.ts SESSION_SECONDS)
    .setExpirationTime("12h")
    .sign(secret);
};

export const verifyToken = async (token: string) => {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (err) {
    return null;
  }
};
