import React, { useState } from 'react';
import { X, Tag } from 'lucide-react';
import toast from 'react-hot-toast';

interface BulkBrandAddModalProps {
    isOpen: boolean;
    onClose: () => void;
    onBulkAdd: (brands: any[]) => Promise<void>;
    companies: string[];
}

const BulkBrandAddModal: React.FC<BulkBrandAddModalProps> = ({
    isOpen,
    onClose,
    onBulkAdd,
    companies,
}) => {
    const [company, setCompany] = useState('');
    const [brandNames, setBrandNames] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!company.trim()) {
            toast.error('Please select or enter a company');
            return;
        }

        if (!brandNames.trim()) {
            toast.error('Please enter at least one brand name');
            return;
        }

        // Parse brand names (split by comma or newline)
        const names = brandNames
            .split(/[,\n]/)
            .map(name => name.trim())
            .filter(name => name.length > 0);

        if (names.length === 0) {
            toast.error('No valid brand names found');
            return;
        }

        const brands = names.map(name => ({
            name,
            company: company.trim(),
            status: 'active'
        }));

        setIsSubmitting(true);
        try {
            await onBulkAdd(brands);
            setBrandNames('');
            onClose();
        } catch (error: any) {
            console.error('Bulk add error:', error);
            // toast is handled by parent usually, but just in case
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="bg-[#00b894] px-6 py-4 flex items-center justify-between text-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <Tag className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold">Bulk Add Brands</h3>
                            <p className="text-xs text-white/80">Add multiple brands for a company</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Company Field */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            Company *
                        </label>
                        <input
                            type="text"
                            list="bulk-companies-list"
                            value={company}
                            onChange={(e) => setCompany(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white border-2 border-gray-100 rounded-xl focus:border-[#00b894] focus:outline-none transition-colors"
                            placeholder="Enter company name"
                            required
                        />
                        <datalist id="bulk-companies-list">
                            {companies.map(c => (
                                <option key={c} value={c} />
                            ))}
                        </datalist>
                    </div>

                    {/* Brand Names Field */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            Brand Names *
                        </label>
                        <textarea
                            value={brandNames}
                            onChange={(e) => setBrandNames(e.target.value)}
                            className="w-full h-40 px-4 py-3 bg-white border-2 border-gray-100 rounded-xl focus:border-[#00b894] focus:outline-none transition-colors resize-none text-sm"
                            placeholder={`Enter brand names (comma or new line separated)\nExample:\nBrand 1, Brand 2, Brand 3\n\nor\n\nBrand 1\nBrand 2\nBrand 3`}
                            required
                        />
                        <p className="mt-2 text-[11px] text-gray-500 italic">
                            Separate brand names with commas or new lines
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-600 bg-gray-50 border-2 border-transparent rounded-xl hover:bg-gray-100 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !company.trim() || !brandNames.trim()}
                            className="flex-[1.5] flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#00b894] rounded-xl hover:bg-[#00a383] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-[#00b894]/20"
                        >
                            {isSubmitting ? (
                                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Tag className="h-4 w-4" />
                            )}
                            {isSubmitting ? 'Adding...' : 'Add Brands'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BulkBrandAddModal;
