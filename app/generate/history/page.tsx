"use client";

import { useEffect, useState } from "react";
import Sidebar from "../../components/generate/Sidebar";
import DocumentViewer from "../../components/generate/DocumentViewer";
import { Document } from "../../components/generate/DocumentObject";
import { supabase } from "@/utils/supabase";
import { saveAs } from 'file-saver';
import { unified } from "unified";
import markdown from "remark-parse";
import docx from "remark-docx";

interface SupabaseDocument {
  title: string;
  content: string;
  created_at: string;
  document_type: string;
}

const DocumentHistory = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [viewedDocumentString, setViewedDocumentString] = useState<string | null>(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching documents:', error);
        return;
      }

      if (data) {
        const formattedDocs = data.map((doc: SupabaseDocument) => ({
          title: doc.title,
          time: new Date(doc.created_at).toLocaleString(),
          content: doc.content,
        }));
        setDocuments(formattedDocs);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDownload = async () => {
    if (viewedDocumentString) {
      try {
        const processor = unified().use(markdown).use(docx, { output: "blob" });
        const doc = await processor.process(viewedDocumentString);
        const blob = await doc.result;
        const selectedDoc = documents.find(doc => doc.content === viewedDocumentString);
        const fileName = selectedDoc ? selectedDoc.title : 'document';
        saveAs(blob, `${fileName}-${new Date().toISOString()}.docx`);
      } catch (error) {
        console.error('Error generating DOCX:', error);
      }
    }
  };

  return (
    <div className="bg-black text-white h-screen flex">
      {/* Sidebar Container */}
      <div className="h-full">
        <Sidebar
          isSidebarVisible={isSidebarVisible}
          setIsSidebarVisible={setIsSidebarVisible}
          viewedDocumentString={viewedDocumentString}
          setViewedDocumentString={setViewedDocumentString}
          documents={documents}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4">
        {viewedDocumentString && (
          <div className="mb-4">
            <button
              onClick={handleDownload}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              Download Document
            </button>
          </div>
        )}
        <DocumentViewer viewedDocumentString={viewedDocumentString} />
      </div>
    </div>
  );
};

export default DocumentHistory;