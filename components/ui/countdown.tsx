'use client';

import useCountdownTimer from '@/hooks/useCountdown'
import React from 'react'

type Props = {
    endDate: Date
}

const Countdown = ({ endDate }: Props) => {

    const { hours, minutes, seconds } = useCountdownTimer(endDate)
    return (
        <span className='text-white bg-sky-500 rounded-full px-2 font-bold'>
            {hours}:{minutes}:{seconds}
        </span>
    )
}

export default Countdown