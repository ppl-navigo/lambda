// app/utils/fileUtils.ts

import axios from "axios";

export const fetchFileAndExtractText = async (fileUrl: string, apiUrl: string, errorMessage: string): Promise<string[]> => {
  try {
    // Step 1: Download the file
    const fileResponse = await axios.get(fileUrl, { responseType: "blob" });
    const fileBlob = fileResponse.data;
    const fileName = fileUrl.split("/").pop() || "unknown-file";
    const fileType = fileResponse.headers["content-type"];
    const file = new File([fileBlob], fileName, { type: fileType });

    // Step 2: Prepare FormData for the API request
    const formData = new FormData();
    formData.append("file", file);

    // Step 3: Make the POST request to extract text
    const extractResponse = await axios.post(`${apiUrl}/extract_text/`, formData);
    return extractResponse.data.pages_text; // Assuming this is the correct data format
  } catch (error) {
    console.error(`❌ ${errorMessage}:`, error);
    return [];
  }
};
