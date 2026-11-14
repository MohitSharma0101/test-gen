"use client";

import useSWR from "swr";
import { TUser } from "@/models/User";
import { api, ENDPOINT } from "@/lib/api";
import { LIST_SWR, swrLoading } from "@/lib/swr";
import { toast } from "@/components/ui/use-toast";

type Props = {
  batchId?: string;
  shouldLoad?: boolean;
};

// Every component asking for the same batch shares one request and cache
const useUsers = ({ batchId, shouldLoad = true }: Props = {}) => {
  const swr = useSWR(
    shouldLoad ? ["users", batchId ?? "all"] : null,
    async () => ((await api.get(ENDPOINT.users, { params: { batchId } }))?.data?.users ?? []) as TUser[],
    {
      ...LIST_SWR,
      onError: (err) => toast({ variant: "destructive", title: "Something went wrong!", description: (err as Error)?.message }),
    }
  );
  return { users: swr.data ?? [], loading: swrLoading(swr), refreshUsers: () => swr.mutate() };
};

export default useUsers;
