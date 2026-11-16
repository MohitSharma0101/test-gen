import type { TJobHandler } from "./types";
import { remarkAllJob } from "./handlers/remark-all";

// Every job type the app can run. Add new handlers here.
const HANDLERS: TJobHandler<any>[] = [remarkAllJob];

export const getJobHandler = (type: string) => HANDLERS.find((h) => h.type === type);
