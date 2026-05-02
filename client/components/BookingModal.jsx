"use client";

import { useState } from "react";
import api from "@/services/api";

export default function BookingModal({ freelancer, onClose }) {
  const [formData, setFormData] = useState({
    serviceType: "",
    issueDescription: "",
    preferredDate: "",
    preferredTime: "",
    address: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      await api.post("/bookings", {
        freelancer_id: freelancer.id, // ✅ REQUIRED
        serviceType: formData.serviceType, // ✅ REQUIRED
        issueDescription: formData.issueDescription,
        preferredDate: formData.preferredDate, // ✅ REQUIRED
        preferredTime: formData.preferredTime, // ✅ REQUIRED
        address: formData.address, // ✅ REQUIRED
      });

      setMessage("✅ Booking request sent!");
      setTimeout(onClose, 1200);
    } catch (err) {
      console.error("❌ Booking Error:", err);
      setError(err.response?.data?.msg || "Booking failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4">Book {freelancer.name}</h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            name="serviceType"
            placeholder="Service Type"
            onChange={handleChange}
            required
            className="w-full border p-2 rounded"
          />

          <textarea
            name="issueDescription"
            placeholder="Describe the issue"
            onChange={handleChange}
            className="w-full border p-2 rounded"
          />

          <input
            type="date"
            name="preferredDate"
            onChange={handleChange}
            required
            className="w-full border p-2 rounded"
          />

          <select
            name="preferredTime"
            onChange={handleChange}
            required
            className="w-full border p-2 rounded"
          >
            <option value="">Select Time</option>
            <option>Morning (8am–12pm)</option>
            <option>Afternoon (12pm–4pm)</option>
            <option>Evening (4pm–8pm)</option>
          </select>

          <input
            name="address"
            placeholder="Service Address"
            onChange={handleChange}
            required
            className="w-full border p-2 rounded"
          />

          <div className="flex justify-between mt-4">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              {loading ? "Booking..." : "Confirm Booking"}
            </button>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {message && <p className="text-green-600 text-sm">{message}</p>}
        </form>
      </div>
    </div>
  );
}
