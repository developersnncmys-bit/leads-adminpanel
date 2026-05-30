'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, Plus, Edit3, Trash2, Search, Eye } from 'lucide-react';
import { useAddBlog } from '@/context/AddBlogContext';
import { useEditBlog } from '@/context/EditBlogContext';
import { useBlogs } from '@/context/BlogContext';
import Pagination from '@/components/Pagination';

const PAGE_SIZE = 10;

export default function BlogsPage() {
  const { blogs, deleteBlog } = useBlogs();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { openModal } = useAddBlog();
  const { openModal: openEditModal } = useEditBlog();

  const filtered = blogs.filter(
    (b) => !search || b.title.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search]);
  useEffect(() => { setPage((p) => Math.min(p, Math.max(1, totalPages))); }, [totalPages]);

  const handleDelete = (id: string) => {
    if (confirm('Delete this blog post?')) {
      deleteBlog(id);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Blog Management</h1>
            <p className="text-sm text-gray-500">{blogs.length} blog posts</p>
          </div>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm shadow-blue-200"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Blog</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search blogs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-all"
        />
      </div>

      {/* Desktop table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hidden sm:block">
        <table className="w-full">
          <thead className="bg-gray-50/50">
            <tr>
              {['Sl.No', 'Title', 'Image', 'Description (Preview)', 'Status', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-sm">No blogs found.</td>
              </tr>
            ) : (
              pageItems.map((blog) => (
                <tr key={blog.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-4 text-sm text-gray-500 font-medium">{blog.slNo}</td>
                  <td className="px-4 py-4 max-w-xs">
                    <p className="text-sm font-semibold text-gray-900 line-clamp-2">{blog.title}</p>
                    <p className="text-xs text-gray-400 mt-1">{blog.createdAt}</p>
                  </td>
                  <td className="px-4 py-4">
                    <div className="w-16 h-12 bg-gray-100 rounded-xl overflow-hidden">
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">IMG</div>
                    </div>
                  </td>
                  <td className="px-4 py-4 max-w-xs">
                    <p className="text-sm font-bold text-gray-900 line-clamp-1">{blog.metaTitle}</p>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{blog.metaDescription}</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      blog.status === 'published' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {blog.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEditModal(blog)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(blog.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {pageItems.map((blog) => (
          <div key={blog.id} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-start gap-3">
              <div className="w-16 h-12 bg-gray-100 rounded-xl flex-shrink-0 flex items-center justify-center text-gray-400 text-xs">IMG</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 line-clamp-2">{blog.title}</p>
                <p className="text-xs text-gray-400 mt-1">{blog.createdAt}</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${blog.status === 'published' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {blog.status}
              </span>
              <div className="flex gap-2">
                <Link href={`/blogs/edit?id=${blog.id}`} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                  <Edit3 className="w-4 h-4" />
                </Link>
                <button onClick={() => handleDelete(blog.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <Pagination
            page={page}
            totalPages={totalPages}
            total={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
