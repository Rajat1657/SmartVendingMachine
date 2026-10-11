import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSocket } from '../../context/SocketContext';
import { ProductSelectModal } from './ProductSelectModal';
import { OrderSummaryModal } from './OrderSummaryModal';
import { DispensingModal } from './DispensingModal';
import { Search, ShoppingBag, Droplets, Wheat, Lock, ChevronRight, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const CustomerHome = () => {
  const navigate = useNavigate();
  const { machineStatus, isConnected } = useSocket();
  const [viewState, setViewState] = useState('LANDING'); // LANDING or PRODUCTS

  // Data States
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('SOLID'); // SOLID or LIQUID
  
  // Carousel State
  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = [
    {
      title: "Fresh Grains, Better Living",
      subtitle: "Discover our premium rice, millets, and whole grains directly sourced.",
      badge: "Premium Quality"
    },
    {
      title: "Buy Exactly What You Need",
      subtitle: "Flexible quantities mean zero waste and maximum freshness.",
      badge: "Zero Waste"
    },
    {
      title: "Everyday Essentials, Made Simple",
      subtitle: "Explore our range of fresh pulses, cereals, and cooking oils.",
      badge: "Everyday Fresh"
    }
  ];

  // Modal Flow States
  const [activeProduct, setActiveProduct] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);
  const [activeDispenseTx, setActiveDispenseTx] = useState(null);

  useEffect(() => {
    fetchInitialData();
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Socket.io real-time product price and stock updates
  const { socket } = useSocket();
  useEffect(() => {
    if (!socket) return;

    const handleProductUpdated = (data) => {
      console.log('[WS] Real-time product update received:', data);
      fetchInitialData();

      // If customer is configuring an active order and product price changed, warn them
      if (activeProduct && data.product && data.product.id === activeProduct.id) {
        if (data.product.selling_price !== activeProduct.selling_price) {
          alert(`Notice: The price for ${data.product.name} was updated to ₹${data.product.selling_price}/${data.product.unit}. Please review your order.`);
          setActiveProduct(data.product);
        } else {
          setActiveProduct(data.product);
        }
      }
    };

    socket.on('product_updated', handleProductUpdated);
    return () => {
      socket.off('product_updated', handleProductUpdated);
    };
  }, [socket, activeProduct]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const prodRes = await axios.get('/api/products?activeOnly=true');
      if (prodRes.data.success) {
        setProducts(prodRes.data.products);
      }
    } catch (err) {
      console.error('Error fetching vending products:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => p.type === selectedCategory);

  const handleProductSelect = (product) => {
    if (product.stock <= 0) return;
    setActiveProduct(product);
  };

  const handleOrderConfirmed = (product, quantity, totalPrice) => {
    setActiveProduct(null);
    setActiveOrder({ product, quantity, totalPrice });
  };

  const handleStartDispense = async () => {
    if (!activeOrder) return;
    try {
      const res = await axios.post('/api/transactions/dispense', {
        productId: activeOrder.product.id,
        quantity: activeOrder.quantity,
        machineId: 'mach-001'
      });

      if (res.data.success) {
        setActiveDispenseTx(res.data);
        setActiveOrder(null);
        fetchInitialData();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to initiate dispensing. Please contact staff.');
    }
  };

  if (viewState === 'LANDING') {
    return (
      <div className="min-h-screen bg-brand-background text-brand-text flex flex-col items-center justify-between p-6">
        {/* Header */}
        <header className="w-full flex justify-between items-center max-w-6xl">
          <div className="flex flex-col">
            <h1 className="text-4xl font-serif font-bold text-brand-primary">NOURISH</h1>
            <p className="text-sm font-medium text-brand-text/70 mt-1">Fresh Essentials. Just the Amount You Need.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-2 bg-brand-surface rounded-full p-1 border border-brand-secondary">
              <button className="px-4 py-1.5 rounded-full bg-brand-primary text-white font-bold text-sm">EN</button>
              <button className="px-4 py-1.5 rounded-full text-brand-text font-bold text-sm">TA</button>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm ${isConnected ? 'bg-[#e6f4ea] text-[#137333]' : 'bg-brand-error/10 text-brand-error'}`}>
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#137333]' : 'bg-brand-error'}`}></span>
              {isConnected ? 'READY' : 'OFFLINE'}
            </div>
          </div>
        </header>

        {/* Carousel */}
        <div className="w-full max-w-5xl h-80 bg-brand-primary rounded-3xl overflow-hidden relative shadow-lg flex items-center justify-center my-8">
          <div className="absolute inset-0 bg-black/20 z-10" />
          <div className="z-20 text-center px-12 text-white">
            <span className="inline-block px-4 py-1.5 rounded-full bg-brand-accent text-white font-bold text-xs uppercase tracking-wider mb-4">
              {slides[currentSlide].badge}
            </span>
            <h2 className="text-5xl font-serif font-bold mb-4">{slides[currentSlide].title}</h2>
            <p className="text-xl text-white/90">{slides[currentSlide].subtitle}</p>
          </div>
          <div className="absolute bottom-6 flex gap-2 z-20">
            {slides.map((_, idx) => (
              <div key={idx} className={`w-2 h-2 rounded-full transition-all ${idx === currentSlide ? 'bg-white w-6' : 'bg-white/50'}`} />
            ))}
          </div>
        </div>

        {/* Start Button */}
        <button 
          onClick={() => setViewState('PRODUCTS')}
          className="btn-primary text-2xl px-16 py-6 rounded-full flex items-center gap-4 hover:scale-105 transform mb-8"
        >
          START VENDING <ChevronRight size={32} />
        </button>

        {/* Category Highlights */}
        <div className="flex gap-6 w-full max-w-4xl justify-center text-brand-primary font-bold">
          <div className="flex items-center gap-2 px-6 py-3 bg-brand-secondary/30 rounded-full"><Wheat /> Rice & Millets</div>
          <div className="flex items-center gap-2 px-6 py-3 bg-brand-secondary/30 rounded-full"><Lock size={20}/> Pulses & Dals</div>
          <div className="flex items-center gap-2 px-6 py-3 bg-brand-secondary/30 rounded-full"><Droplets /> Cooking Oils</div>
        </div>

        {/* Hidden Admin Login */}
        <button onClick={() => navigate('/admin/login')} className="fixed bottom-4 right-4 opacity-10 hover:opacity-100 transition-opacity">
          <Lock size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-background text-brand-text flex flex-col p-6">
      {/* Product Selection Header */}
      <header className="flex items-center justify-between mb-8">
        <button 
          onClick={() => setViewState('LANDING')} 
          className="btn-secondary rounded-full p-3 flex items-center gap-2"
        >
          <ChevronLeft /> HOME
        </button>
        <h1 className="text-3xl font-serif font-bold text-brand-primary absolute left-1/2 -translate-x-1/2">
          NOURISH
        </h1>
        <div className="text-brand-text/60 font-medium">Select your items</div>
      </header>

      {/* Category Tabs */}
      <div className="flex justify-center mb-10">
        <div className="flex bg-brand-surface rounded-full p-1.5 shadow-sm border border-brand-secondary max-w-sm w-full">
          <button 
            onClick={() => setSelectedCategory('SOLID')}
            className={`flex-1 py-3 px-6 rounded-full font-bold text-lg transition-all ${selectedCategory === 'SOLID' ? 'bg-brand-primary text-white shadow-md' : 'text-brand-text/70 hover:text-brand-primary'}`}
          >
            SOLID
          </button>
          <button 
            onClick={() => setSelectedCategory('LIQUID')}
            className={`flex-1 py-3 px-6 rounded-full font-bold text-lg transition-all ${selectedCategory === 'LIQUID' ? 'bg-brand-primary text-white shadow-md' : 'text-brand-text/70 hover:text-brand-primary'}`}
          >
            LIQUID
          </button>
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-xl font-bold text-brand-primary/50 animate-pulse">
          Loading Selection...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-brand-text/50">
          <Lock size={48} className="mb-4 opacity-50" />
          <h3 className="text-2xl font-bold mb-2">No items available</h3>
          <p>Please check back later</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-7xl mx-auto w-full">
          {filteredProducts.map(p => (
            <div 
              key={p.id}
              onClick={() => handleProductSelect(p)}
              className="card overflow-hidden cursor-pointer hover:shadow-lg transition-all group hover:-translate-y-1"
            >
              <div className="h-48 bg-white p-4 flex items-center justify-center border-b border-brand-secondary/30 relative">
                {p.stock <= 0 && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
                    <span className="bg-brand-error text-white font-bold px-4 py-1.5 rounded-full text-sm">OUT OF STOCK</span>
                  </div>
                )}
                <img src={p.image} alt={p.name} className="h-full w-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-5">
                <h3 className="font-bold text-xl text-brand-text mb-1">{p.name}</h3>
                <p className="text-sm text-brand-text/60 line-clamp-2 min-h-[40px] mb-4">{p.description}</p>
                <div className="flex items-center justify-between">
                  <div className="font-black text-brand-primary text-xl">
                    ₹{p.selling_price} <span className="text-sm font-medium text-brand-text/60">/ {p.unit}</span>
                  </div>
                  <button className="bg-brand-accent/10 text-brand-accent hover:bg-brand-accent hover:text-white transition-colors p-2 rounded-full">
                    <ShoppingBag size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals placeholders - we will refactor these next */}
      {activeProduct && (
        <ProductSelectModal
          product={activeProduct}
          onClose={() => setActiveProduct(null)}
          onConfirm={handleOrderConfirmed}
        />
      )}
      {activeOrder && (
        <OrderSummaryModal
          order={activeOrder}
          onBack={() => {
            setActiveProduct(activeOrder.product);
            setActiveOrder(null);
          }}
          onCancel={() => setActiveOrder(null)}
          onConfirmDispense={handleStartDispense}
        />
      )}
      {activeDispenseTx && (
        <DispensingModal
          transaction={activeDispenseTx}
          onClose={() => {
            setActiveDispenseTx(null);
            fetchInitialData();
            setViewState('LANDING');
          }}
        />
      )}
    </div>
  );
};
