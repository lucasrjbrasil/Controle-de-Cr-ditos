import React, { useState, useRef } from 'react';
import { Upload, X, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { useToast } from '../context/ToastContext';

export default function UploadPerdcompModal({ onClose, onSuccess }) {
    const [dragActive, setDragActive] = useState(false);
    const [file, setFile] = useState(null);
    const inputRef = useRef(null);
    const toast = useToast();

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const validateAndSetFile = (selectedFile) => {
        if (!selectedFile) return;

        if (selectedFile.type !== 'application/pdf') {
            toast.error('Apenas arquivos PDF são permitidos.');
            return;
        }

        setFile(selectedFile);
        // toast.success('Arquivo selecionado com sucesso!');
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            validateAndSetFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            validateAndSetFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            toast.warning('Selecione um arquivo primeiro.');
            return;
        }

        const formData = new FormData();
        formData.append('data', file); // n8n webhook binary property

        // Close modal immediately - processing happens in background
        onClose();

        // Create persistent notification (duration: 0)
        const toastId = toast.addToast(`Enviando arquivo "${file.name}" para processamento com IA...`, 'info', 0);

        try {
            // Production Webhook URL - PERDCOMP AI Importer (configured via environment variable)
            const response = await fetch(import.meta.env.VITE_N8N_WEBHOOK_URL, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Falha no envio');
            }

            const result = await response.json();

            // Update existing toast to success
            toast.updateToast(toastId, {
                message: `Arquivo "${file.name}" processado com sucesso!`,
                type: 'success',
                duration: 5000 // Auto dismiss after 5s
            });

            // Refresh data after successful upload
            if (onSuccess) {
                onSuccess(result.data);
            }
        } catch (error) {
            console.error(error);

            // Update existing toast to error
            toast.updateToast(toastId, {
                message: `Erro ao enviar arquivo "${file.name}". Tente novamente.`,
                type: 'error',
                duration: 5000
            });
        }
    };

    const removeFile = () => {
        setFile(null);
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Upload de PERDCOMP"
            description="Envie o arquivo PDF da PERDCOMP para processamento automático."
            maxWidth="xl"
            headerAction={null}
        >
            <div className="space-y-6">

                {/* Drag & Drop Area */}
                <div
                    className={`
                        relative border-2 border-dashed rounded-xl p-8 transition-all duration-200 ease-in-out text-center cursor-pointer group
                        ${dragActive
                            ? 'border-irko-blue bg-blue-50 dark:bg-blue-900/20'
                            : 'border-slate-300 dark:border-slate-700 hover:border-irko-blue dark:hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }
                    `}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => inputRef.current?.click()}
                >
                    <input
                        ref={inputRef}
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={handleChange}
                    />

                    {!file ? (
                        <div className="flex flex-col items-center gap-3">
                            <div className={`
                                w-16 h-16 rounded-full flex items-center justify-center transition-colors duration-200
                                ${dragActive ? 'bg-blue-100 text-irko-blue' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-irko-blue group-hover:bg-blue-50 dark:group-hover:bg-slate-800'}
                            `}>
                                <Upload size={32} />
                            </div>
                            <div className="space-y-1">
                                <p className="text-base font-medium text-slate-700 dark:text-slate-200">
                                    <span className="text-irko-blue font-semibold">Clique para enviar</span> ou arraste aqui
                                </p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Apenas arquivos PDF são aceitos
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-emerald-100 dark:border-emerald-900/30">
                            <div className="flex items-center gap-4 text-left">
                                <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                    <FileText size={24} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-[300px]">
                                        {file.name}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {(file.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); removeFile(); }}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                                title="Remover arquivo"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex gap-3 text-blue-800 dark:text-blue-200 text-sm">
                    <AlertCircle size={20} className="shrink-0" />
                    <p>O arquivo será processado automaticamente para extração de dados. Certifique-se que o PDF está legível e não está protegido por senha.</p>
                </div>

                {/* Actions */}
                <div className="flex justify-end pt-2 gap-3">
                    <Button
                        variant="secondary"
                        onClick={onClose}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleUpload}
                        disabled={!file}
                        className="gap-2"
                    >
                        <CheckCircle size={18} />
                        Enviar Arquivo
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
