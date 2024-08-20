import React from "react";
import { LockIcon, User2Icon } from "lucide-react";
import ResetPasswordForm from "./reset-password-form";

type Props = {};

const AccountPage = (props: Props) => {
  return (
    <div className="w-full h-screen flex items-center justify-center bg-slate-200">
      <div className="bg-white max-w-[500px] w-full rounded shadow p-4">
        <h1 className="text-xl font-medium pb-2 border-b mb-6 flex items-center justify-center gap-2">
          <LockIcon className="w-5 h-5" />
          Reset Password
        </h1>
        <ResetPasswordForm />
      </div>
    </div>
  );
};

export default AccountPage;
