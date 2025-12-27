"use client";

import { useAuth } from "@/context/auth-context";
import { Role } from "@/data/const";
import { AUTHORS } from "@/models/Author";
import { useAuthorStore } from "@/stores/authorStore";
import { useEffect } from "react";

type Props = {
  defaultAuthor?: string;
};

export const useAuthors = ({ defaultAuthor }: Props = {}) => {
  const { account } = useAuth();
  const { author, updateAuthor } = useAuthorStore();

  const isAdmin = account?.role === Role.ADMIN;
  const currentAuthor = AUTHORS.find((a) => a === account?.name);

  useEffect(() => {
    if (isAdmin && defaultAuthor) {
      updateAuthor(defaultAuthor);
    }
    if (!isAdmin && currentAuthor) {
      updateAuthor(currentAuthor);
    }
  }, [currentAuthor, isAdmin, defaultAuthor]);

  const authors = isAdmin ? AUTHORS : currentAuthor ? [currentAuthor] : AUTHORS;

  return { authors, author, updateAuthor };
};
