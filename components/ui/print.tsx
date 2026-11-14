import React, {
  ButtonHTMLAttributes,
  createContext,
  ReactNode,
  RefObject,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { useReactToPrint } from "react-to-print";
import { Button } from "./button";
import { cn } from "@/lib/utils";
import { Loader2Icon } from "lucide-react";

type Props = {
  children: ReactNode;
};

export const PrintContext = createContext<{
  printRef?: RefObject<HTMLDivElement>;
  handlePrint?: ReturnType<typeof useReactToPrint>;
  loadContent?: boolean;
}>({});

export const usePrint = () => {
  const context = useContext(PrintContext);
  if (!context) {
    throw new Error("Print context should be used inside Print Provider.");
  }
  return context;
};

export const Print = ({ children }: Props) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [loadContent, setLoadContent] = useState(false);
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    // Printing happens in a hidden iframe that keeps keyboard focus afterwards,
    // so Escape/shortcuts stopped reaching the page (e.g. an open preview could
    // no longer be closed with Esc). Hand focus back, and reset so the same
    // print-out can be printed again without reopening.
    onAfterPrint: () => {
      (document.activeElement as HTMLElement | null)?.blur?.();
      window.focus();
      setLoadContent(false);
    },
  });

  useEffect(() => {
    if (loadContent) {
      handlePrint();
    }
  }, [loadContent]);

  return (
    <PrintContext.Provider
      value={{
        printRef: printRef,
        handlePrint: () => setLoadContent(true),
        loadContent: loadContent,
      }}
    >
      {children}
    </PrintContext.Provider>
  );
};

export const PrintTrigger = ({
  children,
  onClick,
  ...rest
}: Props & ButtonHTMLAttributes<HTMLButtonElement>) => {
  const { handlePrint } = usePrint();
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      {...rest}
      disabled={isPending}
      onClick={(e) => {
        startTransition(() => {
          handlePrint?.();
          onClick?.(e);
        });
      }}
    >
      {isPending && <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </Button>
  );
};

export const PrintContent = ({
  className,
  children,
  ...rest
}: JSX.IntrinsicElements["div"]) => {
  const { printRef, loadContent } = usePrint();

  if (loadContent)
    return (
      <div className={cn("hidden", className)} {...rest}>
        <div ref={printRef}>{children}</div>
      </div>
    );
};
