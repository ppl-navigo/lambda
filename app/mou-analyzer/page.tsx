import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import Dropzone from "../components/Dropzone";

const MouAnalyzer = () => {
  return (
    <div className="bg-black text-white h-screen flex flex-col overflow-hidden">
      {/* Navbar */}
      <Navbar />

      {/* Main Content */}
      <div className="flex flex-1">
        {/* Sidebar (Scrollable) */}
        <Sidebar />

        {/* Upload Area (Unscrollable) */}
        <div className="flex flex-1 items-center justify-center p-10">
          <Dropzone />
        </div>
      </div>
    </div>
  );
};

export default MouAnalyzer;
