declare global {
  interface Window {
    html2canvas?: (element: HTMLElement, options?: any) => Promise<HTMLCanvasElement>
  }
}

export {}
