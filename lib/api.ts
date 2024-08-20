import axios, { AxiosError } from "axios";
import { getCookie, setCookie, deleteCookie } from "cookies-next";

export const ENDPOINT = {
  bulkQuestion: "bulk/question",
  questions: "question",
  chapters: "chapter",
  books: "books",
  papers: "papers",
  questionsUsed: "questions/used",

  //auth
  login: "auth/login",
  register: "auth/register",
  user: "auth/user",
  resetPassword: "auth/user/reset-password",
};

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH;

export const api = axios.create({
  baseURL: BASE_PATH,
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Modify the error message
    const customErrorMessage =
      (error.response?.data as any)?.error ?? "Something went wrong!";
    return Promise.reject(new Error(customErrorMessage));
  }
);

export const AUTH_TOKEN_KEY = "jwt_token";

export const getUserToken = () => getCookie(AUTH_TOKEN_KEY);
export const setUserToken = (value: string) =>
  setCookie(AUTH_TOKEN_KEY, value, {
    maxAge: 3600,
  });
export const deleteUserToken = () => deleteCookie(AUTH_TOKEN_KEY);
