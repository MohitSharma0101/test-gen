import React, { useRef } from "react";
import { CameraIcon, ImagesIcon } from "lucide-react";
import { ResponsiveDrawer } from "@/components/ui/responsive-drawer";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  // Called with the photo from the camera
  onPhoto: (file: File) => void;
  // Opens the caller's own file input (it keeps its accept list)
  onChooseFile: () => void;
};

// Take a photo with the back camera or pick an existing image (bottom drawer
// on phones, side panel on wider screens, like every task panel)
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
      <ResponsiveDrawer open={open} onOpenChange={onOpenChange} title={title} description="Take a photo or choose one you have">
        <div className="grid grid-cols-2 gap-3 p-4">
          {[
            { label: "Take photo", Icon: CameraIcon, run: () => cameraInput.current?.click() },
            { label: "Choose image", Icon: ImagesIcon, run: onChooseFile },
          ].map(({ label, Icon, run }) => (
            <button
              key={label}
              type="button"
              // The input is clicked in the same tap, so phones allow it
              onClick={() => pick(run)}
              className="flex h-28 flex-col items-center justify-center gap-2 rounded-xl border bg-card text-sm font-semibold shadow-sm transition-colors hover:border-brand/40 hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <span className="flex size-11 items-center justify-center rounded-full bg-brand-soft text-brand">
                <Icon className="size-5" />
              </span>
              {label}
            </button>
          ))}
        </div>
      </ResponsiveDrawer>
    </>
  );
};

export default ImageSourceSheet;
