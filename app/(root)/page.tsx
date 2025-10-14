import { ROUTES } from "@/data/routes";
import Link from "next/link";

export default function Home() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 sm:p-4 ml-auto">
      {ROUTES.map((item) => (
        <Link key={item.href} href={item.href} className="border rounded-md flex items-center gap-2 md:gap-4 p-3 md:p-6 bg-white hover:bg-slate-50 shadow-sm">
         <div className="bg-gray-100 rounded-full size-8 md:size-10 flex items-center justify-center"> {item.icon}</div>
          <p className="text-sm md:text-base">{item.label}</p>
        </Link>
      ))}
    </div>
  );
}
