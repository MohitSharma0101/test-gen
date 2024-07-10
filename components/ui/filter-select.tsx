import React from "react";
import SelectCompact, { TSelectCompactProps } from "./select-compact";
import { usePathname, useRouter } from "next/navigation";
import { addQueryToUrl } from "@/lib/utils";

type Props = TSelectCompactProps & {
  filterKey: string;
};

const FilterSelect = ({ onChange, filterKey, ...props }: Props) => {
  const router = useRouter();
  const pathName = usePathname();
  return (
    <SelectCompact
      {...props}
      onChange={(value) => {
        router.push(addQueryToUrl(pathName, filterKey, value));
        onChange?.(value);
      }}
    />
  );
};

export default FilterSelect;
