import { api, ENDPOINT } from "@/lib/api";
import { TAccount } from "@/models/Account";
import { useCallback, useEffect, useState } from "react";

export const useAccounts = () => {
  const [accounts, setAccounts] = useState<TAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(ENDPOINT.accounts);
      setAccounts(res.data.data?.accounts ?? []);
    } catch (err: any) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  return { accounts, loading, refreshAccounts: fetchAccounts };
};
