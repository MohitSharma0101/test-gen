import React, { useState } from "react";
import { Input } from "./input";
import { Button } from "./button";
import { SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  placeholder?: string;
  className?: string;
  onSubmit?: (query: string) => void;
};

const SearchForm = ({
  placeholder = "Search...",
  className,
  onSubmit,
}: Props) => {
  const [query, setQuery] = useState("");
  return (
    <div className={cn("flex gap-4 items-center", className)}>
      <Input
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <Button onClick={() => query && onSubmit?.(query)}>
        <SearchIcon className="w-4 h-4 mr-2" />
        Search
      </Button>
    </div>
  );
};

export default SearchForm;
