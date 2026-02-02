import { useState, useRef } from 'react';
import { Upload, X, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import { useToast } from '../../../context/ToastContext';

export default function UploadPerdcompModal({ onClose, onSuccess }) {
    const [dragActive, setDragActive] = useState(false);
    const [files, setFiles] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
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

    const validateAndAddFiles = (newFiles) => {
        if (!newFiles || newFiles.length === 0) return;

        const validFiles = Array.from(newFiles).filter(file => {
            if (file.type !== 'application/pdf') {
                toast.error(`O arquivo "${file.name}" não é um PDF válido.`);
                return false;
            }
            // Check for duplicates
            if (files.some(f => f.name === file.name && f.size === file.size)) {
                toast.warning(`O arquivo "${file.name}" já foi adicionado.`);
                return false;
            }
            return true;
        });

        if (validFiles.length > 0) {
            setFiles(prev => [...prev, ...validFiles]);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            validateAndAddFiles(e.dataTransfer.files);
        }
    };

    const handleChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            validateAndAddFiles(e.target.files);
        }
        // Reset input value to allow selecting the same file again if needed (after removal)
        if (inputRef.current) inputRef.current.value = '';
    };

    const handleUpload = async () => {
        if (files.length === 0) {
            toast.warning('Selecione pelo menos um arquivo.');
            return;
        }

        setIsUploading(true);
        // Close modal immediately
        onClose();

        // Create persistent notification
        const toastId = toast.addToast(`Iniciando upload de ${files.length} arquivos para processamento...`, 'info', 0);
        let successCount = 0;
        let errors = [];

        try {
            // Process files sequentially to respect n8n individual file requirement
            // We could do parallel too, but sequential is safer for order and rate limits if any
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const progressMsg = `Enviando arquivo ${i + 1} de ${files.length}: "${file.name}"...`;

                toast.updateToast(toastId, {
                    message: progressMsg,
                    type: 'info',
                    duration: 0
                });

                const formData = new FormData();
                formData.append('data', file); // n8n webhook binary property

                try {
                    const response = await fetch(import.meta.env.VITE_N8N_WEBHOOK_URL, {
                        method: 'POST',
                        body: formData
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.error || 'Falha no envio');
                    }

                    successCount++;
                } catch (err) {
                    console.error(`Erro ao enviar ${file.name}:`, err);
                    errors.push(file.name);
                }
            }

            // Final status update
            if (errors.length === 0) {
                toast.updateToast(toastId, {
                    message: `${successCount} arquivo(s) processado(s) com sucesso!`,
                    type: 'success',
                    duration: 5000
                });
            } else if (successCount > 0) {
                toast.updateToast(toastId, {
                    message: `${successCount} enviado(s). Falha em: ${errors.join(', ')}`,
                    type: 'warning',
                    duration: 8000
                });
            } else {
                toast.updateToast(toastId, {
                    message: `Falha ao enviar todos os arquivos.`,
                    type: 'error',
                    duration: 5000
                });
            }

            // Refresh data if at least one succeeded
            if (onSuccess && successCount > 0) {
                onSuccess();
            }

        } catch (error) {
            console.error(error);
            toast.updateToast(toastId, {
                message: `Erro sistêmico no upload.`,
                type: 'error',
                duration: 5000
            });
        } finally {
            setIsUploading(false);
        }
    };

    const removeFile = (indexToRemove) => {
        setFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Upload de PERDCOMP"
            description="Envie arquivos PDF da PERDCOMP para processamento automático."
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
                        multiple // Allow multiple files
                        className="hidden"
                        onChange={handleChange}
                    />

                    <div className="flex flex-col items-center gap-3">
                        <div className={`
                            w-16 h-16 rounded-full flex items-center justify-center transition-colors duration-200
                            ${dragActive ? 'bg-blue-100 text-irko-blue' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-irko-blue group-hover:bg-blue-50 dark:group-hover:bg-slate-800'}
                        `}>
                            <Upload size={32} />
                        </div>
                        <div className="space-y-1">
                            <p className="text-base font-medium text-slate-700 dark:text-slate-200">
                                <span className="text-irko-blue font-semibold">Clique para selecionar</span> ou arraste aqui
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Suporta múltiplos arquivos PDF
                            </p>
                        </div>
                    </div>
                </div>

                {/* Files List */}
                {files.length > 0 && (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider sticky top-0 bg-white dark:bg-slate-900 z-10 py-1">
                            Arquivos Selecionados ({files.length})
                        </p>
                        {files.map((file, index) => (
                            <div key={`${file.name}-${index}`} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                                <div className="flex items-center gap-3 text-left overflow-hidden">
                                    <div className="w-8 h-8 shrink-0 bg-white dark:bg-slate-800 rounded flex items-center justify-center text-red-500 border border-slate-100 dark:border-slate-700">
                                        <FileText size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate pr-4" title={file.name}>
                                            {file.name}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {(file.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                    title="Remover arquivo"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Info Box */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex gap-3 text-blue-800 dark:text-blue-200 text-sm">
                    <AlertCircle size={20} className="shrink-0" />
                    <p>Os arquivos serão enviados sequencialmente para processamento pela IA. Mantenha os nomes dos arquivos identificáveis.</p>
                </div>

                {/* Actions */}
                <div className="flex justify-end pt-2 gap-3">
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        disabled={isUploading}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleUpload}
                        disabled={files.length === 0 || isUploading}
                        className="gap-2"
                    >
                        {isUploading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                        {isUploading ? 'Enviando...' : `Enviar ${files.length > 0 ? files.length : ''} Arquivo(s)`}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}


