'use client';

import QuestionAnalyzerSheet from '@/components/sheets/question-analyzer-sheet';
import { ViewPaperSheet } from '@/components/sheets/view-paper-sheet';
import { ViewResultSheet } from '@/components/sheets/view-results-sheet';
import { DotsMenu } from '@/components/ui/dots-menu';
import LabelValue from '@/components/ui/label-value';
import SelectCompact from '@/components/ui/select-compact';
import { PageWrapper } from '@/components/wrapper/page-wrapper';
import useBatches from '@/hooks/useBatches'
import useSchedulePapers from '@/hooks/useSchedulePapers';
import Clock from '@/lib/clock';
import { getScheduleStatus } from '@/lib/utils';
import { TSchedulePaper } from '@/models/SchedulePaper';
import { HashIcon } from 'lucide-react';
import { FileChartColumnIcon } from 'lucide-react';
import { FileIcon } from 'lucide-react';
import React, { useState } from 'react'

type Props = {}

const SchedulePaperPage = (props: Props) => {
    const { batches } = useBatches();
    const [selectedBatchId, setSelectedBatchId] = useState<string>();
    const { schedulePapersRes, loading, error } = useSchedulePapers({
        batchId: selectedBatchId
    });
    const [viewPaperId, setViewPaperId] = useState<string | null>();
    const [viewScheduleResult, setViewScheduleResult] = useState<TSchedulePaper | null>();
    const [openQuestionAnalyzer, setQuestionAnalyzer] = useState<string | null>();

    const isLive = (schedulePaper: TSchedulePaper) => {
        return getScheduleStatus(schedulePaper.startTime, schedulePaper.endTime) === 'active';
    }

    const headerActions = (
        <SelectCompact
            options={batches.map((batch) => ({
                label: batch.name,
                value: batch._id,
            }))}
            onChange={(value) => {
                setSelectedBatchId(value);
            }}
            value={selectedBatchId}
            className="flex-grow lg:w-[300px]"
            placeholder="Select a batch"
        />
    )

    const isEmpty = !schedulePapersRes?.schedulePapers;
    const noData = schedulePapersRes?.schedulePapers.length === 0

    return (
        <PageWrapper
            title='ONLINE TEST'
            headerActions={headerActions}
            state={loading ? "loading" : error ? 'error' : isEmpty ? 'empty' : noData ? 'no-data' : 'data'}
        >
            <div className='my-3 px-2 flex flex-col gap-2'>
                {schedulePapersRes?.schedulePapers.map(item => (
                    <div key={item._id} className='border rounded-md p-2 md:px-3 bg-white'>
                        <div className="text-slate-950 font-semibold flex items-center gap-2">
                            <p className='flex-shrink'>{item.paper?.title}</p>
                            {
                                isLive(item) && <div className="min-w-fit max-h-fit rounded-full text-xs px-2 py-1 flex items-center justify-center bg-blue-400 text-white">
                                    Live
                                </div>
                            }
                            <DotsMenu
                                className='ml-auto'
                                config={[
                                    {
                                        icon: <FileIcon className='size-4' />,
                                        label: "View Paper",
                                        onClick: () => setViewPaperId(item.paper._id)
                                    },
                                    {
                                        icon: <HashIcon className='size-4' />,
                                        label: "View Result",
                                        onClick: () => setViewScheduleResult(item)
                                    },
                                    {
                                        icon: <FileChartColumnIcon className='size-4' />,
                                        label: "Question Analyzer",
                                        onClick: () => setQuestionAnalyzer(item._id)
                                    },
                                ]} />
                        </div>
                        <div className="py-2 grid grid-cols-2 md:grid-cols-3 gap-1 md:gap-2">
                            <LabelValue
                                label="Duration"
                                value={`${item.duration} min`}
                            />
                            <LabelValue
                                label={"Starts At"}
                                value={Clock.getDateTimeInFormat(item.startTime)}
                            />
                            <LabelValue
                                label={"Expires At"}
                                value={Clock.getDateTimeInFormat(item.endTime)}
                            />
                        </div>
                    </div>
                ))}
                {
                    viewPaperId && (
                        <ViewPaperSheet paperId={viewPaperId} open={!!(viewPaperId)} onOpenChange={(_open) => {
                            if (!_open) setViewPaperId(null);
                        }} />
                    )
                }
                {
                    viewScheduleResult && selectedBatchId && (
                        <ViewResultSheet
                            title={`Result - ${viewScheduleResult.paper?.title}`}
                            batchId={selectedBatchId}
                            scheduleId={viewScheduleResult._id}
                            open={!!(viewScheduleResult)}
                            onOpenChange={(_open) => {
                                if (!_open) setViewScheduleResult(null);
                            }} />
                    )
                }
                {
                    openQuestionAnalyzer && (
                        <QuestionAnalyzerSheet
                            scheduleId={openQuestionAnalyzer}
                            open={!!(openQuestionAnalyzer)}
                            onOpenChange={(_open) => {
                                if (!_open) setQuestionAnalyzer(null);
                            }}
                        />
                    )
                }

            </div>
        </PageWrapper>
    )
}

export default SchedulePaperPage;