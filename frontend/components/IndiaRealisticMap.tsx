"use client";

import dynamic from "next/dynamic";

const IndiaRealisticMapClient = dynamic(() => import("./IndiaRealisticMapClient"), {
  ssr: false,
  loading: () => (
    <div className="rounded-2xl border border-gray-200 bg-white h-[580px] flex items-center justify-center text-sm text-gray-500">
      Loading realistic map...
    </div>
  ),
});

interface Props {
  selectedRegionId: string;
  onSelectRegion: (id: string) => void;
  liveData: Record<string, any>;
}

export default function IndiaRealisticMap(props: Props) {
  return <IndiaRealisticMapClient {...props} />;
}
