export type TApiResponse<T> = {
  status: "success" | "error";
  data: T;
  error: Error | string;
};
