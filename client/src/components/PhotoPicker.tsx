import { Camera, ImagePlus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import {
  canUseNativeCamera,
  captureNativePhoto,
  resizeImageFile
} from "../services/cameraService";

interface PhotoPickerProps {
  photo?: string;
  onChange: (photo: string | undefined) => void;
}

export function PhotoPicker({ photo, onChange }: PhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const choosePhoto = async (): Promise<void> => {
    setError(undefined);

    if (canUseNativeCamera()) {
      setBusy(true);

      try {
        const nativePhoto = await captureNativePhoto();
        if (nativePhoto) {
          onChange(nativePhoto);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Cannot open camera");
      } finally {
        setBusy(false);
      }

      return;
    }

    inputRef.current?.click();
  };

  const handleFile = async (file: File | undefined): Promise<void> => {
    if (!file) {
      return;
    }

    setBusy(true);
    setError(undefined);

    try {
      onChange(await resizeImageFile(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cannot read photo");
    } finally {
      setBusy(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);
        }}
      />

      {photo ? (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <img
            src={photo}
            alt="Survey evidence"
            className="h-56 w-full object-cover"
          />
          <div className="flex items-center justify-between gap-3 px-3 py-2">
            <p className="text-sm text-slate-600">Photo attached</p>
            <button
              type="button"
              onClick={() => onChange(undefined)}
              title="Remove photo"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void choosePhoto()}
          disabled={busy}
          className="flex min-h-40 w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {canUseNativeCamera() ? (
            <Camera className="h-8 w-8 text-vku-600" aria-hidden="true" />
          ) : (
            <ImagePlus className="h-8 w-8 text-vku-600" aria-hidden="true" />
          )}
          <span className="text-sm font-semibold">
            {busy ? "Preparing photo..." : "Add inspection photo"}
          </span>
        </button>
      )}

      {photo ? (
        <button
          type="button"
          onClick={() => void choosePhoto()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Camera className="h-4 w-4" aria-hidden="true" />
          Replace photo
        </button>
      ) : null}

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
