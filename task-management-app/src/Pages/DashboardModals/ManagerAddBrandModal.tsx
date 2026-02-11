type Props = {
  open: boolean;
  managerBrandName: string;
  setManagerBrandName: (next: string) => void;
  isSubmitting: boolean;
  onSubmit: () => void;
  onClose: () => void;
};

const ManagerAddBrandModal = ({
  open,
  managerBrandName,
  setManagerBrandName,
  isSubmitting,
  onSubmit,
  onClose,
}: Props) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={() => {
          if (!isSubmitting) {
            onClose();
          }
        }}
      />

      <div className="relative w-full max-w-xl rounded-2xl bg-[#0f1a12] shadow-2xl border border-white/10 overflow-hidden">
        <div className="px-6 pt-6">
          <div className="text-white text-sm mb-3">Enter brand name</div>
          <input
            autoFocus
            value={managerBrandName}
            onChange={(e) => setManagerBrandName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isSubmitting) {
                onSubmit();
              }
              if (e.key === 'Escape' && !isSubmitting) {
                onClose();
              }
            }}
            className="w-full h-12 rounded-xl bg-transparent text-white border-2 border-emerald-300/70 focus:outline-none focus:ring-0 focus:border-emerald-300 px-4"
          />
        </div>

        <div className="px-6 py-6 flex justify-end gap-4">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onSubmit}
            className="px-10 py-2.5 rounded-full bg-emerald-200 text-emerald-950 font-semibold disabled:opacity-60"
          >
            OK
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="px-10 py-2.5 rounded-full bg-emerald-900/70 text-emerald-50 font-semibold disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManagerAddBrandModal;
