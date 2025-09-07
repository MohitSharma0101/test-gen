"use client";

import { TUser } from "@/models/User";
import { api, ENDPOINT } from "@/lib/api";
import { useCallback, useEffect, useState } from "react";
import { toast } from "@/components/ui/use-toast";

type Props = {
  batchId?: string;
};

const useUsers = ({ batchId }: Props = {}) => {
  const [users, setUsers] = useState<TUser[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(ENDPOINT.users, {
        params: {
          batchId,
        },
      });
      setUsers(res.data.users);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Something went wrong!",
        description: err.message,
      });
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return { users, loading, refreshUsers: fetchUsers };
};

export default useUsers;
