"use client";

import { TRegisterUserSchema } from "@/components/forms/RegisterUserForm";
import { toast } from "@/components/ui/use-toast";
import { api, ENDPOINT } from "@/lib/api";
import type { TUser } from "@/models/User";
import { registerUser } from "@/service/auth.service";
import { fetchUsers } from "@/service/users.service";
import useSWR from "swr";

const useUsers = () => {
  const cache = ENDPOINT.users;
  const {
    data,
    isLoading,
    isValidating,
    error,
    mutate: refresh,
  } = useSWR(cache, fetchUsers, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    errorRetryCount: 1,
  });
  const users = data?.data.data.users;
  const loading = isLoading || isValidating;

  const addUser = async (values: TRegisterUserSchema) => {
    console.log('values: ', values);
    try {
      await registerUser(values);
      toast({
        title: "Successfully created a user!",
        variant: "success",
      });
      refresh();
    } catch (err) {
      toast({
        title: (err as any)?.message || "Unable to create user!",
        variant: "destructive",
      });
    }
  };

  const updateUser = async (user: Partial<TUser>) => {
    try {
      await api.put(ENDPOINT.users, {
        id: user.id || user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      });
      refresh();
      toast({
        title: "Successfully updated user details!",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: (err as any)?.message || "Unable to user!",
        variant: "destructive",
      });
      console.log("err", err);
    } finally {
      refresh();
    }
  };

  const deleteUser = async (id: string) => {
    try {
      if (!id) {
        throw new Error("specify user id!");
      }
      await api.delete(ENDPOINT.users, {
        params: {
          id: id,
        },
      });
      refresh();
      toast({
        title: "Successfully deleted user!",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: (err as any)?.message || "Unable to delete user!",
        variant: "destructive",
      });
      console.log("err", err);
    }
  };

  return {
    users,
    loading,
    error,
    addUser,
    refresh,
    deleteUser,
    updateUser,
  };
};

export default useUsers;
