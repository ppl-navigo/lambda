"use client";

import { useState } from "react";

interface SidebarProps {
  isSidebarVisible: boolean;
  setIsSidebarVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

const Sidebar: React.FC<SidebarProps> = ({ isSidebarVisible, setIsSidebarVisible }) => {
  const [searchQuery, setSearchQuery] = useState("");

  const documents = [
    { title: "Perjanjian Kontrak Kerja Programmer Navigo", time: "8 months ago" },
    { title: "Perjanjian Kerja Sama Pengembang Web PT. Digitron", time: "8 months ago" },
    { title: "Perjanjian Kerja Fullstack Developer CodeSphere", time: "8 months ago" },
    { title: "Kontrak Kerja Backend Developer NexaSoft", time: "8 months ago" },
    { title: "Perjanjian Kontrak Kerja Programmer Navigo", time: "1 year ago" },
  ];

  const filteredDocs = documents.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSidebar = () => {
    setIsSidebarVisible((prev) => !prev);
  };

  return (
    <div className={`h-full bg-[#131313] overflow-y-auto transition-all duration-300 ${isSidebarVisible ? "w-64" : "w-16"}`}>
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
              filteredDocs.map((doc, index) => (
                <div key={index} className="bg-[#292929] p-3 my-2 rounded-md text-white">
                  {doc.title}
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
