"use client";

import { TUser } from "@/models/User";
import { api, ENDPOINT } from "@/lib/api";
import { useCallback, useEffect, useState } from "react";

const useUsers = () => {
  const [users, setUsers] = useState<TUser[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const res = await api.get(ENDPOINT.users);
    setUsers(res.data.users);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return { users, loading, refreshUsers: fetchUsers };
};

export default useUsers;
