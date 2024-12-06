'use client';

import Image from 'next/image'
import React, { useEffect, useState } from 'react'
import { UserIcon } from 'lucide-react';
import Countdown from '@/components/ui/countdown';
import QuestionStatus from '@/components/ui/question-status';
import { getQuestions } from './data';

function getEndDate() {
    let savedEndDate = localStorage.getItem("endDate");
    if (!savedEndDate) {
        const date = new Date();
        date.setHours(date.getHours() + 3);
        localStorage.setItem("endDate", JSON.stringify(date.getTime()));
        savedEndDate = JSON.stringify(date);
    }
    return JSON.parse(savedEndDate);
}

type Props = {}

const ExamPage = (props: Props) => {
    const userInfo = [
        { label: "Candidate Name", value: "[Your Name]" },
        { label: "Exam Name", value: "JEE-Main" },
        { label: "Subject Name", value: "Maths" },
    ]

    const endDate = getEndDate();
    const [question, setQuestion] = useState(getQuestions());
    const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
    const selectedQuestion = question[activeQuestionIndex];


    useEffect(() => {
        setQuestion(question.map((ques, index) => index === activeQuestionIndex ? ({
            ...ques,
            visited: true
        }) : ques))
    }, [activeQuestionIndex])

    return (
        <div className='h-screen w-screen flex flex-col'>
            <div className="bg-neutral-50 w-full px-3 md:px-6 py-2 flex justify-between gap-4 text-sm font-bold shadow border-b">
                <div className="flex items-center justify-center gap-2 font-bold text-xl" >
                    <Image
                        src={"/eplus-logo-min.png"}
                        alt="education plus log"
                        width={50}
                        height={50}
                        className="w-[50px] object-contain aspect-square -mt-2"
                    />
                    <div className="flex flex-col leading-4">
                        Education+
                        <span className="text-sky-500 text-[10px] font-medium">Believe in Results</span>
                    </div>
                    <div className='text-black font-medium border-l text-sm border-neutral-500 pl-2'>
                        Mock Test
                    </div>
                </div>
                <div className='flex gap-2'>
                    <div className=' p-4 rounded border border-gray-400 bg-gray-100'>
                        <UserIcon className='text-gray-600 w-10 h-10' />
                    </div>
                    <div className='font-normal'>
                        {userInfo.map(info => (
                            <div key={info.label}>
                                {info.label} : <span className='text-orange-400 font-bold'> {info.value}</span>
                            </div>
                        ))}
                        <div>
                            Remaining Time : <Countdown endDate={endDate} />
                        </div>
                    </div>
                </div>
            </div>

            <div className='flex flex-grow px-12 gap-4 py-4 bg-white'>
                <div className='flex-grow flex flex-col pb-6'>
                    <div className='font-medium border-b border-black p-2 w-full'>
                        Question {selectedQuestion.index}
                    </div>
                    <div className='flex-grow flex flex-col'>
                        <div className='flex-grow'>
                            {selectedQuestion.text}
                        </div>
                        <div className='border-t border-black w-full flex gap-2 py-2 px-4 font-semibold text-sm tracking-wider'>
                            <button
                                onClick={() => {
                                    setQuestion(question.map((ques, index) => index === activeQuestionIndex ? ({
                                        ...ques,
                                        selectedAns: 1
                                    }) : ques));
                                    setActiveQuestionIndex(prev => prev + 1);
                                }}
                                className='px-3 py-1 bg-green-600 text-white'>
                                SAVE & NEXT
                            </button>
                            <button
                                onClick={() => {
                                    setQuestion(question.map((ques, index) => index === activeQuestionIndex ? ({
                                        ...ques,
                                        selectedAns: -1
                                    }) : ques));
                                }}
                                className='px-3 py-1 border border-black'>
                                CLEAR
                            </button>
                            <button
                                onClick={() => {
                                    setQuestion(question.map((ques, index) => index === activeQuestionIndex ? ({
                                        ...ques,
                                        selectedAns: 1,
                                        markedForReview: true,
                                    }) : ques));
                                }}
                                className='px-3 py-1 bg-amber-500 text-white'>
                                SAVE & MARK FOR REVIEW
                            </button>
                            <button
                                onClick={() => {
                                    setQuestion(question.map((ques, index) => index === activeQuestionIndex ? ({
                                        ...ques,
                                        markedForReview: true,
                                    }) : ques));
                                    setActiveQuestionIndex(prev => prev + 1);
                                }}
                                className='px-3 py-1 bg-sky-600 text-white'>
                                MARK FOR REVIEW & NEXT
                            </button>
                        </div>
                        <div className='border-t border-neutral-200 w-full flex gap-2 py-2 px-4 font-semibold text-sm tracking-wider bg-neutral-100'>
                            <button
                                onClick={() => {
                                    setActiveQuestionIndex(prev => prev == 0 ? 0 : prev - 1);
                                }}
                                className='px-3 py-1 bg-white border'>
                                {"<< BACK"}
                            </button>
                            <button
                                onClick={() => {
                                    setActiveQuestionIndex(prev => prev == question.length - 1 ? question.length - 1 : prev + 1);
                                }}
                                className='px-3 py-1 bg-white border'>
                                {"NEXT >>"}
                            </button>
                            <button
                                onClick={() => {
                                    setQuestion(question.map((ques, index) => index === activeQuestionIndex ? ({
                                        ...ques,
                                        selectedAns: 1,
                                        markedForReview: true,
                                    }) : ques));
                                }}
                                className='px-3 py-1 ml-auto bg-green-600 text-white'>
                                SUBMIT
                            </button>
                        </div>
                    </div>
                </div>
                <div className='w-[400px] flex flex-col'>
                    <div className='border border-black border-dashed rounded-md p-6 grid grid-cols-2 gap-2'>
                        <div className='flex gap-3 items-center'>
                            <QuestionStatus number={72} />
                            Not Visited
                        </div>
                        <div className='flex gap-3 items-center'>
                            <QuestionStatus number={4} variant='not-answered' />
                            Not Answered
                        </div>
                        <div className='flex gap-3 items-center'>
                            <QuestionStatus number={4} variant='answered' />
                            Answered
                        </div>
                        <div className='flex gap-3 items-center'>
                            <QuestionStatus number={4} variant='review' />
                            Marked for Review
                        </div>
                        <div className='col-span-2 flex gap-3 items-center'>
                            <QuestionStatus number={4} variant='ans-review' />
                            Answered & Marked for Review (will be considered for evaluation)
                        </div>
                    </div>
                    <div className='flex gap-1 flex-wrap py-4'>
                        {
                            question.map((q, index) => (
                                <QuestionStatus
                                    key={q.index}
                                    number={q.index}
                                    variant={
                                        !q.visited ? 'default' : q.selectedAns != -1 ? q.markedForReview ? 'ans-review' : 'answered' : q.markedForReview ? 'review' : 'not-answered'
                                    }
                                    onClick={() => {
                                        setActiveQuestionIndex(index)
                                    }}
                                />
                            ))
                        }
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ExamPage