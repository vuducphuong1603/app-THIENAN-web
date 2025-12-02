interface Alert {
  id: string;
  title: string;
  time: string;
  source: string;
  priority: "low" | "medium" | "high";
  processed: boolean;
}

interface AlertsWidgetProps {
  alerts: Alert[];
}

export function AlertsWidget({ alerts }: AlertsWidgetProps) {
  const getPriorityLabel = (priority: Alert["priority"]) => {
    switch (priority) {
      case "low":
        return "Thấp";
      case "medium":
        return "Trung bình";
      case "high":
        return "Cao";
    }
  };

  return (
    <div className="h-[305px] overflow-hidden rounded-[15px] border border-white/60 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <svg className="size-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="font-inter-tight text-xl font-medium text-black">Hệ thống cảnh báo</span>
        </div>
        <button className="flex size-16 items-center justify-center rounded-full bg-[#f6f6f6]">
          <svg className="size-7 rotate-[316deg] text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </div>

      {/* Alert Items */}
      <div className="space-y-3 px-4">
        {alerts.slice(0, 2).map((alert) => (
          <div key={alert.id} className="rounded-[20px] bg-[#f6f6f6] p-4">
            {/* Tags */}
            <div className="mb-3 flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-md bg-[#edebe7] px-2 py-1">
                <div className={`size-3 rounded border ${alert.processed ? "border-[#fa865e] bg-[#fa865e]" : "border-gray-300 bg-white"}`}>
                  {alert.processed && (
                    <svg className="size-full text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <span className="font-inter-tight text-xs text-[#272932]">
                  {alert.processed ? "Đã xử lý" : "Chưa xử lý"}
                </span>
              </div>
              <div className="flex items-center gap-1 rounded-md bg-[#edebe7] px-2 py-1">
                <svg className="size-3.5 text-[#272932]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-inter-tight text-xs text-[#272932]">
                  Mức độ: {getPriorityLabel(alert.priority)}
                </span>
              </div>
            </div>

            {/* Content */}
            <p className="mb-2 font-inter-tight text-xs text-[#272932]">{alert.title}</p>
            <div className="h-px w-44 bg-gray-200" />
            <div className="mt-2 flex items-center gap-5">
              <div className="flex items-center gap-1.5">
                <svg className="size-3 text-[#8a8c90]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-inter-tight text-[11px] text-[#8a8c90]">Thời gian</span>
                <span className="font-inter-tight text-[11px] text-[#272932]">{alert.time}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <svg className="size-3 text-[#8a8c90]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="font-outfit text-[11px] text-[#8a8c90]">Nguồn</span>
                <span className="font-outfit text-[11px] text-[#272932]">{alert.source}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
