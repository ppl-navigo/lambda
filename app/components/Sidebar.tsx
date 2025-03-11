"use client"; // Required for state management in Next.js App Router

import { useState } from "react";

const Sidebar = () => {
  // State to track search input
  const [searchQuery, setSearchQuery] = useState("");

  // Document lists
  const documents = [
    { title: "Perjanjian Kontrak Kerja Programmer Navigo", time: "8 months ago" },
    { title: "Perjanjian Kerja Sama Pengembang Web PT. Digitron", time: "8 months ago" },
    { title: "Perjanjian Kerja Fullstack Developer CodeSphere", time: "8 months ago" },
    { title: "Kontrak Kerja Backend Developer NexaSoft", time: "8 months ago" },
    { title: "Kontrak Kerja Backend Developer NexaSoft", time: "8 months ago" },
    { title: "Kontrak Kerja Backend Developer NexaSoft", time: "8 months ago" },
    { title: "Kontrak Kerja Backend Developer NexaSoft", time: "8 months ago" },
    { title: "Perjanjian Kontrak Kerja Programmer Navigo", time: "1 year ago" },
    { title: "Perjanjian Kontrak Kerja Programmer Navigo", time: "1 year ago" },
    { title: "Perjanjian Kontrak Kerja Programmer Navigo", time: "1 year ago" },
  ];

  // Filter documents based on search query
  const filteredDocs = documents.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-1/4 bg-[#131313] h-screen flex-none overflow-y-auto p-4">
      {/* User Dropdown */}
      <div className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-md">
        <span>🔺 Alicia Koch</span>
      </div>

      {/* Search Box */}
      <div className="mt-4">
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full p-2 bg-[#1A1A1A] rounded-md text-white placeholder-gray-400 focus:outline-none"
        />
      </div>

      {/* Documents List */}
      <div className="mt-6">
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
  );
};

export default Sidebar;
