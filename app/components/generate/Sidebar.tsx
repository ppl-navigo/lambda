"use client";

import { useState } from "react";
import { Document } from "./DocumentObject";

interface SidebarProps {
  isSidebarVisible: boolean;
  setIsSidebarVisible: React.Dispatch<React.SetStateAction<boolean>>;
  viewedDocumentString: string | null;
  setViewedDocumentString: React.Dispatch<React.SetStateAction<string | null>>;
  documents?: Document[];
}

const Sidebar: React.FC<SidebarProps> = ({
  isSidebarVisible,
  setIsSidebarVisible,
  viewedDocumentString,
  setViewedDocumentString,
  documents = [],
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter documents based on search query
  const filteredDocs = documents.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group filtered documents by their time property using a Map to preserve order
  const groupedDocs = new Map<string, Document[]>();
  filteredDocs.forEach((doc) => {
    if (!groupedDocs.has(doc.time)) {
      groupedDocs.set(doc.time, []);
    }
    groupedDocs.get(doc.time)?.push(doc);
  });

  const toggleSidebar = () => {
    setIsSidebarVisible((prev) => !prev);
  };

  return (
    <div
      className={`h-full bg-[#131313] w-full overflow-y-auto transition-all duration-300 ${
        isSidebarVisible ? "w-64" : "w-16"
      }`}
    >
      <button onClick={toggleSidebar} className="p-2 text-white focus:outline-none">
        {isSidebarVisible ? <span>&laquo;</span> : <span>&raquo;</span>}
      </button>
      {isSidebarVisible && (
        <div className="p-4">
          <div className="p-3 bg-[#1A1A1A] rounded-md mb-4">
            <span>🔺 Alicia Koch</span>
          </div>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-2 bg-[#1A1A1A] rounded-md text-white placeholder-gray-400 focus:outline-none"
            />
          </div>
          <div>
            {filteredDocs.length > 0 ? (
              // Iterate over each group
              Array.from(groupedDocs.entries()).map(([time, docs]) => (
                <div key={time} className="mb-4">
                  {/* Group header */}
                  <h2 className="text-gray-400 text-xs font-bold uppercase mb-2">{time}</h2>
                  {docs.map((doc, index) => (
                    <div
                      key={index}
                      onClick={() => setViewedDocumentString(doc.content)}
                      className={`cursor-pointer p-3 my-2 rounded-md text-white ${
                        viewedDocumentString === doc.content ? "bg-blue-500" : "bg-[#292929]"
                      }`}
                    >
                      {doc.title}
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <p className="text-gray-500 mt-4">No results found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;