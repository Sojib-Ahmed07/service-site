// src/components/ui/upload.jsx
"use client";

/**
 * File uploads (Cloudinary). The admin and account layouts wrap their pages in <UploadsProvider enabled={…}>,
 * so upload buttons hide themselves when storage isn't connected (no fake buttons).
 *
 *   <UploadButton kind="provider_doc" onUploaded={(ref) => …} />
 *   <ImageInput value={src} onChange={setSrc} />   // address box + preview + "Upload" for public images
 */
import { createContext, useContext, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { checkFile, uploadKinds } from "@/lib/files";
import { finishUpload, prepareUpload } from "@/server/actions/uploads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { Photo } from "@/components/ui/photo";

const UploadsContext = createContext(false);

export function UploadsProvider({ enabled, children }) {
    return <UploadsContext.Provider value={Boolean(enabled)}>{children}</UploadsContext.Provider>;
}

/** True when file storage is connected. */
export const useUploadsEnabled = () => useContext(UploadsContext);

/** Sends the file straight to Cloudinary with the server's signature, reporting progress (0–100). */
function sendToCloudinary(url, fields, file, onProgress) {
    return new Promise((resolve) => {
        const form = new FormData();
        for (const [k, v] of Object.entries(fields)) form.append(k, String(v));
        form.append("file", file);
        const xhr = new XMLHttpRequest();
        xhr.open("POST", url);
        xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
        xhr.onload = () => {
            let data = {};
            try {
                data = JSON.parse(xhr.responseText);
            } catch { }
            if (xhr.status >= 200 && xhr.status < 300 && data.public_id) resolve({ ok: true, publicId: data.public_id });
            else resolve({ ok: false, error: data?.error?.message ? `Upload failed: ${data.error.message}` : "Upload failed. Please try again." });
        };
        xhr.onerror = () => resolve({ ok: false, error: "Upload failed. Check your connection and try again." });
        xhr.ontimeout = () => resolve({ ok: false, error: "The upload took too long. Please try again." });
        xhr.timeout = 120_000;
        xhr.send(form);
    });
}

/**
 * A button that uploads one file and calls onUploaded(ref) — a full https:// address for public images,
 * a "cld:…" ref for private files. `context` is the booking reference for problem photos.
 * Renders nothing when uploads are switched off.
 */
export function UploadButton({
    kind,
    context,
    onUploaded,
    label = "Upload",
    variant = "outline",
    size = "sm",
    disabled = false,
    className,
    buttonClassName,
    onError,
}) {
    const enabled = useUploadsEnabled();
    const inputRef = useRef(null);
    const [progress, setProgress] = useState(null); // null = idle, 0–100 = uploading
    const [error, setOwnError] = useState("");
    // With onError the parent shows the message (e.g. under a whole field); otherwise it shows under the button.
    const setError = (msg) => (onError ? onError(msg) : setOwnError(msg));
    if (!enabled) return null;

    const pick = async (file) => {
        setError("");
        const problem = checkFile(kind, file);
        if (problem) return setError(problem);
        setProgress(0);
        try {
            const signed = await prepareUpload(kind, context);
            if (!signed.ok) return setError(signed.error);
            const sent = await sendToCloudinary(signed.url, signed.fields, file, setProgress);
            if (!sent.ok) return setError(sent.error);
            const done = await finishUpload(kind, sent.publicId, context);
            if (!done.ok) return setError(done.error);
            onUploaded(done.ref, { name: file.name });
        } catch {
            setError("Upload failed. Please try again.");
        } finally {
            setProgress(null);
            if (inputRef.current) inputRef.current.value = "";
        }
    };

    const busy = progress !== null;
    return (
        <span className={className}>
            <input
                ref={inputRef}
                type="file"
                accept={uploadKinds[kind]?.accept}
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])}
            />
            <Button
                type="button"
                variant={variant}
                size={size}
                className={buttonClassName}
                disabled={disabled || busy}
                onClick={() => inputRef.current?.click()}
            >
                <Upload /> {busy ? (progress < 100 ? `Uploading ${progress}%` : "Checking…") : label}
            </Button>
            {error && (
                <span role="alert" className="mt-1 block text-sm text-danger">
                    {error}
                </span>
            )}
        </span>
    );
}

/**
 * Image address field with a preview and an Upload button (public images).
 * The address box still takes an Unsplash id (photo-…) or any https:// image address.
 */
export function ImageInput({ value, onChange, kind = "image", id, label = "Image address", sizes = 400, aspect = "aspect-[16/9]" }) {
    const enabled = useUploadsEnabled();
    const [error, setError] = useState("");
    return (
        <div className="grid gap-2">
            {value ? (
                <Photo src={value.trim()} alt="" sizes={sizes} className={`${aspect} rounded-lg`} />
            ) : (
                <div className={`grid ${aspect} place-items-center rounded-lg border-2 border-dashed border-line-strong text-sm text-muted`}>
                    No image
                </div>
            )}
            <div className="flex items-start gap-2">
                <Input
                    id={id}
                    value={value ?? ""}
                    onChange={(e) => {
                        setError("");
                        onChange(e.target.value);
                    }}
                    placeholder={enabled ? "Upload, or paste photo-… / https://…" : "photo-… or https://…"}
                    maxLength={500}
                    aria-label={label}
                    className="min-w-0 flex-1"
                />
                <UploadButton
                    kind={kind}
                    onUploaded={(ref) => onChange(ref)}
                    onError={setError}
                    size="md"
                    className="shrink-0"
                    buttonClassName="h-11"
                />
            </div>
            {error && (
                <p role="alert" className="text-sm text-danger">
                    {error}
                </p>
            )}
        </div>
    );
}