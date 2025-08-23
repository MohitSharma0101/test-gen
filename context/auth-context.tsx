"use client";

import { deleteUserToken } from "@/lib/api";
import { TAccount } from "@/models/Account";
import { useRouter } from "next/navigation";
import { createContext, ReactNode, useContext } from "react";

const AuthContext = createContext<{
  account: TAccount | null;
  logout: () => void;
}>({
  account: null,
  logout: () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("Auth Context can only be used inside an AuthProvider");
  }

  return context;
};

type TAuthProviderProps = {
  account: TAccount | null;
  children: ReactNode;
};

export const AuthProvider = ({ account, children }: TAuthProviderProps) => {
  const router = useRouter();

  const logout = () => {
    deleteUserToken();
    router.refresh();
  };

  return (
    <AuthContext.Provider value={{ account, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
