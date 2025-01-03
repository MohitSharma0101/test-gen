"use client";

import { toast } from "@/components/ui/use-toast";
import { api, ENDPOINT } from "@/lib/api";
import { fetchChapters } from "@/service/core.service";
import useSWR from "swr";

const useChapters = (subject?: string, course?: string, book?: string) => {
  const cache =
    !course || !subject || !book
      ? null
      : ENDPOINT.chapters + subject + course + book;
  const { data, isLoading, isValidating, error, mutate } = useSWR(
    cache,
    async () => {
      if(!book) return null;
      return await fetchChapters(book);
    },
    {
      revalidateIfStale: false,
      revalidateOnFocus: false,
      errorRetryCount: 1,
    }
  );
  const chapters = data;
  const loading = isLoading || isValidating;
  const refresh = () => mutate();

  const addChapter = async (title: string, book: string) => {
    try {
      if (!course || !subject) {
        throw new Error("Please select a course and subject to add a chapter!");
      }
      if (!title) {
        throw new Error("Please add a chapter title!");
      }
      await api.post(ENDPOINT.chapters, {
        subject,
        course,
        title: title,
        book: book,
      });
      refresh();
      toast({
        title: "Successfully added chapter!",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: (err as any)?.message || "Unable to add chapter!",
        variant: "destructive",
      });
      console.log("err", err);
    }
  };

  const updateChapter = async (id: string, title: string, order?: number) => {
    try {
      if (!title) {
        throw new Error("Please add a chapter title!");
      }
      await api.put(ENDPOINT.chapters, {
        id,
        title,
        order,
      });
      refresh();
      toast({
        title: "Successfully updated chapter!",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: (err as any)?.message || "Unable to update chapter!",
        variant: "destructive",
      });
      console.log("err", err);
    } finally {
      refresh();
    }
  };

  const deleteChapter = async (id: string) => {
    try {
      if (!id) {
        throw new Error("specify chapter id!");
      }
      await api.delete(ENDPOINT.chapters, {
        params: {
          chapterId: id,
        },
      });
      refresh();
      toast({
        title: "Successfully deleted chapter!",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: (err as any)?.message || "Unable to add chapter!",
        variant: "destructive",
      });
      console.log("err", err);
    }
  };

  return {
    chapters,
    loading,
    error,
    refresh,
    addChapter,
    deleteChapter,
    updateChapter,
  };
};

export default useChapters;
