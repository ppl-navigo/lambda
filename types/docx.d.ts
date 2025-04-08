declare module 'docx' {
  export class Document {
    constructor(options: any);
  }

  export class Paragraph {
    constructor(options: any);
  }

  export class TextRun {
    constructor(options: {
      text: string;
      bold?: boolean;
      size?: number;
    });
  }

  export class Packer {
    static toBlob(doc: Document): Promise<Blob>;
  }
}
