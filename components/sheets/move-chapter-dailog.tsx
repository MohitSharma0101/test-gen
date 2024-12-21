'use client';

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '../ui/dialog'
import SelectCompact from '../ui/select-compact';
import { COURSES, SUBJECT_MAP } from '@/data/const';
import useBooks from '@/hooks/useBooks';
import { Button } from '../ui/button';
import { TChapter } from '@/models/Chapter';
import { moveChapter } from '@/service/core.service';
import { useToast } from '../ui/use-toast';
import { AxiosError } from 'axios';
import { Loader2Icon } from 'lucide-react';
import { ArrowRightToLineIcon } from 'lucide-react';

type Props = {
    chapters: TChapter[]
    onSuccess?: () => void;
}

const MoveChaptersDailog = ({ chapters, onSuccess }: Props) => {
    const [open, setOpen] = useState(false);
    const [course, setCourse] = useState(COURSES[0]);
    const [subject, setSubject] = useState("");
    const { books, loading: booksLoading } = useBooks(subject, course);
    const [book, setBook] = useState("");
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const onSubmit = async () => {
        try {
            setLoading(true);
            await moveChapter(chapters.map(c => c._id), book);
            toast({
                variant: "success",
                title: "Chapters succesfully moved!"
            })
            setOpen(false);
            onSuccess?.();
        } catch (err) {
            console.log("err", err);
            toast({
                variant: "destructive",
                title: (err as AxiosError).response?.data?.toString() || "Something went wrong!"
            })
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button disabled={chapters.length === 0} onClick={() => setOpen(true)} size={'sm'}>
                    <ArrowRightToLineIcon className="mr-2 w-4 h-4" />
                    Move
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogTitle>
                    Move Chapters
                    <DialogDescription>
                        This will move this chapter to the selected book.
                    </DialogDescription>
                </DialogTitle>
                <div className='flex flex-col gap-3'>
                    <SelectCompact
                        label="Class"
                        placeholder="Select a class"
                        className="w-full"
                        value={course}
                        onChange={setCourse}
                        options={COURSES.map((c) => ({
                            label: c,
                            value: c,
                        }))}
                    />
                    <SelectCompact
                        label="Subject"
                        placeholder="Select a subject"
                        className="w-full"
                        value={subject}
                        onChange={setSubject}
                        options={SUBJECT_MAP[course].map((c) => ({
                            label: c,
                            value: c,
                        }))}
                    />
                    <SelectCompact
                        label="Book"
                        placeholder="Select a book"
                        className="w-full col-span-2"
                        value={book}
                        onChange={setBook}
                        options={books?.map((b) => ({
                            label: b.title,
                            value: b._id,
                        }))}
                        loading={booksLoading}
                    />

                    <Button disabled={!book || loading} onClick={onSubmit} className='mt-4'>
                        {loading && <Loader2Icon classNamme="w-4 h-4 animate-spin mr-2" />}
                        Move Chapter
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default MoveChaptersDailog