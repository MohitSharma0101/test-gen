"use client";

import { deleteUserToken } from "@/lib/api";
import { TUser } from "@/models/User";
import { useRouter } from "next/navigation";
import { createContext, ReactNode, useContext } from "react";

const AuthContext = createContext<{
  user: TUser | null;
  logout: () => void;
}>({
  user: null,
  logout: () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("Auth Context can only be used inside a Auth Provider");
  }

  return context;
};

type TAuthProviderProps = {
  user: TUser;
  children: ReactNode;
};

export const AuthProvider = ({ user, children }: TAuthProviderProps) => {
  const router = useRouter();

  const logout = () => {
    deleteUserToken();
    router.refresh();
  };

  return (
    <AuthContext.Provider value={{ user: user, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
