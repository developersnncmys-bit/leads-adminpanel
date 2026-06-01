'use client';

import { useEffect, useState } from 'react';

// CKEditor 5 Classic build accesses `window` and `document` on import, so it
// can't be evaluated during SSR. We lazy-load both the editor and the React
// wrapper on the client after mount, then render once they're ready.

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

type EditorModules = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  CKEditor: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ClassicEditor: any;
};

export default function RichTextEditor({ value, onChange, placeholder }: Props) {
  const [modules, setModules] = useState<EditorModules | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      import('@ckeditor/ckeditor5-react'),
      import('@ckeditor/ckeditor5-build-classic'),
    ])
      .then(([reactPkg, classicPkg]) => {
        if (cancelled) return;
        setModules({
          CKEditor: reactPkg.CKEditor,
          // ClassicEditor is the default export of the classic build
          ClassicEditor: (classicPkg as { default: unknown }).default ?? classicPkg,
        });
      })
      .catch((err) => console.error('Failed to load CKEditor:', err));
    return () => { cancelled = true; };
  }, []);

  if (!modules) {
    return (
      <div className="px-4 py-3 text-sm text-gray-400 bg-gray-50 border border-gray-200 rounded-xl">
        Loading editor…
      </div>
    );
  }

  const { CKEditor, ClassicEditor } = modules;
  return (
    <div className="ck-editor-wrapper border border-gray-200 rounded-xl overflow-hidden">
      <CKEditor
        editor={ClassicEditor}
        data={value}
        config={{
          placeholder: placeholder || 'Write your blog content here…',
          toolbar: [
            'heading', '|',
            'bold', 'italic', 'link', '|',
            'bulletedList', 'numberedList', 'blockQuote', '|',
            'undo', 'redo',
          ],
        }}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onChange={(_event: unknown, editor: any) => onChange(editor.getData())}
      />
    </div>
  );
}
