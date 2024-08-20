import React, { useState } from "react";
import { FormLabel } from "./form";
import { Button } from "./button";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { Input } from "./input";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

const PasswordInput = React.forwardRef<HTMLInputElement, Props>(
  ({ label, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    return (
      <>
        <FormLabel className="flex items-center">
          {label || "Password"}
          <Button
            onClick={() => {
              setShowPassword(!showPassword);
            }}
            type="button"
            variant={"ghost"}
            className="mx-2 rounded p-0 h-fit"
          >
            {showPassword ? (
              <EyeOffIcon className="w-5 h-5" strokeWidth={1} />
            ) : (
              <EyeIcon className="w-5 h-5" strokeWidth={1} />
            )}
          </Button>
        </FormLabel>
        <Input
          type={showPassword ? "text" : "password"}
          placeholder="Enter your password"
          ref={ref}
          {...props}
        />
      </>
    );
  }
);
PasswordInput.displayName = 'PasswordInput'

export default PasswordInput;
