// jest.setup.ts
import "@testing-library/jest-dom";
import "whatwg-fetch";
import { TextDecoder as NodeTextDecoder, TextEncoder as NodeTextEncoder } from "util";

// Mocking the TextDecoder and TextEncoder in Jest
global.TextDecoder = class extends NodeTextDecoder {
  constructor(label?: string, options?: TextDecoderOptions) {
    super(label, options);
  }
} as typeof TextDecoder;

global.TextEncoder = class extends NodeTextEncoder {
  constructor() {
    super();
  }
} as typeof TextEncoder;

require("dotenv").config();

global.URL = class {
  href: string;
  constructor(url: string) {
    this.href = url;
  }
} as any;
