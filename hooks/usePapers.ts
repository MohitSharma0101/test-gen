"use client";

import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/auth-context";
import { PaperStatus, Role } from "@/data/const";
import { api, ENDPOINT } from "@/lib/api";
import { fetchPapers } from "@/service/core.service";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";

type TUsePaperProps = {
  author?: string;
  course?: string;
  status?: PaperStatus;
};

const usePapers = ({ author, course, status }: TUsePaperProps = {}) => {
  const searchParams = useSearchParams();
  const { account } = useAuth();
  const page = Number(searchParams.get("page") || 1);
  const cache = ENDPOINT.papers + author + course + page + status;
  const { data, isLoading, isValidating, error, mutate } = useSWR(
    cache,
    async () => {
      if (account?.role != Role.ADMIN && !author) return;
      return await fetchPapers(null, author, course, page, 10, status);
    },
    {
      revalidateIfStale: false,
      revalidateOnFocus: false,
      errorRetryCount: 1,
    }
  );
  const papers = data?.papers || [];
  const loading = isLoading || isValidating;
  const refresh = () => mutate();

  const updatePaper = async (id: string, title: string) => {
    try {
      if (!title) {
        throw new Error("Please add a paper title!");
      }
      await api.put(ENDPOINT.papers, {
        id,
        title,
      });
      toast({
        title: "Successfully updated paper title!",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: (err as any)?.message || "Unable to update paper!",
        variant: "destructive",
      });
      console.log("err", err);
    } finally {
      refresh();
    }
  };

  const deletePaper = async (id: string) => {
    try {
      if (!id) {
        throw new Error("specify paper id!");
      }
      await api.delete(ENDPOINT.papers, {
        params: {
          id: id,
        },
      });
      refresh();
      toast({
        title: "Successfully deleted paper!",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: (err as any)?.message || "Unable to add paper!",
        variant: "destructive",
      });
      console.log("err", err);
    }
  };

  return {
    papers,
    data,
    loading,
    error,
    refresh,
    deletePaper,
    updatePaper,
  };
};

export default usePapers;
