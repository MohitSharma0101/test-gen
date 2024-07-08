import React, { useState } from "react";
import { Button } from "./button";
import { ShuffleIcon } from "lucide-react";

type Props = {
  onSubmit?: (random: number) => void;
};

const RandomInput = ({ onSubmit }: Props) => {
  const [value, setValue] = useState(5);
  return (
    <span className="flex items-center justify-center ">
      <input
        value={value}
        type="number"
        min={0}
        onChange={(e) => setValue(Number(e.target.value))}
        className="px-2 w-[40px] h-8 rounded-l focus-visible:outline-none border-0 no-spinner"
      />
      <Button
        size={"icon"}
        className="rounded-l-none h-8"
        onClick={() => onSubmit?.(value)}
      >
        <ShuffleIcon className="w-4 h-4" />
      </Button>
    </span>
  );
};

export default RandomInput;
