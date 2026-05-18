'use client';

import { useState, useEffect } from 'react';
import { X, BookOpen, CheckCircle, Bold, Italic, List, Link2, Image as ImageIcon } from 'lucide-react';
import { useEditBlog } from '@/context/EditBlogContext';

interface BlogForm {
  title: string;
  metaTitle: string;
  metaDescription: string;
  description: string;
  status: 'published' | 'draft';
  readMins: string;
}

const inputCls = (err?: string) =>
  `w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all text-gray-900 placeholder-gray-400 ${
    err ? 'border-red-300 focus:ring-red-400' : 'border-gray-200'
  }`;

export default function EditBlogModal() {
  const { blog, closeModal } = useEditBlog();
  const open = blog !== null;

  const [form, setForm] = useState<BlogForm>({
    title: '', metaTitle: '', metaDescription: '', description: '', status: 'draft', readMins: '',
  });
  const [errors, setErrors] = useState<Partial<BlogForm>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Sync form when blog changes
  useEffect(() => {
    if (blog) {
      setForm({
        title: blog.title,
        metaTitle: blog.metaTitle,
        metaDescription: blog.metaDescription,
        description: blog.description,
        status: blog.status,
        readMins: '',
      });
      setErrors({});
      setSuccess(false);
    }
  }, [blog]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const set = (key: keyof BlogForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    const e: Partial<BlogForm> = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.description.trim()) e.description = 'Description is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    setLoading(false);
    setSuccess(true);
  };

  const handleClose = () => {
    closeModal();
    setTimeout(() => { setErrors({}); setSuccess(false); }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Edit Blog</h2>
              <p className="text-xs text-gray-400 truncate max-w-xs">{blog?.title}</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {success ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Blog Updated!</h3>
              <p className="text-sm text-gray-400">Your changes have been saved.</p>
              <button
                onClick={handleClose}
                className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <form id="edit-blog-form" onSubmit={handleSubmit} className="space-y-5">

              {/* Title + Image + Status + Read mins */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Blog Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter blog title"
                    value={form.title}
                    onChange={set('title')}
                    className={inputCls(errors.title)}
                  />
                  {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Featured Image</label>
                  <label className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors w-fit">
                    <ImageIcon className="w-4 h-4" />
                    Change Image
                    <input type="file" accept="image/*" className="hidden" />
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Status</label>
                  <select value={form.status} onChange={set('status')} className={inputCls()}>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Read Time (mins)</label>
                  <input
                    type="number"
                    placeholder="e.g. 5"
                    value={form.readMins}
                    onChange={set('readMins')}
                    min={1}
                    className={inputCls()}
                  />
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* SEO */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">SEO Settings</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Meta Title</label>
                    <input type="text" placeholder="SEO meta title" value={form.metaTitle} onChange={set('metaTitle')} className={inputCls()} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Meta Description</label>
                    <textarea placeholder="SEO meta description" value={form.metaDescription} onChange={set('metaDescription')} rows={2} className={`${inputCls()} resize-none`} />
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Description <span className="text-red-500">*</span>
                </label>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-1 px-3 py-2 bg-gray-50 border-b border-gray-200">
                    {[
                      { icon: Bold, label: 'Bold' },
                      { icon: Italic, label: 'Italic' },
                      { icon: Link2, label: 'Link' },
                      { icon: List, label: 'List' },
                      { icon: ImageIcon, label: 'Image' },
                    ].map(({ icon: Icon, label }) => (
                      <button
                        key={label}
                        type="button"
                        title={label}
                        className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <Icon className="w-4 h-4" />
                      </button>
                    ))}
                  </div>
                  <textarea
                    placeholder="Write your blog content here..."
                    value={form.description}
                    onChange={set('description')}
                    rows={8}
                    className={`w-full px-4 py-3 text-sm focus:outline-none resize-none bg-white text-gray-900 placeholder-gray-400 ${
                      errors.description ? 'ring-2 ring-inset ring-red-400' : ''
                    }`}
                  />
                </div>
                {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex-shrink-0">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="edit-blog-form"
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm shadow-blue-200"
            >
              {loading
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <BookOpen className="w-4 h-4" />
              }
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
