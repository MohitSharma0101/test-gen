import React from "react";
import AccountForm from "./account-form";
import { User2Icon } from "lucide-react";

type Props = {};

const AccountPage = (props: Props) => {
  return (
    <div className="w-full h-screen flex items-center justify-center bg-slate-200">
      <div className="bg-white max-w-[500px] w-full rounded shadow p-4">
        <h1 className="text-xl font-medium pb-2 border-b mb-6 flex items-center justify-center gap-2">
          <User2Icon className="w-5 h-5" />
          Update Profile
        </h1>
        <AccountForm />
      </div>
    </div>
  );
};

export default AccountPage;
