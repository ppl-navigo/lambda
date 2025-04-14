// __tests__/fileUtils.test.ts
import axios from "axios";
import { fetchFileAndExtractText } from "@/app/utils/fileUtils";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("fetchFileAndExtractText", () => {
    const fileUrl = "https://example.com/test.pdf";
    const apiUrl = "https://api.example.com";
    const errorMessage = "Error extracting text";

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("successfully downloads file and extracts text", async () => {
        const mockFileBlob = new Blob(["dummy content"], { type: "application/pdf" });
        const mockExtractedText = ["Page 1 text", "Page 2 text"];

        mockedAxios.get.mockResolvedValue({
            data: mockFileBlob,
            headers: { "content-type": "application/pdf" },
        });
        mockedAxios.post.mockResolvedValue({
            data: { pages_text: mockExtractedText },
        });

        const result = await fetchFileAndExtractText(fileUrl, apiUrl, errorMessage);

        expect(result).toEqual(mockExtractedText);
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        expect(mockedAxios.get).toHaveBeenCalledWith(fileUrl, { responseType: "blob" });
        expect(mockedAxios.post).toHaveBeenCalledTimes(1);
        expect(mockedAxios.post).toHaveBeenCalledWith(
            `${apiUrl}/extract_text/`,
            expect.any(FormData)
        );
    });

    test("handles file download error", async () => {
        mockedAxios.get.mockRejectedValue(new Error("File download error"));

        const result = await fetchFileAndExtractText(fileUrl, apiUrl, errorMessage);

        expect(result).toEqual([]);
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        expect(mockedAxios.get).toHaveBeenCalledWith(fileUrl, { responseType: "blob" });
        expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    test("handles text extraction error", async () => {
        const mockFileBlob = new Blob(["dummy content"], { type: "application/pdf" });

        mockedAxios.get.mockResolvedValue({
            data: mockFileBlob,
            headers: { "content-type": "application/pdf" },
        });
        mockedAxios.post.mockRejectedValue(new Error("Text extraction error"));

        const result = await fetchFileAndExtractText(fileUrl, apiUrl, errorMessage);

        expect(result).toEqual([]);
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        expect(mockedAxios.get).toHaveBeenCalledWith(fileUrl, { responseType: "blob" });
        expect(mockedAxios.post).toHaveBeenCalledTimes(1);
        expect(mockedAxios.post).toHaveBeenCalledWith(
            `${apiUrl}/extract_text/`,
            expect.any(FormData)
        );
    });
});