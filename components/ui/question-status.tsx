import { cn } from '@/lib/utils';
import { cva } from 'class-variance-authority';
import React from 'react'


type Props = JSX.IntrinsicElements['button'] & {
  number: number;
  variant?: 'default' | 'not-answered' | "answered" | "review" | "ans-review",
}

const questionStatusVariants = cva('w-[34px] h-[34px] flex items-center justify-center bg-[length:100%_100%] py-2 px-3 bg-no-repeat transition-all', {
  variants: {
    variant: {
      "default": " bg-[url('https://www.nta.ac.in/img/QuizIcons/Logo1.png')]",
      "not-answered": "bg-[url('https://www.nta.ac.in/img/QuizIcons/Logo2.png')] text-white",
      "answered": "bg-[url('https://www.nta.ac.in/img/QuizIcons/Logo3.png')] text-white",
      "review": "bg-[url('https://www.nta.ac.in/img/QuizIcons/Logo4.png')] text-white",
      "ans-review": "bg-[url('https://www.nta.ac.in/img/QuizIcons/Logo5.png')] text-white",
    }
  },
  defaultVariants: {
    variant: 'default'
  }
})

const QuestionStatus = ({ number, variant = 'default', className, ...rest }: Props) => {
  return (
    <button className={cn(questionStatusVariants({ variant: variant }), className)} {...rest}>
      {number}
    </button >
  )
}

export default QuestionStatus