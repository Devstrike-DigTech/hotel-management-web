export default function Loading() {
  return (
    <div className="container-page pb-10 pt-8 lg:pt-12" aria-busy="true" aria-label="Loading stays">
      <div className="skeleton h-3 w-40 rounded-xs" />
      <div className="skeleton mt-8 h-16 w-2/3 rounded-sm" />
      <div className="skeleton mt-10 h-16 w-full rounded-md" />
      <div className="mt-10 grid gap-10 lg:grid-cols-[15.5rem_1fr] lg:gap-14">
        <div className="hidden space-y-4 lg:block">
          <div className="skeleton h-3 w-28 rounded-xs" />
          <div className="skeleton h-6 w-full rounded-xs" />
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="skeleton h-5 w-4/5 rounded-xs" />
          ))}
        </div>
        <div>
          <div className="h-10 border-b border-ink" />
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="grid gap-6 border-b border-line py-7 sm:grid-cols-[15rem_1fr] md:grid-cols-[19rem_1fr_9rem]">
              <div className="skeleton aspect-[4/3] rounded-sm" />
              <div className="space-y-3">
                <div className="skeleton h-3 w-40 rounded-xs" />
                <div className="skeleton h-8 w-3/4 rounded-xs" />
                <div className="skeleton h-4 w-1/2 rounded-xs" />
                <div className="skeleton mt-6 h-4 w-2/3 rounded-xs" />
              </div>
              <div className="skeleton hidden h-16 rounded-xs md:block" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
