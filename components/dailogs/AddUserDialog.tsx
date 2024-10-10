"use client";

import React, { ComponentProps, ReactNode, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../ui/dialog";
import { DialogTrigger } from "@radix-ui/react-dialog";
import { RegisterUserForm } from "../forms/RegisterUserForm";

type Props = ComponentProps<typeof RegisterUserForm> & {
  children: ReactNode;
};

const AddUserDialog = ({ children, user, onSubmit }: Props) => {
  const [open, setOpen] = useState(false);
  const editMode = user ? true : false;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogTitle>{editMode ? "Update" : "Add"} User</DialogTitle>
        <DialogDescription>
          {!editMode &&
            "This will register a user that will be able to access the dashboard as per the role alloted."}
        </DialogDescription>
        <RegisterUserForm
          user={user}
          onSubmit={(values) => {
            onSubmit(values);
            setOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

export default AddUserDialog;
