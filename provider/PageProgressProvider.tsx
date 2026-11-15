"use client";

import NextTopLoader from "nextjs-toploader";

const PageProgressProvider = () => {
  return (
    <>
      {/* Brand blue and a little thicker: the old grey 3px bar was easy to miss,
          so a slow navigation looked frozen */}
      <NextTopLoader color="#0053C5" height={3} showSpinner={false} shadow="0 0 8px #0053C5" />
    </>
  );
};

export default PageProgressProvider;
