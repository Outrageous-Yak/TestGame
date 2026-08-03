import React from "react";

type UnsavedChangesModalProps = {
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
};

export function UnsavedChangesModal({ onSave, onDiscard, onCancel }: UnsavedChangesModalProps) {
  return (
    <div className="spriteModalOverlay" role="dialog" aria-modal="true" aria-labelledby="unsaved-title">
      <div className="spriteModal">
        <div className="spriteModalTitle" id="unsaved-title">
          Unsaved changes
        </div>
        <p className="spriteModalBody">You have unsaved changes. Save before leaving?</p>
        <div className="spriteModalActions">
          <button type="button" className="btn primary" onClick={onSave}>
            Save
          </button>
          <button type="button" className="btn" onClick={onDiscard}>
            Discard
          </button>
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
