import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { usePWA } from '../../context/PWAContext';
import { Plus, Edit2, Search, Check, X, Upload, Image as ImageIcon } from 'lucide-react';

export const AdminProducts = () => {
  const { guardOnlineAction, updateFetchTimestamp } = usePWA();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: '',
    type: 'SOLID',
    unit: 'kg',
    selling_price: '',
    cost_price: '',
    stock: '',
    minimum_stock: '5',
    maximum_stock: '50',
    preset_quantities: '0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 5',
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500',
    active: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes] = await Promise.all([
        axios.get('/api/products'),
        axios.get('/api/categories')
      ]);

      if (prodRes.data.success) setProducts(prodRes.data.products);
      if (catRes.data.success) setCategories(catRes.data.categories);
      updateFetchTimestamp();
    } catch (err) {
      console.error('Error fetching admin products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      category_id: categories[0]?.id || '',
      type: 'SOLID',
      unit: 'kg',
      selling_price: '',
      cost_price: '',
      stock: '20',
      minimum_stock: '5',
      maximum_stock: '50',
      preset_quantities: '0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 5',
      image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500',
      active: true
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      category_id: product.category_id,
      type: product.type,
      unit: product.unit,
      selling_price: product.selling_price.toString(),
      cost_price: product.cost_price.toString(),
      stock: product.stock.toString(),
      minimum_stock: product.minimum_stock.toString(),
      maximum_stock: product.maximum_stock.toString(),
      preset_quantities: (product.preset_quantities || []).join(', '),
      image: product.image || '',
      active: product.active
    });
    setModalOpen(true);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    guardOnlineAction(async () => {
      try {
        setUploadingImage(true);
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Data = reader.result;
          const res = await axios.post('/api/products/upload-image', {
            imageData: base64Data,
            fileName: file.name
          });

          if (res.data.success) {
            setFormData(prev => ({ ...prev, image: res.data.url }));
          }
          setUploadingImage(false);
        };
        reader.readAsDataURL(file);
      } catch (err) {
        console.error('Image upload failed:', err);
        alert('Failed to upload product image');
        setUploadingImage(false);
      }
    }, 'Uploading images');
  };

  const handleSave = async (e) => {
    e.preventDefault();

    guardOnlineAction(async () => {
      try {
        const presetsArr = formData.preset_quantities
          .split(',')
          .map(v => parseFloat(v.trim()))
          .filter(v => !isNaN(v));

        const payload = {
          ...formData,
          selling_price: parseFloat(formData.selling_price),
          cost_price: parseFloat(formData.cost_price),
          stock: parseFloat(formData.stock),
          minimum_stock: parseFloat(formData.minimum_stock),
          maximum_stock: parseFloat(formData.maximum_stock),
          preset_quantities: presetsArr
        };

        if (editingProduct) {
          await axios.put(`/api/products/${editingProduct.id}`, payload);
        } else {
          await axios.post('/api/products', payload);
        }

        setModalOpen(false);
        fetchData();
      } catch (err) {
        alert(err.response?.data?.error || 'Failed to save product details');
      }
    }, 'Saving product changes');
  };

  const handleToggleActive = async (product) => {
    guardOnlineAction(async () => {
      try {
        await axios.put(`/api/products/${product.id}`, {
          active: !product.active
        });
        fetchData();
      } catch (err) {
        console.error('Error toggling active:', err);
      }
    }, 'Toggling product status');
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800">Product Catalog</h2>
          <p className="text-xs text-slate-500 font-semibold">Configure prices, units & presets</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 neu-btn text-blue-600 font-extrabold rounded-xl text-xs flex items-center gap-1.5 active:scale-95 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add Product</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search product catalog..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 neu-input text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none"
        />
      </div>

      {/* Product Cards List - Soft UI */}
      {loading ? (
        <div className="py-12 text-center text-xs font-bold text-slate-500 animate-pulse">
          Loading catalog...
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProducts.map((p) => (
            <div key={p.id} className="neu-card p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <img
                  src={p.image}
                  alt={p.name}
                  className="w-14 h-14 rounded-xl object-cover neu-input p-0.5 bg-white"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-800">{p.name}</span>
                    {!p.active && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-extrabold rounded-md">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 font-semibold mt-0.5">
                    {p.type} • {p.category_name}
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono font-bold mt-1">
                    <span className="text-emerald-600">Price: ₹{p.selling_price}/{p.unit}</span>
                    <span className="text-slate-500">Cost: ₹{p.cost_price}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleActive(p)}
                  className={`p-2.5 neu-btn rounded-xl text-xs font-bold transition ${
                    p.active ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                  title={p.active ? 'Disable Product' : 'Enable Product'}
                >
                  <Check className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleOpenEdit(p)}
                  className="p-2.5 neu-btn text-slate-700 hover:text-blue-600 rounded-xl transition"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal with File Upload Support */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg neu-card p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-slate-800">
                {editingProduct ? 'Edit Product Configuration' : 'Add New Vending Product'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="w-10 h-10 neu-btn rounded-xl flex items-center justify-center text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs font-bold text-slate-700">
              
              <div>
                <label className="block text-slate-600 mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 neu-input text-slate-800 focus:outline-none"
                  placeholder="e.g. Basmati Rice"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1">Category</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full p-3 neu-input text-slate-800 focus:outline-none"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1">Product Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => {
                      const type = e.target.value;
                      setFormData({
                        ...formData,
                        type,
                        unit: type === 'SOLID' ? 'kg' : 'L'
                      });
                    }}
                    className="w-full p-3 neu-input text-slate-800 focus:outline-none"
                  >
                    <option value="SOLID">SOLID (Grains, Pulses, Sugar)</option>
                    <option value="LIQUID">LIQUID (Cooking Oils, Milk)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1">Unit</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full p-3 neu-input text-slate-800 focus:outline-none"
                  >
                    {formData.type === 'SOLID' ? (
                      <>
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                      </>
                    ) : (
                      <>
                        <option value="L">L</option>
                        <option value="ml">ml</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                    className="w-full p-3 neu-input text-slate-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1">Cost Price (₹)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                    className="w-full p-3 neu-input text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1">Current Stock</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full p-3 neu-input text-slate-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1">Min Stock Warning</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.minimum_stock}
                    onChange={(e) => setFormData({ ...formData, minimum_stock: e.target.value })}
                    className="w-full p-3 neu-input text-slate-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1">Max Tank Stock</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.maximum_stock}
                    onChange={(e) => setFormData({ ...formData, maximum_stock: e.target.value })}
                    className="w-full p-3 neu-input text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Preset Quantities (Comma Separated)</label>
                <input
                  type="text"
                  value={formData.preset_quantities}
                  onChange={(e) => setFormData({ ...formData, preset_quantities: e.target.value })}
                  className="w-full p-3 neu-input text-slate-800 focus:outline-none font-mono"
                  placeholder="0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 5"
                />
              </div>

              {/* Product Image File Upload Option */}
              <div className="space-y-2">
                <label className="block text-slate-600">Product Image (Upload File or URL)</label>
                
                <div className="flex items-center gap-3">
                  {formData.image ? (
                    <img
                      src={formData.image}
                      alt="Preview"
                      className="w-14 h-14 rounded-xl object-cover border border-slate-300 neu-input p-0.5 bg-white shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl neu-input flex items-center justify-center text-slate-400 shrink-0">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}

                  <label className="flex-1 py-3 px-4 neu-btn rounded-xl cursor-pointer text-blue-600 font-extrabold flex items-center justify-center gap-2 hover:bg-blue-50 transition">
                    <Upload className="w-4 h-4" />
                    <span>{uploadingImage ? 'Uploading Image...' : 'Upload Image File'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <input
                  type="text"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="w-full p-3 neu-input text-slate-800 focus:outline-none text-xs font-mono"
                  placeholder="Or paste image URL link"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-3 neu-btn text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingImage}
                  className="px-6 py-3 bg-blue-600 text-white font-extrabold rounded-xl shadow-lg"
                >
                  Save Product
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
