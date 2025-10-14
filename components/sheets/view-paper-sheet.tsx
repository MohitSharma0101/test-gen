import { Sheet, SheetContent } from "../ui/sheet"
import usePaper from "@/hooks/usePaper";
import Markdown from "../ui/markdown";
import { segregateQuestionsBySubject } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { ChevronsUpDownIcon } from "lucide-react";
import { Loader2Icon } from "lucide-react";

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    paperId: string;
    title?: string;
}

export const ViewPaperSheet = ({ open, paperId, onOpenChange }: Props) => {
    const { paper, loading } = usePaper({ id: paperId });
    const subjectQuestion = paper?.questions ? segregateQuestionsBySubject(paper?.questions) : [];

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side={'right'} className="p-0 flex flex-col gap-2 max-h-screen">
                {
                    loading ? (
                        <div className="h-full flex items-center justify-center">
                            <Loader2Icon className='size-5 animate-spin' />
                        </div>
                    ) : !paper ? (
                        <div className="h-full flex items-center justify-center text-destructive">
                            Unable to load paper details
                        </div>
                    ) : (
                        <>
                            <div className="text-base font-medium px-2 py-3 bg-gray-200">
                                {paper?.title}
                            </div>
                            <div className="flex flex-col gap-3 py-2 overflow-auto">
                                {subjectQuestion.map(({ subject, questions }) => (
                                    <div key={subject}>
                                        <p className="px-2 py-3 font-semibold tracking-wide capitalize bg-slate-200 text-center">
                                            {subject}
                                        </p>
                                        <div className="">
                                            {questions.map((item, index) => (
                                                <div key={index} className="border-y pt-2">
                                                    <div className="px-2 font-semibold flex items-center justify-between">
                                                        <p> Q. {index + 1}</p>
                                                        <p>{`[${item.mark} mark]`}</p>
                                                    </div>
                                                    <Markdown text={item.text ?? ""} />

                                                    <Collapsible className="bg-slate-200">
                                                        <CollapsibleTrigger className="font-semibold w-full flex items-center justify-between p-2">
                                                            Explanation
                                                            <ChevronsUpDownIcon className="size-4" />
                                                        </CollapsibleTrigger>
                                                        <CollapsibleContent>
                                                            <Markdown text={`Ans: ${item.ans}`} />
                                                        </CollapsibleContent>
                                                    </Collapsible>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )
                }

            </SheetContent>
        </Sheet>
    )
}