import { useState } from "react";

export function usePageScroll(screenWidth, scale) {
  const [currentPage, setCurrentPage] = useState(0);

  const handleScroll = (event) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const containerWidth = screenWidth - 48 * scale;
    const page = Math.round(contentOffsetX / containerWidth);
    setCurrentPage(page);
  };

  return { currentPage, handleScroll };
}
