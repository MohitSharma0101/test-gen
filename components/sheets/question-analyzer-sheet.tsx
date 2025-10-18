'use client';

import React, { useState } from 'react'
import { Sheet, SheetContent } from '../ui/sheet'
import { useQuestionAnalyzer } from '@/hooks/useQuestionAnalyzer';
import Markdown from '../ui/markdown';
import { XIcon } from 'lucide-react';
import { TimerIcon } from 'lucide-react';
import Clock from '@/lib/clock';
import { Button } from '../ui/button';
import { copyToClipboard } from '@/lib/utils';
import { CopyIcon } from 'lucide-react';
import PreviewButton from '../ui/preview-button';
import { QuestionAnalyze, QuestionAnalyzeOptions, Threshold, ThresholdOptions } from '@/data/const';
import SelectCompact from '../ui/select-compact';
import { Loader2Icon } from 'lucide-react';

type Props = {
    open: boolean;
    scheduleId: string;
    title?: string;
    onOpenChange: (open: boolean) => void;
}

const QuestionAnalyzerSheet = ({ title = 'Question Analyzer', open, scheduleId, onOpenChange }: Props) => {
    const [threshold, setThreshold] = useState(Threshold.FIVE);
    const [analyzeOn, setAnalyzeOn] = useState(QuestionAnalyze.INCORRECT);
    const { questions, loading } = useQuestionAnalyzer({
        scheduleId,
        threshold,
        analyzeOn
    });

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="p-0 flex flex-col gap-2 h-screen w-full sm:max-w-screen-md text-black">
                <div className="overflow-auto">
                    <div className="text-base font-medium px-2 py-3 bg-gray-200 sticky top-0 z-10 flex gap-2 items-center">
                        <p>{title}</p>
                    </div>
                    <div className='p-2 flex items-end gap-2'>
                        <SelectCompact
                            label='Analyze on'
                            options={QuestionAnalyzeOptions}
                            value={analyzeOn}
                            onChange={(value) => setAnalyzeOn(value as QuestionAnalyze)}
                        />
                        <SelectCompact
                            label='Threshold'
                            options={ThresholdOptions}
                            value={threshold}
                            onChange={(value) => setThreshold(value as Threshold)}
                        />
                        <PreviewButton
                            variant={'default'}
                            questions={questions.map(q => q.question)}
                            defaultTwoColumn
                            className='ml-auto'
                        />
                    </div>
                    {
                        loading ? (
                            <div className="py-12 w-full flex items-center justify-center">
                                <Loader2Icon className='size-5 animate-spin' />
                            </div>
                        ) : !questions ? (
                            <div className="py-12 text-sm font-mono flex items-center justify-center text-destructive">
                                Unable to load paper details!
                            </div>
                        ) : questions.length === 0 ? (
                            <div className="py-12 text-sm font-mono flex items-center justify-center text-destructive">
                                Not enough data!
                            </div>
                        ) : (
                            <div className='flex flex-col gap-2 p-2'>
                                {
                                    questions?.map((q, index) => (
                                        <div key={q.question?._id} className='border rounded-lg'>
                                            <div className='p-2 border-b bg-slate-200 flex items-center gap-2'>
                                                Q {index + 1}.
                                                <div className='text-destructive flex gap-1 text-sm items-center ml-auto bg-white rounded-full px-1.5 py-0.5 leading-none' >
                                                    <XIcon className='size-4' />
                                                    {Math.floor(q.incorrectRate * 100)}%
                                                </div>
                                                <div className='flex gap-1 text-sm items-center bg-white rounded-full px-1.5 py-0.5 leading-none' >
                                                    <TimerIcon className='size-4' />
                                                    {Clock.getTimeInFormat2(q.avgTimeSpent)}
                                                </div>
                                                <Button variant={'outline'} size={'xs'} onClick={() => copyToClipboard(q.question?.text)}>
                                                    <CopyIcon className='size-4' />
                                                </Button>
                                            </div>
                                            <Markdown text={q.question?.text ?? ''} />
                                        </div>
                                    ))
                                }
                            </div>
                        )
                    }

                </div>
            </SheetContent>
        </Sheet>
    )
}

export default QuestionAnalyzerSheet