// __mocks__/pdfjs-dist.js
module.exports = {
    GlobalWorkerOptions: {
      workerSrc: "/mock/path/to/pdf.worker.min.js", // This is a mock path
    },
    getDocument: () => ({
      promise: {
        getPage: () => Promise.resolve({
          getTextContent: () => Promise.resolve({ items: [{ str: "Risky Text" }] }),
        }),
      },
    }),
  };
  