import React, {
  ButtonHTMLAttributes,
  createContext,
  ReactNode,
  RefObject,
  useContext,
  useRef,
} from "react";
import { useReactToPrint } from "react-to-print";
import { Button } from "./button";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
};

export const PrintContext = createContext<{
  printRef?: RefObject<HTMLDivElement>;
  handlePrint?: ReturnType<typeof useReactToPrint>;
}>({});

export const usePrint = () => {
  const context = useContext(PrintContext);
  if (!context) {
    throw new Error("Print context should be used inside Print Provider.");
  }
  return context;
};

export const PrintProvider = ({ children }: Props) => {
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
  });

  return (
    <PrintContext.Provider
      value={{ printRef: printRef, handlePrint: handlePrint }}
    >
      {children}
    </PrintContext.Provider>
  );
};

export const Print = ({ children }: Props) => {
  return <PrintProvider>{children}</PrintProvider>;
};

export const PrintTrigger = ({
  children,
  onClick,
  ...rest
}: Props & ButtonHTMLAttributes<HTMLButtonElement>) => {
  const { handlePrint } = usePrint();
  return (
    <Button
      {...rest}
      onClick={(e) => {
        handlePrint?.();
        onClick?.(e);
      }}
    >
      {children}
    </Button>
  );
};

export const PrintContent = ({
  className,
  children,
  ...rest
}: JSX.IntrinsicElements["div"]) => {
  const { printRef } = usePrint();
  return (
    <div className={cn("hidden", className)} {...rest}>
      <div ref={printRef}>{children}</div>
    </div>
  );
};
