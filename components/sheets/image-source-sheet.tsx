import React, { useRef } from "react";
import { CameraIcon, ImagesIcon } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  // Called with the photo from the camera
  onPhoto: (file: File) => void;
  // Opens the caller's own file input (it keeps its accept list)
  onChooseFile: () => void;
};

// Phone bottom sheet: take a photo with the back camera or pick an existing image
const ImageSourceSheet = ({ open, onOpenChange, title = "Add an image", onPhoto, onChooseFile }: Props) => {
  const cameraInput = useRef<HTMLInputElement>(null);

  const pick = (action: () => void) => {
    onOpenChange(false);
    action();
  };

  return (
    <>
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPhoto(file);
          e.target.value = "";
        }}
      />
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <SheetHeader className="text-left pr-8">
            <SheetTitle className="text-base">{title}</SheetTitle>
            <SheetDescription className="sr-only">Take a photo or choose an image</SheetDescription>
          </SheetHeader>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-24 flex-col gap-2 text-sm"
              onClick={() => pick(() => cameraInput.current?.click())}
            >
              <CameraIcon className="w-6 h-6" strokeWidth={1.5} />
              Take photo
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-24 flex-col gap-2 text-sm"
              onClick={() => pick(onChooseFile)}
            >
              <ImagesIcon className="w-6 h-6" strokeWidth={1.5} />
              Choose image
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default ImageSourceSheet;
