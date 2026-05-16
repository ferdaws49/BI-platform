// components/ReviewModal.tsx
import React, { useEffect, useState } from 'react';
import { Star, X } from 'lucide-react';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (note: number, comment: string) => void;
  trainingTitle: string;
  initialNote?: number;
  initialComment?: string;
}

export function ReviewModal({ isOpen, onClose, onSubmit, trainingTitle, initialNote = 0, initialComment = "" }: ReviewModalProps) {
  const [note, setNote] = useState(initialNote|| 0);
  const [comment, setComment] = useState(initialComment|| "");
  const [hover, setHover] = useState(0);

  useEffect(() => {
    setNote(initialNote || 0);
    setComment(initialComment || "");
  }, [initialNote, initialComment, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Noter la formation</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-4">{trainingTitle}</p>

        {/* Étoiles */}
        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setNote(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              className="transition-transform hover:scale-110"
            >
              <Star
                size={32}
                className={`${
                  star <= (hover || note) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'
                }`}
              />
            </button>
          ))}
        </div>

        {/* Commentaire */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Votre avis (optionnel)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Qu'avez-vous pensé de cette formation ?"
            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm h-32 focus:ring-2 focus:ring-[#1b5333] outline-none resize-none"
          />
        </div>

        <button
          onClick={() => onSubmit(note, comment)}
          disabled={note === 0}
          className="w-full py-4 bg-[#1b5333] text-white rounded-2xl font-bold hover:bg-[#143d25] disabled:opacity-50 transition-all"
        >
          Enregistrer mon avis
        </button>
      </div>
    </div>
  );
}