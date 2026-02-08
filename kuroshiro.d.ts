declare module 'kuroshiro' {
  interface KuroshiroOptions {
    to?: string;
    mode?: string;
  }
  class Kuroshiro {
    init(analyzer: unknown): Promise<void>;
    convert(text: string, options: KuroshiroOptions): Promise<string>;
  }
  export default Kuroshiro;
}

declare module 'kuroshiro-analyzer-kuromoji' {
  class KuromojiAnalyzer {
    // analyzer instance for Kuroshiro
  }
  export default KuromojiAnalyzer;
}
