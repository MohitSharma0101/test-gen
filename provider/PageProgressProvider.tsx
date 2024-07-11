"use client";

import { AppProgressBar as ProgressBar } from "next-nprogress-bar";

const PageProgressProvider = () => {
  return (
    <>
      <ProgressBar
        height="4px"
        color="#64748b"
        options={{ showSpinner: false }}
        shallowRouting
      />
    </>
  );
};

export default PageProgressProvider;
