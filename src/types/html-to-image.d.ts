declare module 'html-to-image' {
  interface HtmlToImageOptions {
    cacheBust?: boolean;
    canvasHeight?: number;
    canvasWidth?: number;
    height?: number;
    pixelRatio?: number;
    quality?: number;
    skipFonts?: boolean;
    width?: number;
  }

  export function toPng(node: HTMLElement, options?: HtmlToImageOptions): Promise<string>;
}
