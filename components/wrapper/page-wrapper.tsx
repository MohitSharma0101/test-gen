import { SquareMousePointerIcon } from "lucide-react";
import { Loader2Icon } from "lucide-react";
import { ReactNode } from "react";

type Props = {
    title: string;
    headerActions?: ReactNode;
    state: 'loading' | 'empty' | 'data' | 'error'
    children: ReactNode;
}

export const PageWrapper = ({ title, headerActions, state, children }: Props) => {
    const getPageContent = () => {
        switch (state) {
            case 'loading': return (
                <div className="py-16 flex items-center justify-center">
                    <Loader2Icon className='size-5 animate-spin' />
                </div>
            )
            case 'empty': return (
                <div className="py-10 px-3 text-slate-400 text-sm md:text-base font-medium h-full flex gap-4 flex-col items-center justify-center">
                    <SquareMousePointerIcon
                        className="w-[100px] h-[100px]"
                        strokeWidth={1.5}
                    />
                    Nothing Selected!
                </div>
            )
            case 'error': return (
                <div className="py-16 flex items-center justify-center text-destructive">
                    <p>Unable to Load.</p>
                </div>
            )
            case 'data': return children
        }
    }
    return (
        <div>
            <div className="rounded py-2 px-2 md:px-6 border border-slate-200 bg-slate-300 flex gap-x-4 items-center justify-between flex-wrap sticky top-0 z-[10]">
                <h1 className="py-2 text-sm font-bold flex items-center gap-x-2 ">
                    {title}
                </h1>
                <div className="flex items-center justify-between flex-wrap gap-2 md:gap-4">
                    {headerActions}
                </div>
            </div>
            <div className="max-w-[700px] mx-auto">
                {getPageContent()}
            </div>
        </div>
    )
}