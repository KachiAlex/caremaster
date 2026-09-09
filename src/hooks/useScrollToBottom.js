import { useCallback, useEffect, useRef } from 'react';

const NEAR_BOTTOM_THRESHOLD = 120;

/**
 * Keeps a scrollable message list pinned to the bottom without fighting the
 * user: the list only jumps when it was already scrolled near the bottom, and
 * the scroll stays inside the container instead of moving the whole page.
 *
 * @param {unknown} dependency value that changes when new content arrives
 * @returns {React.RefObject} ref to attach to the scrollable container
 */
const useScrollToBottom = (dependency) => {
  const containerRef = useRef(null);
  const shouldStickRef = useRef(true);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldStickRef.current = distanceFromBottom <= NEAR_BOTTOM_THRESHOLD;
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !shouldStickRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [dependency]);

  return containerRef;
};

export default useScrollToBottom;
