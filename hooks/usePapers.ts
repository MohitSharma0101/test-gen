"use client";

import { toast } from "@/components/ui/use-toast";
import { api, ENDPOINT } from "@/lib/api";
import type { TPaper } from "@/models/Paper";
import { fetchPapers } from "@/service/core.service";
import useSWR from "swr";

type TUsePaperProps = {
  author?: string;
  course?: string;
};

const usePapers = ({ author, course }: TUsePaperProps = {}) => {
  const cache = ENDPOINT.papers + author + course;
  const { data, isLoading, isValidating, error, mutate } = useSWR(
    cache,
    async () => {
      return await fetchPapers(null, author, course);
    },
    {
      revalidateIfStale: false,
      revalidateOnFocus: false,
      errorRetryCount: 1,
    }
  );
  const papers = (data || []) as TPaper[];
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
    loading,
    error,
    refresh,
    deletePaper,
    updatePaper,
  };
};

export default usePapers;
