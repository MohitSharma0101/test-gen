import { useEffect, useState } from "react";

// True below Tailwind's sm breakpoint, for layout that cannot be expressed as a
// class - a prop like the resizable group's direction.
//
// Width, not (pointer: coarse): a touch laptop is wide enough for a side-by-side
// split, and a narrow desktop window is not. Use useIsTouchDevice when the
// question is actually "is this a finger".
const QUERY = "(max-width: 639px)";

export const useIsNarrowViewport = () => {
  // False on the server and the first paint, so the wide layout is the default
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(QUERY);
    const update = () => setIsNarrow(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return isNarrow;
};
