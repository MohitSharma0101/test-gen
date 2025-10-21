'use client';

import { AUTHORS } from "@/models/Author"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import SelectCompact from "../ui/select-compact"
import { Sheet, SheetContent } from "../ui/sheet"
import { PaperStatus, PaperStatusOptions } from "@/data/const"
import { useState } from "react"
import { useAuthorStore } from "@/stores/authorStore";
import { api, ENDPOINT } from "@/lib/api";

type Props = {
    paperIds: string[];
    open: boolean;
    onOpenChange?: (open: boolean) => void;
    onClear?: () => void;
    onRefresh?: () => void;
}

export const MergePaperSheet = ({ paperIds, open, onOpenChange, onClear, onRefresh }: Props) => {
    const authorStore = useAuthorStore();
    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState(authorStore.author);
    const [status, setStatus] = useState(PaperStatus.PUBLIC);
    const [error, setError] = useState("");

    const disabled = !title || !author;

    const onSubmit = async () => {
        try {
            await api.put(ENDPOINT.mergePapers, {
                paperIds,
                title,
                author,
                status
            });
            onClear?.();
            onRefresh?.();
        } catch (er) {
            console.warn(er);
            setError(JSON.stringify(er))
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="p-0">
                <div className="text-base font-medium px-2 py-3 bg-gray-200">
                    Merge Papers
                </div>
                <div className="p-2 overflow-auto flex flex-col gap-2">
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-medium">Paper Title</label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter title of your paper..."
                        />
                        <SelectCompact
                            label="Author"
                            options={AUTHORS.map((a) => ({ label: a, value: a }))}
                            placeholder="Select Author"
                            value={author}
                            onChange={setAuthor}
                        />
                        <SelectCompact
                            label="Status"
                            options={PaperStatusOptions}
                            placeholder="Select Status"
                            value={status}
                            onChange={(v) => setStatus(v as PaperStatus)}
                        />
                        {error && (
                            <p className="text-destructive text-xs pt-0.5 font-medium">
                                {error}
                            </p>
                        )}
                        <div className="flex gap-4 pt-2 text-sm">
                            <p>
                                Selected Papers: <strong>{paperIds.length}</strong>
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2 items-center">
                        <Button
                            disabled={disabled}
                            onClick={onSubmit}
                            className="w-fit mt-2"
                            size={"sm"}
                        >
                            Merge
                        </Button>
                        <Button
                            onClick={onClear}
                            className="w-fit mt-2"
                            variant={'outline'}
                            size={"sm"}
                        >
                            Clear
                        </Button>
                    </div>

                </div>

            </SheetContent>
        </Sheet>
    )
}