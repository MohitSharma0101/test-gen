import { cn } from "@/lib/utils";
import { PhoneIcon } from "lucide-react";
import React from "react";

type CallLinkProps = {
  phoneNumber?: string;
  children?: React.ReactNode;
  className?: string;
};

const CallButton: React.FC<CallLinkProps> = ({
  phoneNumber,
  children,
  className,
}) => {
  return (
    <a
      href={`tel:${phoneNumber}`}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children || (
        <div className="flex items-center justify-center bg-blue-500 text-white rounded-full p-[5px] size-[24px]">
          <PhoneIcon className="w-full h-full" fill="white" strokeWidth={0} />
        </div>
      )}
    </a>
  );
};

export default CallButton;
