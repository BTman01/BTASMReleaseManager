
import React from 'react';
import { AlertTriangleIcon, TrashIcon } from './icons';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  profileName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ isOpen, profileName, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[80] flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md p-6 bg-gray-900 rounded-lg shadow-2xl border border-red-500/30 relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>

        <h2 className="text-xl font-bold text-red-400 mb-4 flex items-center relative z-10">
          <AlertTriangleIcon className="w-6 h-6 mr-2 text-red-500" />
          Delete Profile
        </h2>
        
        <p className="text-gray-300 mb-8 text-sm relative z-10 leading-relaxed">
          Are you sure you want to delete the profile <strong className="text-white">"{profileName}"</strong>?
          <br /><br />
          This action cannot be undone. This removes the profile from the manager but does <span className="text-red-400 font-semibold">not</span> delete the server files from your disk.
        </p>

        <div className="flex justify-end gap-3 relative z-10">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-bold rounded-md transition-colors shadow-md shadow-red-500/20 flex items-center justify-center"
            >
              <TrashIcon className="w-4 h-4 mr-2" />
              Delete Profile
            </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;
