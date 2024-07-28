import Image from "next/image";
import LoginForm from "./login-form";
import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const user = await getUser();
  if (user) redirect("/");
  
  return (
    <div className="w-full h-screen lg:columns-2 bg-white">
      <div className="flex items-center justify-center h-full px-4">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2">
            <div className="flex items-center justify-center gap-2 font-bold text-xl">
              <Image
                src={"/eplus-logo-min.png"}
                alt="education plus log"
                width={50}
                height={50}
                className="w-[50px] object-contain aspect-square -mt-2"
              />
              <div className="flex flex-col leading-4">
                Education+
                <span className="text-sky-500 text-[10px] font-medium">
                  Believe in Results
                </span>
              </div>
            </div>
            <div className="w-[90%] h-px my-4 bg-slate-300 rounded-full m-auto" />
            <h1 className="text-3xl font-bold text-center">Login</h1>
            <p className="text-balance text-muted-foreground text-center">
              Enter your email below to login to your account
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
      <div className="h-full hidden lg:block">
        <Image
          src="/login-bg.webp"
          alt=""
          width="1920"
          height="400"
          className="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
          priority
        />
      </div>
    </div>
  );
}
