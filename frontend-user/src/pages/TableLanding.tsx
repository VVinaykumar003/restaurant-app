import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTableFromUrl } from "../hooks/useTable";
import { MdOutlineTableBar } from "react-icons/md";

export default function TableLanding() {
  const { tableId, sessionId } = useTableFromUrl();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [newTableId, setNewTableId] = useState("");

  const handleSave = () => {
    if (!newTableId.trim()) return alert("Please enter a table number");
    sessionStorage.setItem("resto_table_id", newTableId);
    window.location.href = `/menu?table=${newTableId}`;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-100 to-gray-200 p-6">
      <h1 className="text-3xl font-bold mb-6 text-emerald-700 drop-shadow-md">
        Welcome
      </h1>

      <div className="bg-white relative rounded-2xl p-6 w-full max-w-md shadow-[0_10px_30px_rgba(0,0,0,0.15)] border border-emerald-400/70">
        <p className="text-gray-700 font-medium mb-2">
          {tableId ? `Table ${tableId}` : "No table selected"}
        </p>
        <p className="text-xs text-gray-500 mb-6">
          Session: {sessionId?.slice(0, 8) || "N/A"}
        </p>

        <div className="flex gap-4">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium shadow-lg shadow-emerald-400/40 transition-all duration-200 hover:bg-emerald-500 hover:scale-105"
          >
            <MdOutlineTableBar /> Change Table
          </button>

          <button
            onClick={() => {
              if (!tableId) {
                alert("Please select a table or enter table id");
                return;
              }
              navigate(`/menu?table=${tableId}`);
            }}
            className="px-4 py-2 rounded-lg border border-emerald-400 bg-white text-emerald-700 font-medium shadow-lg shadow-gray-300/40 transition-all duration-200 hover:bg-emerald-50 hover:border-emerald-500 hover:scale-105"
          >
            View Menu
          </button>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
          <div className="bg-white rounded-xl p-6 w-80 shadow-lg border border-emerald-400">
            <h2 className="text-lg font-semibold mb-4 text-emerald-700">
              Enter Table Number
            </h2>
            <input
              type="text"
              placeholder="e.g. 12"
              value={newTableId}
              onChange={(e) => setNewTableId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-3 py-1.5 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
