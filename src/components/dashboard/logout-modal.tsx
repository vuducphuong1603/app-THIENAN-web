"use client";

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

// Logout icon component matching Figma design
function LogoutIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 7.27015V16.7298C4 18.7928 5.55878 20.34 7.22951 19.9354L10.8295 19.0637C12.0916 18.7581 13 17.4164 13 15.8581V15.4996C13 15.2234 12.7761 14.9996 12.5 14.9996H11C9.34315 14.9996 8 13.6564 8 11.9996C8 10.3427 9.34315 8.99959 11 8.99959H12.5C12.7761 8.99959 13 8.77573 13 8.49959V8.14189C13 6.5836 12.0916 5.24194 10.8295 4.93634L7.22951 4.06459C5.55878 3.66002 4 5.20723 4 7.27015Z"
        fill="#FA865E"
      />
      <path
        d="M17.2368 8.59925C16.8634 8.19234 16.2308 8.16519 15.8239 8.53862C15.417 8.91204 15.3898 9.54462 15.7632 9.95153L16.725 10.9996H11C10.4477 10.9996 10 11.4473 10 11.9996C10 12.5519 10.4477 12.9996 11 12.9996H16.725L15.7632 14.0476C15.3898 14.4546 15.417 15.0871 15.8239 15.4606C16.2308 15.834 16.8634 15.8068 17.2368 15.3999L19.7368 12.6757C20.0877 12.2933 20.0877 11.7059 19.7368 11.3235L17.2368 8.59925Z"
        fill="#FA865E"
      />
    </svg>
  );
}

export function LogoutModal({ isOpen, onClose, onConfirm }: LogoutModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative flex w-[400px] flex-col items-center gap-8 rounded-2xl bg-white p-8">
        {/* Icon */}
        <div className="flex flex-col items-center gap-4">
          {/* Icon Container with gradient */}
          <div className="rounded-full border border-[#fff0f3] bg-gradient-to-b from-[rgba(250,134,94,0.16)] to-transparent p-4">
            <div className="flex size-14 items-center justify-center rounded-full border border-[rgba(250,134,94,0.4)] bg-transparent shadow-[0px_2px_4px_0px_rgba(223,28,65,0.04)]">
              <LogoutIcon />
            </div>
          </div>

          {/* Text Content */}
          <div className="flex flex-col items-center gap-2 text-center">
            <h2 className="font-inter-tight text-2xl font-semibold leading-tight text-[#0d0d12]">
              Đăng xuất
            </h2>
            <p className="font-inter-tight text-base leading-relaxed tracking-wide text-black/60 whitespace-nowrap">
              Bạn chắc chắn muốn đăng xuất Giáo xứ Thiên Ân?
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex w-full gap-4">
          <button
            onClick={onClose}
            className="flex h-14 flex-1 items-center justify-center rounded-full bg-neutral-100 px-4 py-2 font-outfit text-base font-semibold tracking-wide text-[#0d0d12] transition hover:bg-neutral-200"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            className="flex h-14 flex-1 items-center justify-center rounded-full bg-[#fa865e] px-4 py-2 font-outfit text-base font-semibold tracking-wide text-white shadow-[0px_1px_2px_0px_rgba(13,13,18,0.06)] transition hover:bg-[#e5764e]"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
}
