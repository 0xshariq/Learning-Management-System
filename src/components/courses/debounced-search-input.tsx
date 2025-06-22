"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Button } from "../ui/button";

export function DebouncedSearchInput({
  defaultValue,
  sortBy,
  sortOrder,
}: {
  defaultValue: string;
  sortBy: string;
  sortOrder: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const timeout = useRef<NodeJS.Timeout | null>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (timeout.current) clearTimeout(timeout.current);
      timeout.current = setTimeout(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
          params.set("search", value);
        } else {
          params.delete("search");
        }
        params.set("sort", sortBy);
        params.set("order", sortOrder);
        router.replace(`/courses?${params.toString()}`);
      }, 400);
    },
    [router, searchParams, sortBy, sortOrder]
  );

  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
      }}
    >
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          name="search"
          placeholder="Search courses..."
          defaultValue={defaultValue}
          className="pl-9 h-10 w-full md:w-[250px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          onChange={handleChange}
        />
      </div>
      <Button type="submit" size="sm">
        Search
      </Button>
    </form>
  );
}
