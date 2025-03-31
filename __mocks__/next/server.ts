export class NextResponse {
    static json(body: any, init?: ResponseInit): Response {
      return new Response(JSON.stringify(body), init);
    }
  }