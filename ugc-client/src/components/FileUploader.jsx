import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, CheckCircle2, XCircle, Loader2, ImageIcon } from 'lucide-react';
import { api } from '../api';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Drag-and-drop uploader for submission analytics screenshots (Module 4).
 * Replaces the old plain-URL text input in WorkerCabinet.
 */
export default function FileUploader({ value, onUploaded }) {
    const [dragOver, setDragOver] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('idle'); // idle | uploading | done | error
    const [errorMessage, setErrorMessage] = useState(null);
    const [previewName, setPreviewName] = useState(null);
    const inputRef = useRef(null);

    const validate = (file) => {
        if (!ALLOWED_TYPES.includes(file.type)) {
            return 'Разрешены только JPG, JPEG, PNG и WEBP';
        }
        if (file.size > MAX_SIZE_BYTES) {
            return 'Файл больше 10 МБ';
        }
        return null;
    };

    const handleFile = useCallback((file) => {
        const validationError = validate(file);
        if (validationError) {
            setStatus('error');
            setErrorMessage(validationError);
            return;
        }

        setStatus('uploading');
        setErrorMessage(null);
        setProgress(0);
        setPreviewName(file.name);

        api.uploadMedia(file, setProgress)
            .then((result) => {
                setStatus('done');
                onUploaded(result.url);
            })
            .catch((err) => {
                setStatus('error');
                setErrorMessage(err.message || 'Ошибка загрузки');
            });
    }, [onUploaded]);

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
    };

    const handleSelect = (e) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    };

    return (
        <div>
            <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`relative cursor-pointer rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
                    dragOver
                        ? 'border-brand-accent bg-brand-accent/5'
                        : 'border-brand-border bg-brand-bg hover:border-slate-600'
                }`}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleSelect}
                />

                {status === 'idle' && !value && (
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                        <UploadCloud className="w-6 h-6" />
                        <span className="text-xs">Перетащите скриншот аналитики сюда или нажмите для выбора</span>
                        <span className="text-[10px] text-slate-600">JPG, PNG, WEBP до 10 МБ</span>
                    </div>
                )}

                {status === 'uploading' && (
                    <div className="flex flex-col items-center gap-2 text-brand-accent">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span className="text-xs font-mono">{previewName} — {progress}%</span>
                        <div className="w-full bg-brand-border rounded-full h-1.5 overflow-hidden">
                            <div
                                className="bg-brand-accent h-1.5 transition-all"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}

                {status === 'done' && value && (
                    <div className="flex items-center gap-3">
                        <img src={value} alt="Загруженный скриншот" className="w-14 h-14 object-cover rounded-lg border border-brand-border" />
                        <div className="flex-1 text-left">
                            <div className="flex items-center gap-1.5 text-brand-success text-xs font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Файл загружен
                            </div>
                            <div className="text-[10px] text-slate-500 truncate max-w-[180px]">{previewName}</div>
                        </div>
                        <ImageIcon className="w-4 h-4 text-slate-500 shrink-0" />
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center gap-2 text-brand-danger">
                        <XCircle className="w-6 h-6" />
                        <span className="text-xs">{errorMessage}</span>
                        <span className="text-[10px] text-slate-500">Нажмите, чтобы попробовать снова</span>
                    </div>
                )}
            </div>
        </div>
    );
}
