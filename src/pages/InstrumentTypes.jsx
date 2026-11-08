import { useState, useEffect } from "react";
import { Plus, Search, Layers, X } from "lucide-react";

import "./InstrumentTypes.css";

function InstrumentTypes() {
 
const [types, setTypes] = useState([]);

useEffect(() => {
  const loadInstrumentTypes = async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/instrument-types"
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to load instrument types."
        );
      }

      setTypes(result.data || []);
    } catch (error) {
      console.error("Instrument Types API Error:", error);
      alert(error.message);
    }
  };

  loadInstrumentTypes();
}, []);

  

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    unit: "",
    minRange: "",
    maxRange: "",
    accuracy: "",
    description: ""
  });

  
async function handleSubmit(event) {
  event.preventDefault();

  const duplicate = types.some(
    (item) =>
      item.name.toLowerCase() ===
      formData.name.trim().toLowerCase()
  );

  if (duplicate) {
    alert("This instrument type already exists.");
    return;
  }

  try {
    const response = await fetch(
      "http://localhost:5000/api/instrument-types",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: formData.name,
          unit: formData.unit,
          minRange: formData.minRange,
          maxRange: formData.maxRange,
          accuracy: formData.accuracy,
          description: formData.description
        })
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "Unable to create instrument type."
      );
    }

    setTypes((previous) => [...previous, result.data]);

    setFormData({
      name: "",
      unit: "",
      minRange: "",
      maxRange: "",
      accuracy: "",
      description: ""
    });

    setShowForm(false);

    alert("Instrument type created successfully!");
  } catch (error) {
    console.error("Create instrument type error:", error);
    alert(error.message);
  }
}

  const filteredTypes = types.filter((item) =>
    [
      item.id,
      item.name,
      item.unit
    ].some((value) =>
      value.toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="types-page">

      <div className="types-header">
        <div>
          <h1>Instrument Types</h1>
          <p>Manage instrument categories and measurement specifications.</p>
        </div>

        <button
          className="add-type-button"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? <X size={18} /> : <Plus size={18} />}
          {showForm ? "Close Form" : "Add Instrument Type"}
        </button>
      </div>

      <div className="types-summary">
        <div className="type-summary-card">
          <Layers size={23} color="#2563eb" />
          <h2>{types.length}</h2>
          <p>Total Instrument Types</p>
        </div>
      </div>

      {showForm && (
        <div className="type-form-panel">

          <h2>Add New Instrument Type</h2>
          <p>Enter the technical specifications.</p>

          <form onSubmit={handleSubmit}>

            <div className="type-form-grid">

              <div className="type-field">
                <label>Type Name</label>
                <input
                  required
                  value={formData.name}
                  placeholder="e.g. Electrical"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      name: e.target.value
                    })
                  }
                />
              </div>

              <div className="type-field">
                <label>Measurement Unit</label>
                <input
                  required
                  value={formData.unit}
                  placeholder="e.g. Volt"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      unit: e.target.value
                    })
                  }
                />
              </div>

              <div className="type-field">
                <label>Minimum Range</label>
                <input
                  type="number"
                  required
                  value={formData.minRange}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      minRange: e.target.value
                    })
                  }
                />
              </div>

              <div className="type-field">
                <label>Maximum Range</label>
                <input
                  type="number"
                  required
                  value={formData.maxRange}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxRange: e.target.value
                    })
                  }
                />
              </div>

              <div className="type-field">
                <label>Accuracy</label>
                <input
                  required
                  value={formData.accuracy}
                  placeholder="e.g. ±0.5%"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      accuracy: e.target.value
                    })
                  }
                />
              </div>

              <div className="type-field">
                <label>Description</label>
                <input
                  required
                  value={formData.description}
                  placeholder="Enter description"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      description: e.target.value
                    })
                  }
                />
              </div>

            </div>

            <div className="type-form-actions">
              <button type="submit" className="save-type-button">
                Save Instrument Type
              </button>

              <button
                type="button"
                className="cancel-type-button"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
            </div>

          </form>
        </div>
      )}

      <div className="types-table-panel">

        <h2>Registered Instrument Types</h2>
        <p>Available measurement categories and specifications.</p>

        <div className="types-search">
          <Search size={18} />

          <input
            placeholder="Search by type name, ID or unit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="types-table-scroll">

          <table className="types-table">

            <thead>
              <tr>
                <th>Type ID</th>
                <th>Type Name</th>
                <th>Unit</th>
                <th>Minimum Range</th>
                <th>Maximum Range</th>
                <th>Accuracy</th>
              </tr>
            </thead>

            <tbody>

              {filteredTypes.map((item) => (

                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.name}</td>
                  <td>{item.unit}</td>
                  <td>{item.minRange} {item.unit}</td>
                  <td>{item.maxRange} {item.unit}</td>
                  <td>{item.accuracy}</td>
                </tr>

              ))}

              {filteredTypes.length === 0 && (
                <tr>
                  <td colSpan="6" className="empty-types">
                    No instrument types found.
                  </td>
                </tr>
              )}

            </tbody>

          </table>

        </div>

      </div>

      <p className="types-note">
        Instrument type specifications are stored in the SQLite database.
      </p>

    </div>
  );
}

export default InstrumentTypes;
