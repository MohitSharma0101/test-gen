import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EllipsisVerticalIcon } from "lucide-react"
import { MouseEventHandler, ReactNode } from "react";

type Props = {
    config: {
        icon?: ReactNode
        label: string;
        onClick?: MouseEventHandler<HTMLDivElement>;
    }[]
    className?: string;
}

export const DotsMenu = ({ config, className }: Props) => {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger className={className}>
                <EllipsisVerticalIcon className='size-5' />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                {
                    config.map(item => (
                        <DropdownMenuItem key={item.label} onClick={item.onClick} className="flex gap-1">
                            {item.icon}
                            {item.label}
                        </DropdownMenuItem>
                    ))
                }
            </DropdownMenuContent>
        </DropdownMenu>
    )
}