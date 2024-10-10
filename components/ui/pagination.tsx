import React, { Suspense } from "react";
import { Button } from "./button";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";
import SelectCompact from "./select-compact";

type Props = {
  totalPages?: Number;
};

const Pagination = ({ totalPages }: Props) => {
  const searchParams = useSearchParams();
  const page = Number(searchParams.get("page") || 1);
  const limit = Number(searchParams.get("limit") || 50);
  const router = useRouter();

  const onNext = () => {
    router.push("?page=" + (page + 1) + "&limit=" + limit);
  };

  const onPrev = () => {
    router.push("?page=" + (page - 1) + "&limit=" + limit);
  };

  const onLimitChange = (newLimit: string) => {
    router.push("?page=" + page + "&limit=" + newLimit);
  };

  return (
    <div className="flex gap-2 md:gap-4 items-center justify-center">
      <Button
        disabled={page === 1}
        variant={"outline"}
        size={"sm"}
        onClick={onPrev}
      >
        <ChevronLeftIcon className="w-4 h-4" />
      </Button>
      {page}/{totalPages?.toString()}
      <Button
        disabled={page === totalPages}
        variant={"outline"}
        size={"sm"}
        onClick={onNext}
      >
        <ChevronRightIcon className="w-4 h-4" />
      </Button>
      <SelectCompact
        className="w-fit"
        value={limit.toString()}
        placeholder=""
        options={[10, 30, 50, 100, 150, 200, 500, 1000].map((item) => ({
          label: item + " item",
          value: item.toString(),
        }))}
        onChange={onLimitChange}
        triggerClassName="h-9"
      />
      {/* <Popover>
        <PopoverTrigger>
          <CircleEllipsisIcon className="w-4 h-4" />
        </PopoverTrigger>
        <PopoverContent className="w-fit m-2 md:px-4 p-2">
          <div className="flex items-center justify-center gap-2">
            <label>per page</label>
            <SelectCompact
              className="w-fit"
              value={limit.toString()}
              placeholder=""
              options={[10, 30, 50, 100, 150, 200].map((item) => ({
                label: item + " item",
                value: item.toString(),
              }))}
              onChange={onLimitChange}
            />
          </div>
        </PopoverContent>
      </Popover> */}
    </div>
  );
};

const SPagination = (props: Props) => {
  return (
    <Suspense>
      <Pagination {...props} />
    </Suspense>
  );
};

export default SPagination;
