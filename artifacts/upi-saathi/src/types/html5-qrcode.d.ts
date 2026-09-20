declare module "html5-qrcode" {
  export class Html5Qrcode {
    constructor(elementId: string);
    start(
      cameraConfig: { facingMode: string },
      config: { fps: number; qrbox: { width: number; height: number } },
      onSuccess: (decodedText: string) => void | Promise<void>,
      onError?: (error: unknown) => void,
    ): Promise<void>;
    stop(): Promise<void>;
  }
}
