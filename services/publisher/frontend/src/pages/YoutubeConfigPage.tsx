import React, { useState, useEffect } from "react";
import { api } from "../api";

interface Channel {
  id: string;
  url: string;
  name: string;
  avatarUrl: string;
}

export default function YoutubeConfigPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchChannels = async () => {
    try {
      const data = await api.getYoutubeChannels();
      setChannels(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.addYoutubeChannel(url);
      setUrl("");
      await fetchChannels();
    } catch (e: any) {
      setError(e.message || "Failed to add channel");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove channel?")) return;
    try {
      await api.deleteYoutubeChannel(id);
      await fetchChannels();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <span className="material-symbols-outlined text-red-500 text-[32px]">smart_display</span>
        <h1 className="text-2xl font-bold">YouTube Configuration</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Add Channel</h2>
        <form onSubmit={handleAdd} className="flex gap-4">
          <input
            type="text"
            className="flex-1 border rounded-lg px-4 py-2"
            placeholder="https://youtube.com/@ChannelName"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
            required
          />
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? "Adding..." : <><span className="material-symbols-outlined text-[20px]">add_circle</span> Add Channel</>}
          </button>
        </form>
        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Channel Name</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">ID</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600 w-20">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {channels.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-500">No channels added yet</td>
              </tr>
            ) : (
              channels.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {c.avatarUrl && <img src={c.avatarUrl} className="w-10 h-10 rounded-full" alt="" />}
                      <span className="font-medium">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono">{c.id}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:text-red-700 p-2">
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
