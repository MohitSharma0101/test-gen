import { WhatsappIcon } from "@/icons/whatsapp";
import { cn } from "@/lib/utils";
import React from "react";

type WAButtonProps = {
    phone?: string;
    message?: string;
    className?: string;
    children?: React.ReactNode;
};

const WAButton: React.FC<WAButtonProps> = ({
    phone,
    message = "",
    className = "",
    children,
}) => {
    const encodedMsg = encodeURIComponent(message);
    const url = `https://wa.me/91${phone}${encodedMsg ? `?text=${encodedMsg}` : ""}`;

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            data-action="share/whatsapp/share"
            className={cn("size-[26px] flex items-center justify-center", className)}
        >
            {children || <WhatsappIcon />}
        </a>
    );
};

export default WAButton;
