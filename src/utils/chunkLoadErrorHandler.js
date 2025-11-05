// Chunk Load Error Handler with Auto-Retry
// Handles chunk loading failures by retrying and reloading the page if necessary

let chunkLoadErrorCount = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export const handleChunkLoadError = (error, errorInfo) => {
  // Check if this is a chunk load error
  const isChunkLoadError = 
    error?.name === 'ChunkLoadError' ||
    error?.message?.includes('Loading chunk') ||
    error?.message?.includes('Failed to fetch dynamically imported module');

  if (isChunkLoadError) {
    console.error('🔴 Chunk load error detected:', error);
    
    chunkLoadErrorCount++;

    if (chunkLoadErrorCount <= MAX_RETRIES) {
      console.log(`🔄 Attempting auto-retry (${chunkLoadErrorCount}/${MAX_RETRIES})...`);
      
      // Wait a bit then reload
      setTimeout(() => {
        console.log('🔄 Reloading page to fetch latest chunks...');
        window.location.reload(true); // Force reload from server
      }, RETRY_DELAY);
      
      return true; // Indicate we're handling this error
    } else {
      // Max retries reached - clear cache and reload
      console.error('❌ Max retries reached. Clearing cache and reloading...');
      
      // Clear service worker cache if available
      if ('serviceWorker' in navigator && 'caches' in window) {
        caches.keys().then(cacheNames => {
          cacheNames.forEach(cacheName => {
            caches.delete(cacheName);
          });
        }).then(() => {
          window.location.reload(true);
        });
      } else {
        // Just reload
        window.location.reload(true);
      }
      
      return true;
    }
  }

  return false; // Not a chunk load error, let other handlers deal with it
};

// Reset counter on successful navigation
export const resetChunkLoadErrorCount = () => {
  chunkLoadErrorCount = 0;
};

// Listen for successful page loads to reset counter
if (typeof window !== 'undefined') {
  window.addEventListener('load', resetChunkLoadErrorCount);
}

export default { handleChunkLoadError, resetChunkLoadErrorCount };

