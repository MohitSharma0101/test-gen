import { cn } from "@/lib/utils";
import Image from "next/image";

type TEducationPlusFrame = JSX.IntrinsicElements["div"] & {
  course?: string;
  subject?: string;
};

const EducationPlusFrame = ({
  children,
  course,
  subject,
  className,
}: TEducationPlusFrame) => {
  const today = new Date();
  return (
    <div
      className={cn(
        "border outline outline-offset-4 border-black outline-black flex flex-col h-[calc(100vh-30px)]",
        className
      )}
    >
      <div className="flex items-start mx-auto w-fit">
        <Image
          src={"/eplus-logo-min.png"}
          alt="education plus log"
          width={150}
          height={22}
          className="w-[90px] aspect-video object-contain mt-2"
        />
        <h1 className="font-medium w-fit leading-none pb-4 text-center text-6xl flex flex-col items-end ">
          EDUCATION +<span className="text-lg -mt-2">BELIEVE IN RESULTS</span>
        </h1>
      </div>
      <div className="w-full h-[1px] bg-black mb-0.5" />
      <div className="border-y border-black py-0.5">
        <div className="grid grid-cols-4 px-4 w-full font-medium border-y border-black">
          <span suppressHydrationWarning>
            DATE: {today.toLocaleDateString()}
          </span>
          <span>CLASS: {course}</span>
          <span className="uppercase">SUBJECT: {subject}</span>
          <span>NAME:</span>
        </div>
      </div>
      <div className="w-full h-[1px] bg-black mt-0.5" />
      <div className="">
        {children}
      </div>
      <div className="w-full h-[1px] bg-black mb-0.5 mt-auto" />
      <div className="border-t w-full border-black py-0.5">
        <div className="text-center w-full font-medium border-t border-black">
          643, Near Mayura Palace, Foy Sagar Road, Ajmer, 7976674183, 9530011477
        </div>
      </div>
    </div>
  );
};

export default EducationPlusFrame;
