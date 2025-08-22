declare module '@ffmpeg/ffmpeg' {
  export function createFFmpeg(options?: Record<string, unknown>): {
    load: () => Promise<void>;
    run: (...args: string[]) => Promise<void>;
    FS: (method: string, ...args: unknown[]) => unknown;
    setProgress: (fn: (progress: { ratio: number }) => void) => void;
    setLogger: (fn: (log: { type: string; message: string }) => void) => void;
    exit: () => void;
    isLoaded: () => boolean;
  };
  export function fetchFile(file: File | ArrayBuffer | string): Promise<Uint8Array>;
}
