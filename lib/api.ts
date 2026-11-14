import { invalidateAfterWrite } from "./swr";
import { toMessage } from "./errorMessage";
import axios, { AxiosError } from "axios";
import { getCookie, setCookie, deleteCookie } from "cookies-next";

export const ENDPOINT = {
  bulkQuestion: "bulk/question",
  questions: "question",
  chapters: "chapter",
  moveChapters: "chapter/move",
  books: "books",
  papers: "papers",
  questionsUsed: "questions/used",
  users: "users",
  batches: "batches",
  attendance: "attendance",
  examResults: "exam-results",
  feesBatch: "fees/batch",
  fees: "fees",
  schedulePaper: "schedule-paper",
  answerSheets: "/answer-sheets",
  recheck: "/answer-sheets/recheck",
  analyzeQuestions: "/answer-sheets/analyze",
  mergePapers: "/papers/merge",
  generatePaper: "papers/generate",
  uploadSign: "uploads/sign",
  generateVariants: "ai/variants",
  recheckVariant: "ai/variants/recheck",
  faceEnroll: "face/enroll",
  attendanceCapture: "attendance/capture",
  faceCorrection: "face/correction",

  //auth
  login: "auth/login",
  user: "auth/user",
  accounts: "auth/accounts",
};

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH;
export const AUTH_TOKEN_KEY = "jwt_token_admin";

export const api = axios.create({
  baseURL: BASE_PATH,
});

api.interceptors.response.use(
  (response) => {
    // A successful write refreshes every cached list it affects, across the
    // dashboard (lib/swr.ts). Browser only: the cache lives there.
    const method = (response.config?.method ?? "get").toLowerCase();
    if (method !== "get" && typeof window !== "undefined") invalidateAfterWrite(response.config?.url);
    return response;
  },
  (error: AxiosError) => {
    // One readable sentence, whatever shape the server answered with. No
    // response at all means the request never got through.
    const data = error.response?.data as any;
    const customErrorMessage = error.response
      ? toMessage(data?.error ?? data?.message ?? data?.detail ?? data, `Request failed (${error.response.status}). Please try again.`)
      : error.code === "ECONNABORTED"
        ? "The server took too long to answer. Please try again."
        : "Can't reach the server. Check the internet connection and try again.";
    // The HTTP status rides along so a caller can tell "wrong password" (401)
    // from "no network" (no status) without parsing the message.
    return Promise.reject(
      Object.assign(new Error(customErrorMessage), { status: error.response?.status })
    );
  }
);

export const getUserToken = () => getCookie(AUTH_TOKEN_KEY);
export const setUserToken = (value: string) =>
  setCookie(AUTH_TOKEN_KEY, value, {
    maxAge: 3600,
  });
export const deleteUserToken = () => deleteCookie(AUTH_TOKEN_KEY);
