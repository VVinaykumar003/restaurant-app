import React from "react";
import { useNavigate } from "react-router-dom";
import { useTableFromUrl } from "../hooks/useTable";

export default function TableLanding() {
  const { tableId, sessionId } = useTableFromUrl();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
      <h1 className="text-2xl font-bold mb-6">Welcome</h1>
      <div className="bg-white rounded-xl shadow p-6 w-full max-w-md">
        <p className="text-gray-600 mb-2">
          {tableId ? `Table ${tableId}` : "No table selected"}
        </p>
        <p className="text-xs text-gray-400 mb-4">
          Session: {sessionId.slice(0, 8)}
        </p>

        <div className="flex gap-3">
          <button
            onClick={() => {
              const newId = prompt("Enter table number:");
              if (newId) {
                sessionStorage.setItem("resto_table_id", newId);
                window.location.href = `/menu?table=${newId}`;
              }
            }}
            className="px-4 py-2 rounded bg-indigo-600 text-white"
          >
            Change Table
          </button>

          <button
            onClick={() => {
              if (!tableId) {
                alert("Please select a table or enter table id");
                return;
              }
              navigate(`/menu?table=${tableId}`);
            }}
            className="px-4 py-2 rounded border"
          >
            View Menu
          </button>
        </div>
      </div>
    </div>
  );
}
