import { cn } from "@/lib/utils";
import { PhoneOutgoingIcon } from "lucide-react";
import React from "react";

type CallLinkProps = {
    phoneNumber?: string;
    children?: React.ReactNode;
    className?: string;
};

const CallButton: React.FC<CallLinkProps> = ({ phoneNumber, children, className }) => {
    return (
        <a
            href={`tel:${phoneNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn("text-green-500 size-[26px] flex items-center justify-center", className)}
        >
            {children || <PhoneOutgoingIcon className="w-5 h-5" />}
        </a>
    );
};

export default CallButton;
