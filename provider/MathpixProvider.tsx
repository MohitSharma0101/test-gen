"use client";

import { MathpixLoader } from "mathpix-markdown-it";
import React, { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

const MathpixProvider = ({ children }: Props) => {
  return <MathpixLoader>{children}</MathpixLoader>;
};

export default MathpixProvider;
