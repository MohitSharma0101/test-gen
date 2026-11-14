import { WhatsappIcon } from "@/icons/whatsapp";
import { cn, getWhatsappURL } from "@/lib/utils";
import React from "react";

type WAButtonProps = {
  phone?: string;
  message?: string;
  className?: string;
  children?: React.ReactNode;
  // Accessible name for the icon-only link
  label?: string;
};

const WAButton: React.FC<WAButtonProps> = ({
  phone,
  message = "",
  className = "",
  children,
  label = "WhatsApp",
}) => {
  return (
    <a
      href={getWhatsappURL(phone, message)}
      target="_blank"
      rel="noopener noreferrer"
      data-action="share/whatsapp/share"
      aria-label={children ? undefined : label}
      className={cn("size-[26px] flex items-center justify-center", className)}
    >
      {children || <WhatsappIcon />}
    </a>
  );
};

export default WAButton;
