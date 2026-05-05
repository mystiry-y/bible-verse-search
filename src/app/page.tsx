"use client"

import dynamic from "next/dynamic"

const Component = dynamic(() => import("../../bible-verse-viewer"), { ssr: false })

export default function Page() {
  return <Component />
}
