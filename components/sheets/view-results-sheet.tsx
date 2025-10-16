'use client';

import { Sheet, SheetContent } from "../ui/sheet"
import { Loader2Icon } from "lucide-react";
import useAnswerSheets from "@/hooks/useAnswerSheets";
import useUsers from "@/hooks/useUsers";
import DataTable from "../ui/data-table";
import Clock from "@/lib/clock";
import { sortResultsOnRank } from "@/lib/utils";
import { Button } from "../ui/button";
import { CheckCheckIcon } from "lucide-react";
import { TestService } from "@/service/test.service";
import { toast } from "../ui/use-toast";

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    scheduleId: string;
    title?: string;
    batchId: string;
}

export const ViewResultSheet = ({ open, scheduleId, title, batchId, onOpenChange }: Props) => {
    const { users, loading: userLoading } = useUsers({ batchId });
    const { answerSheets, loading: answersLoading, refresh } = useAnswerSheets({ scheduleId: scheduleId });

    const ansMap = new Map(answerSheets?.results.map(item => [item.user, item]));
    const results = users.map(u => ({
        ...u,
        result: ansMap.get(u._id)
    }));

    const sortedResults = sortResultsOnRank(results);
    const loading = userLoading || answersLoading;

    const onRecheck = async () => {
        try {
            await TestService.recheck(scheduleId);
            toast({
                variant: 'success',
                title: "✅ Results Updated!"
            })
            refresh();
        } catch (err) {
            console.warn(err);
            toast({
                variant: 'destructive',
                title: "Unable to update results!"
            })
        } finally {
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side={'right'} className="p-0 flex flex-col gap-2 max-h-screen min-w-[300px] md:max-w-fit">
                {
                    loading ? (
                        <div className="h-full flex items-center justify-center w-[80vw]">
                            <Loader2Icon className='size-5 animate-spin' />
                        </div>
                    ) : !answerSheets ? (
                        <div className="h-full flex items-center justify-center text-destructive">
                            Unable to load result details
                        </div>
                    ) : (
                        <div className="overflow-auto">
                            <div className="text-base font-medium px-2 py-3 bg-gray-200 sticky top-0 z-10 flex gap-2 items-center">
                                <p>{title}</p>
                                <Button onClick={onRecheck} variant={'outline'} size={'xs'} className="text-xs gap-2">
                                    <CheckCheckIcon className='size-4' />  Recheck
                                </Button>
                            </div>
                            <DataTable
                                loading={loading}
                                columns={[
                                    {
                                        header: "Rank",
                                        render: ((_, index) => index + 1)
                                    },
                                    {
                                        header: "Id",
                                        accessor: "userId",
                                    },
                                    {
                                        header: "Name",
                                        accessor: "name",
                                        className: "min-w-[140px]",
                                    },
                                    {
                                        header: "Marks",
                                        render: (item) => `${item.result?.obtainedMarks ?? 0}/${item.result?.totalMarks ?? 0}`
                                    },
                                    {
                                        header: "Correct",
                                        render: (item) => item.result?.correctAns ?? "-"
                                    },
                                    {
                                        header: "Incorrect",
                                        render: (item) => item.result?.incorrectAns ?? "-"
                                    },
                                    {
                                        header: "Skipped",
                                        render: (item) => item.result?.skippedAns ?? "-"
                                    },
                                    {
                                        header: "Started On",
                                        className: "min-w-[120px]",
                                        render: (item) => item.result?.startedOn ? Clock.getDateTimeInFormat(item.result?.startedOn) : "-"
                                    },
                                    {
                                        header: "Submitted On",
                                        className: "min-w-[120px]",
                                        render: (item) => item.result?.submittedOn ? Clock.getDateTimeInFormat(item.result?.submittedOn) : "-"
                                    },
                                    {
                                        header: "Time taken",
                                        className: "min-w-[120px]",
                                        render: (item) => item.result?.submittedOn && item.result?.startedOn ? Clock.getTimeDiffInFormat(
                                            item.result?.startedOn || 0,
                                            item.result?.submittedOn || 0
                                        ) : "-"
                                    },
                                    {
                                        header: "Screen Left",
                                        className: "min-w-[120px]",
                                        render: (item) => item.result?.screenLeftCount ?
                                            `${item.result?.screenLeftCount} time` : "-"
                                    },
                                ]}
                                data={sortedResults}
                                rowKey={(row) => row._id}
                            />
                        </div>
                    )
                }
            </SheetContent>
        </Sheet>
    )
}