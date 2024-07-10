"use client";

import Markdown from "@/components/ui/markdown";
import dynamic from "next/dynamic";
import React, { ReactNode } from "react";

const MathpixLoader = dynamic(
  () => import("mathpix-markdown-it").then((comp) => comp.MathpixLoader),
  { ssr: false }
);

type Props = {
  children?: ReactNode;
};

const MathpixProvider = ({ children }: Props) => {
  return (
    <div className="hidden">
      <MathpixLoader>
        {children}
        {/* Added for optimizing -> downloading dynamic js for markdown before time */}
        <Markdown text="" /> 
      </MathpixLoader>
    </div>
  );
};

export default MathpixProvider;
