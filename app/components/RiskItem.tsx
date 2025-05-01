import React, { useState } from "react";
import { RiskyClause } from "@/app/store/useMouStore";

interface RiskItemProps {
  risk: RiskyClause;
  isSelected: boolean;
  onSelect: (id: string, isSelected: boolean) => void;
  onRevise: (risk: RiskyClause) => void;
  onApply: (risk: RiskyClause) => void;
  isLoading: boolean;
}

const RiskItem: React.FC<RiskItemProps> = ({
  risk,
  isSelected,
  onSelect,
  onRevise,
  onApply,
  isLoading,
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mb-4 border-b border-gray-700 pb-2" id={risk.id}>
      <div className="flex items-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(risk.id, e.target.checked)}
          className="mr-2"
        />
        <h3 className="text-base font-semibold flex-1">
          📌 {risk.title}
        </h3>
        <button
          className="text-sm text-blue-400 focus:outline-none"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Collapse" : "Expand"}
        </button>
      </div>

      {expanded && (
        <div className="mt-2 text-sm">
          <p>
            <strong>🔍 Risky Text:</strong> {risk.originalClause}
          </p>
          <p className="mt-1">
            <strong>⚠️ Reason:</strong> {risk.reason}
          </p>
          <div className="mt-2 space-y-2">
            {!risk.revisedClause && isLoading && (
              <p className="mt-1 text-yellow-400">
                ⏳ Generating revision...
              </p>
            )}

            {risk.revisedClause && (
              <p className="mt-1">
                <strong>📝 Suggested Revision:</strong>{" "}
                {risk.revisedClause}
              </p>
            )}

            {!risk.revisedClause && !isLoading && (
              <button
                className="mt-2 bg-blue-500 text-white px-2 py-1 rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  onRevise(risk);
                }}
              >
                Get Revision
              </button>
            )}

            {risk.revisedClause && (
              <button
                className={`mt-2 ${
                  risk.applied 
                    ? 'bg-gray-500 cursor-not-allowed' 
                    : 'bg-green-600 hover:bg-green-700'
                } px-2 py-1 text-white rounded`}
                disabled={risk.applied}
                onClick={(e) => {
                  e.stopPropagation();
                  onApply(risk);
                }}
              >
                {risk.applied ? "Applied" : "Apply Suggestion"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RiskItem;