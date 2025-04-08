"use client";

import { useEffect, useState } from "react";
import Sidebar from "../../components/generate/Sidebar";
import DocumentViewer from "../../components/generate/DocumentViewer";
import { Document } from "../../components/generate/DocumentObject";
import { supabase } from "@/utils/supabase";

interface SupabaseDocument {
  title: string;
  content: string;
  created_at: string;
  document_type: string;
}

const documents: Document[] = [
  {
    title: "Perjanjian Kontrak Kerja Programmer Navigo",
    time: "8 months ago",
    content: `# **Perjanjian Kontrak Kerja Programmer Navigo**

Dokumen ini merupakan kontrak kerja antara pihak Navigo dan seorang programmer. Berisi pasal-pasal mengenai durasi kerja, gaji, tanggung jawab, dan ketentuan pemutusan hubungan kerja.`,
  },
  {
    title: "Perjanjian Kerja Sama Pengembang Web PT. Digitron",
    time: "8 months ago",
    content: `# Perjanjian Kerja Sama Pengembang Web PT. Digitron

Dokumen ini menjelaskan kerja sama antara PT. Digitron dan pengembang web independen dalam rangka pembangunan sistem internal perusahaan.`,
  },
  {
    title: "Perjanjian Kerja Fullstack Developer CodeSphere",
    time: "8 months ago",
    content: `# Perjanjian Kerja Fullstack Developer CodeSphere

Merupakan perjanjian kerja antara CodeSphere dan fullstack developer yang mencakup ruang lingkup pekerjaan, teknologi yang digunakan, serta target sprint bulanan.`,
  },
  {
    title: "Kontrak Kerja Backend Developer NexaSoft",
    time: "8 months ago",
    content: `# Kontrak Kerja Backend Developer NexaSoft

Kontrak ini mengatur hak dan kewajiban backend developer yang bekerja pada proyek microservices milik NexaSoft.`,
  },
  {
    title: "Perjanjian Kontrak Kerja Programmer Navigo",
    time: "1 year ago",
    content: `# Perjanjian Kontrak Kerja Programmer Navigo

Versi sebelumnya dari kontrak kerja Navigo, dengan klausul yang sedikit berbeda dibandingkan versi 8 bulan yang lalu.`,
  },
];

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
      <div className="flex-1 overflow-hidden">
        <DocumentViewer
          viewedDocumentString={viewedDocumentString}
        />
      </div>
    </div>
  );
};

export default DocumentHistory;