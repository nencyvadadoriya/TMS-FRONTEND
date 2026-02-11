import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

interface EditCompanyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (companyData: { name: string }) => Promise<void>;
    company: any | null;
}

const EditCompanyModal: React.FC<EditCompanyModalProps> = ({
    isOpen,
    onClose,
    onUpdate,
    company,
}) => {
    const [companyName, setCompanyName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        setCompanyName(company?.name || '');
    }, [company]);

    useEffect(() => {
        if (!isOpen) {
            setCompanyName('');
            setError('');
            setIsSubmitting(false);
        }
    }, [isOpen]);

    const validateForm = () => {
        if (!companyName.trim()) {
            setError('Company name is required');
            return false;
        }
        setError('');
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!company) {
            toast.error('No company selected');
            return;
        }

        if (!validateForm()) return;

        setIsSubmitting(true);

        try {
            await onUpdate({ name: companyName.trim() });
            onClose();
        } catch (err: any) {
            console.error('Error updating company:', err);
            toast.error(err?.message || 'Failed to update company');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const isActive = typeof company?.isActive === 'boolean' ? company.isActive : true;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-xl">
                                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7V6a2 2 0 012-2h14a2 2 0 012 2v1M3 7h18M5 7v13a2 2 0 002 2h10a2 2 0 002-2V7" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-white">Edit Company</h3>
                                <p className="text-sm text-blue-100 mt-0.5">Update company name only</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 text-white hover:bg-white/20 rounded-lg"
                            disabled={isSubmitting}
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="px-6 py-6 overflow-y-auto flex-1">
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-2">Company Name *</label>
                                <input
                                    type="text"
                                    placeholder="Enter company name"
                                    className={`w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                                        error ? 'border-red-500' : 'border-gray-300 hover:border-gray-400'
                                    }`}
                                    value={companyName}
                                    onChange={(e) => {
                                        setCompanyName(e.target.value);
                                        if (error) setError('');
                                    }}
                                    disabled={isSubmitting}
                                    autoFocus
                                />
                                {error && (
                                    <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path
                                                fillRule="evenodd"
                                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                        {error}
                                    </p>
                                )}
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <h4 className="text-sm font-medium text-gray-900 mb-2">Current Information</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Current Name:</span>
                                        <span className="font-medium text-gray-900">{company?.name || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Status:</span>
                                        <span
                                            className={`font-medium px-2 py-1 text-xs rounded-full ${
                                                isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                            }`}
                                        >
                                            {isActive ? 'active' : 'inactive'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="px-6 py-5 bg-gray-50 border-t border-gray-200">
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || !companyName.trim()}
                                className={`px-5 py-2.5 text-sm font-medium text-white rounded-xl transition-all ${
                                    isSubmitting || !companyName.trim()
                                        ? 'bg-blue-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-sm hover:shadow'
                                }`}
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center gap-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                        Updating...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Update Company
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditCompanyModal;
